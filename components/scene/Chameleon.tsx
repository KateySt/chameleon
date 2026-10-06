/*
Landing-page chameleon. Follows docs/CHAMELEON_MODEL_CONTRACT.md: own AnimationMixer,
mixer.update() first and code second in every frame, walk scrubbed by phase,
tail posed absolutely from its rest orientation (the walk clip's tail tracks are overwritten).
*/
"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useGraph } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { SECTIONS } from "@/lib/sections";
import { oklchToLinearRgb } from "@/lib/oklch";
import { useProgressStore } from "@/lib/progressStore";
import {
  createEyeMaterial,
  createSkinMaterial,
  WAVE_DONE,
  type EyeUniforms,
  type SkinUniforms,
} from "@/components/scene/chameleonMaterials";
import { BRANCH_AXIS_Y, BRANCH_RADIUS, BRANCH_RADIUS_MAX, branchSag } from "@/components/scene/branchGeometry";
import { branchTravel, type SceneState } from "@/components/scene/sceneState";
import { MODEL_PATH } from "@/components/scene/modelPath";


type TailBoneName = `Tail_${"01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12"}`;

const TAIL_BONE_NAMES: readonly TailBoneName[] = [
  "Tail_01", "Tail_02", "Tail_03", "Tail_04", "Tail_05", "Tail_06",
  "Tail_07", "Tail_08", "Tail_09", "Tail_10", "Tail_11", "Tail_12",
];

/** upper → middle → end bone of each leg; the end bone (foot / hand) is the one planted on the branch. */
const LEG_CHAINS = [
  ["HindLeg_Thigh_L", "HindLeg_Shin_L", "HindLeg_Foot_L"],
  ["HindLeg_Thigh_R", "HindLeg_Shin_R", "HindLeg_Foot_R"],
  ["FrontLeg_Upper_L", "FrontLeg_Lower_L", "FrontLeg_Hand_L"],
  ["FrontLeg_Upper_R", "FrontLeg_Lower_R", "FrontLeg_Hand_R"],
] as const;

type LegBoneName = (typeof LEG_CHAINS)[number][number];

type NodeMap = {
  Chameleon: THREE.SkinnedMesh;
  Chameleon_Eyes: THREE.SkinnedMesh;
  Hips: THREE.Bone;
} & Record<TailBoneName, THREE.Bone> &
  Record<LegBoneName, THREE.Bone>;

type GLTFResult = GLTF & {
  nodes: NodeMap;
  materials: { Chameleon_Skin: THREE.MeshStandardMaterial; Chameleon_Eye: THREE.MeshStandardMaterial };
};

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const scratchQuaternion = new THREE.Quaternion();

/** Rotates a bone around one of its own local axes, on top of its current pose. */
function rotateAroundLocalAxis(bone: THREE.Bone, axis: THREE.Vector3, radians: number) {
  if (radians === 0) return;
  bone.quaternion.multiply(scratchQuaternion.setFromAxisAngle(axis, radians));
}

type Spring = { x: number; v: number };

function stepSpring(spring: Spring, target: number, stiffness: number, damping: number, dt: number) {
  spring.v += (stiffness * (target - spring.x) - damping * spring.v) * dt;
  spring.x += spring.v * dt;
}

// Imperative helpers live outside the component: they mutate three.js objects, which React lint rules can't follow.
function startClips(mixer: THREE.AnimationMixer, animations: THREE.AnimationClip[]): THREE.AnimationAction {
  const walkClip = animations.find((clip) => clip.name === "walk");
  const eyesLookClip = animations.find((clip) => clip.name === "eyes_look");
  if (!walkClip || !eyesLookClip) throw new Error("chameleon.glb is missing the walk / eyes_look clips");

  // The mixer only writes a bone when its blended value changed since the last frame, so a paused or held clip
  // does NOT reset the pose: code must set clip-bound bones absolutely (from rest or a saved clip pose), never relatively.
  const walk = mixer.clipAction(walkClip);
  walk.paused = true; // scrubbed by phase, never by time
  walk.play();
  mixer.clipAction(eyesLookClip).play(); // background gaze until the eye controller (phase 4) takes over
  return walk;
}

function assignMaterials(nodes: NodeMap, skin: THREE.Material, eye: THREE.Material) {
  nodes.Chameleon.material = skin;
  nodes.Chameleon_Eyes.material = eye;
}

function scrubWalk(walk: THREE.AnimationAction, cycles: number) {
  walk.time = (((cycles % 1) + 1) % 1) * walk.getClip().duration;
}

function setSkinColor(uniforms: SkinUniforms, sectionIndex: number, startWave: boolean) {
  const [r, g, b] = SECTION_COLORS[sectionIndex];
  if (startWave) uniforms.uFrom.value.copy(uniforms.uTo.value);
  else uniforms.uFrom.value.setRGB(r, g, b, THREE.LinearSRGBColorSpace);
  uniforms.uTo.value.setRGB(r, g, b, THREE.LinearSRGBColorSpace);
  uniforms.uFront.value = startWave ? 0 : WAVE_DONE;
}

function setWaveFront(uniforms: SkinUniforms, front: number) {
  uniforms.uFront.value = front;
}

function setPupil(uniforms: EyeUniforms, scale: number) {
  uniforms.uPupil.value = scale;
}

const scratchPoint = new THREE.Vector3();
const scratchPivot = new THREE.Vector3();
const scratchAxis = new THREE.Vector3();
const scratchMove = new THREE.Vector3();
const scratchQuat = new THREE.Quaternion();
const rigInverse = new THREE.Quaternion();
const scratchCross = new THREE.Vector3();
const LOCAL_AXES = [AXIS_X, AXIS_Z] as const;
const MAX_PUSH_ANGLE = 0.3;

/**
 * Keeps the tail from passing through the branch (a cylinder along rig X). Runs after the pose is final:
 * for every tail bone inside the branch, the parent bone is turned about its local X or Z — whichever moves
 * the point outward best — and the rest of the chain follows.
 */
function keepTailOutOfBranch(bones: readonly THREE.Bone[], root: THREE.Object3D, rig: THREE.Object3D) {
  root.updateMatrixWorld(true);
  rig.getWorldQuaternion(rigInverse).invert();
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < bones.length; i++) {
      const bone = bones[i];
      const parent = bones[i - 1];
      const thickness = 0.03 * (1 - i / bones.length) + 0.008;
      const clearance = BRANCH_RADIUS_MAX + thickness;

      scratchPoint.setFromMatrixPosition(bone.matrixWorld);
      rig.worldToLocal(scratchPoint);
      const dy = scratchPoint.y - BRANCH_AXIS_Y;
      const dz = scratchPoint.z;
      const distance = Math.hypot(dy, dz);
      if (distance >= clearance) continue;
      // Outward direction in the branch cross-section; dead-center points leave sideways.
      const outY = distance > 1e-4 ? dy / distance : 0;
      const outZ = distance > 1e-4 ? dz / distance : 1;
      const penetration = clearance - distance;

      scratchPivot.setFromMatrixPosition(parent.matrixWorld);
      rig.worldToLocal(scratchPivot);
      scratchMove.copy(scratchPoint).sub(scratchPivot);
      parent.getWorldQuaternion(scratchQuat).premultiply(rigInverse);
      let bestGain = 0;
      let bestAxis: THREE.Vector3 | null = null;
      for (const axis of LOCAL_AXES) {
        // Rotation axis in rig space; a positive turn moves the point by axis x (point - pivot).
        scratchAxis.copy(axis).applyQuaternion(scratchQuat);
        scratchCross.crossVectors(scratchAxis, scratchMove);
        const gain = scratchCross.y * outY + scratchCross.z * outZ;
        if (Math.abs(gain) > Math.abs(bestGain)) {
          bestGain = gain;
          bestAxis = axis;
        }
      }
      if (!bestAxis || Math.abs(bestGain) < 1e-4) continue;
      const angle = Math.max(-MAX_PUSH_ANGLE, Math.min(MAX_PUSH_ANGLE, penetration / bestGain));
      rotateAroundLocalAxis(parent, bestAxis, angle);
      parent.updateMatrixWorld(true);
    }
  }
}

type Leg = {
  bones: readonly [upper: THREE.Bone, middle: THREE.Bone, end: THREE.Bone];
  /** This frame's walk-clip rotations; the mixer skips unchanged values, so they are put back before every update. */
  clipPose: readonly [THREE.Quaternion, THREE.Quaternion, THREE.Quaternion];
};

function createLegs(nodes: NodeMap): Leg[] {
  return LEG_CHAINS.map(([upper, middle, end]) => ({
    bones: [nodes[upper], nodes[middle], nodes[end]],
    clipPose: [nodes[upper].quaternion.clone(), nodes[middle].quaternion.clone(), nodes[end].quaternion.clone()],
  }));
}

function restoreLegClipPose(legs: readonly Leg[]) {
  for (const leg of legs) for (let i = 0; i < 3; i++) leg.bones[i].quaternion.copy(leg.clipPose[i]);
}

function captureLegClipPose(legs: readonly Leg[]) {
  for (const leg of legs) for (let i = 0; i < 3; i++) leg.clipPose[i].copy(leg.bones[i].quaternion);
}

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const ikA = new THREE.Vector3();
const ikB = new THREE.Vector3();
const ikC = new THREE.Vector3();
const ikFrom = new THREE.Vector3();
const ikTo = new THREE.Vector3();
const ikAxis = new THREE.Vector3();
const ikTarget = new THREE.Vector3();
const ikNormal = new THREE.Vector3();
const ikRotation = new THREE.Quaternion();
const ikWorld = new THREE.Quaternion();
const ikLocal = new THREE.Quaternion();
const ikEndWorld = new THREE.Quaternion();
const ikRigWorld = new THREE.Quaternion();

/** Applies a world-space rotation to a bone (about its own pivot) and refreshes its subtree's matrices. */
function rotateBoneInWorld(bone: THREE.Bone, rotation: THREE.Quaternion) {
  bone.getWorldQuaternion(ikWorld);
  // world' = rotation * world  =>  local' = local * (world^-1 * rotation * world)
  ikLocal.copy(ikWorld).invert().multiply(rotation).multiply(ikWorld);
  bone.quaternion.multiply(ikLocal);
  bone.updateMatrixWorld(true);
}

/** Analytic two-bone IK: bends the middle joint to the needed angle in the leg's current plane, then swings the chain onto the target. */
function solveTwoBone([upper, middle, end]: Leg["bones"], target: THREE.Vector3) {
  ikA.setFromMatrixPosition(upper.matrixWorld);
  ikB.setFromMatrixPosition(middle.matrixWorld);
  ikC.setFromMatrixPosition(end.matrixWorld);
  const upperLength = ikA.distanceTo(ikB);
  const lowerLength = ikB.distanceTo(ikC);
  const reach = THREE.MathUtils.clamp(
    ikA.distanceTo(target),
    Math.abs(upperLength - lowerLength) + 1e-3,
    upperLength + lowerLength - 1e-3
  );

  ikFrom.subVectors(ikC, ikA);
  ikTo.subVectors(ikB, ikA);
  ikAxis.crossVectors(ikFrom, ikTo);
  if (ikAxis.lengthSq() > 1e-12) {
    // A positive turn about (AC x AB) opens the middle joint.
    ikAxis.normalize();
    const current = ikFrom.subVectors(ikA, ikB).angleTo(ikTo.subVectors(ikC, ikB));
    const wanted = Math.acos(
      THREE.MathUtils.clamp(
        (upperLength * upperLength + lowerLength * lowerLength - reach * reach) / (2 * upperLength * lowerLength),
        -1,
        1
      )
    );
    rotateBoneInWorld(middle, ikRotation.setFromAxisAngle(ikAxis, wanted - current));
    ikC.setFromMatrixPosition(end.matrixWorld);
  }

  ikFrom.subVectors(ikC, ikA).normalize();
  ikTo.subVectors(target, ikA).normalize();
  rotateBoneInWorld(upper, ikRotation.setFromUnitVectors(ikFrom, ikTo));
}

/**
 * The walk clip was authored on a flat floor (feet at Y = 0, spread wider than the branch), so on the round branch
 * the feet would hang in the air. Each foot is moved radially onto the branch, keeping the clip's height above the
 * floor as height above the bark (steps still lift), and its sole is tilted to the bark normal so it grips the side.
 */
function plantFeet(legs: readonly Leg[], root: THREE.Object3D, rig: THREE.Object3D, travel: number) {
  root.updateMatrixWorld(true);
  rig.getWorldQuaternion(ikRigWorld);
  for (const leg of legs) {
    const [, middle, end] = leg.bones;
    end.getWorldQuaternion(ikEndWorld);

    // Rig space: the branch runs along X, its top line is Y = 0 + sag.
    ikTarget.setFromMatrixPosition(end.matrixWorld);
    rig.worldToLocal(ikTarget);
    const axisY = BRANCH_AXIS_Y + branchSag(ikTarget.x + travel);
    const dy = ikTarget.y - axisY;
    const dz = ikTarget.z;
    const distance = Math.hypot(dy, dz);
    const outY = distance > 1e-4 ? dy / distance : 1;
    const outZ = distance > 1e-4 ? dz / distance : 0;
    const radius = BRANCH_RADIUS + Math.max(0, ikTarget.y);
    ikTarget.set(ikTarget.x, axisY + outY * radius, outZ * radius);
    rig.localToWorld(ikTarget);
    ikNormal.set(0, outY, outZ).applyQuaternion(ikRigWorld);

    solveTwoBone(leg.bones, ikTarget);

    // Keep the clip's foot orientation, tilted from "floor up" to the bark normal: local = parentWorld^-1 * world.
    ikRotation.setFromUnitVectors(WORLD_UP, ikNormal).multiply(ikEndWorld);
    middle.getWorldQuaternion(ikWorld);
    end.quaternion.copy(ikWorld.invert().multiply(ikRotation));
    end.updateMatrixWorld(true);
  }
}

function tailBones0(nodes: NodeMap): THREE.Quaternion[] {
  return TAIL_BONE_NAMES.map((name) => nodes[name].quaternion.clone());
}

type TailInput = {
  /** 0..1 position in the walk cycle. */
  phase: number;
  time: number;
  /** Spring-smoothed scroll speed magnitude: the faster the walk, the tighter the coil. */
  tuck: number;
  /** Spring-smoothed signed scroll speed: pushes the tail sideways. */
  swing: number;
  sectionProgress: number;
  animate: boolean;
};

// Total coil: about 340 degrees, i.e. a ring. Bones near the body stay straighter so the tail leaves the hips smoothly.
const COIL_PER_BONE = 0.8;
const WAG_RADIANS = 0.055;
const scratchTailQuaternion = new THREE.Quaternion();

/**
 * The tail is posed from its rest orientation, not from the clip: a spiral that curls UP (positive turn about each
 * bone's local X; the contract's negative X curls down), tightening slightly while walking and loosening between steps,
 * plus a left-right wag around local Z that travels down the chain. Deterministic, so it can never come out broken.
 */
function poseTail(bones: readonly THREE.Bone[], rest: readonly THREE.Quaternion[], input: TailInput) {
  const stepBreath = input.animate ? Math.sin(input.phase * Math.PI * 2) : 0;
  const coil = COIL_PER_BONE * (1 + 0.1 * stepBreath + 0.12 * input.tuck - 0.04 * input.sectionProgress);
  for (let i = 0; i < bones.length; i++) {
    const along = i / (bones.length - 1);
    const bone = bones[i];
    const wag = input.animate
      ? WAG_RADIANS * (0.35 + 0.65 * along) * Math.sin(input.time * 1.9 - i * 0.42 + input.phase * Math.PI * 2 * 0.5)
      : 0;
    const sway = wag + input.swing * 0.03 * along;
    bone.quaternion.copy(rest[i]);
    bone.quaternion.multiply(scratchTailQuaternion.setFromAxisAngle(AXIS_X, coil * (0.25 + 0.75 * along)));
    bone.quaternion.multiply(scratchTailQuaternion.setFromAxisAngle(AXIS_Z, sway));
  }
}

const SECTION_COLORS = SECTIONS.map((section) => oklchToLinearRgb(section.accent));
const WAVE_SECONDS = 1.3;
const PUPIL_PULSE_DECAY = 2.2;

type ChameleonProps = {
  stateRef: RefObject<SceneState>;
};

export function Chameleon({ stateRef }: ChameleonProps) {
  const { scene, animations } = useGLTF(MODEL_PATH) as unknown as GLTFResult & { animations: THREE.AnimationClip[] };
  const clonedScene = useMemo(() => cloneSkinned(scene), [scene]);
  const { nodes, materials } = useGraph(clonedScene) as unknown as Pick<GLTFResult, "nodes" | "materials">;

  const skin = useMemo(() => createSkinMaterial(materials.Chameleon_Skin, nodes.Chameleon.geometry), [materials, nodes]);
  const eye = useMemo(() => createEyeMaterial(materials.Chameleon_Eye), [materials]);
  useEffect(() => {
    assignMaterials(nodes, skin.material, eye.material);
  }, [nodes, skin, eye]);
  useEffect(
    () => () => {
      skin.material.dispose();
      eye.material.dispose();
    },
    [skin, eye]
  );

  const mixer = useMemo(() => new THREE.AnimationMixer(clonedScene), [clonedScene]);
  // Created during render, not in an effect, so the very first frame is already posed (no bind-pose flash).
  const walkAction = useMemo(() => startClips(mixer, animations), [mixer, animations]);
  const tailRest = useMemo(() => tailBones0(nodes), [nodes]);
  const legs = useMemo(() => createLegs(nodes), [nodes]);

  const walker = useRef<THREE.Group>(null);
  const tailBones = useMemo(() => TAIL_BONE_NAMES.map((name) => nodes[name]), [nodes]);
  const waveClock = useRef(WAVE_SECONDS);
  const pupilPulse = useRef(0);
  const tuck = useRef<Spring>({ x: 0, v: 0 });
  const swing = useRef<Spring>({ x: 0, v: 0 });
  const elapsed = useRef(0);
  const frames = useRef(0);

  useEffect(() => {
    startClips(mixer, animations); // idempotent; re-plays the actions after a StrictMode cleanup
    return () => {
      mixer.stopAllAction();
    };
  }, [animations, mixer]);

  // Section change -> recolor wave from head to tail plus a pupil pulse. Subscribed outside React rendering.
  useEffect(() => {
    setSkinColor(skin.uniforms, useProgressStore.getState().sectionIndex, false);
    return useProgressStore.subscribe((state, previous) => {
      if (state.sectionIndex === previous.sectionIndex) return;
      setSkinColor(skin.uniforms, state.sectionIndex, true);
      waveClock.current = 0;
      pupilPulse.current = 1;
    });
  }, [skin]);

  useFrame((_, rawDelta) => {
    const clip = walkAction;
    const delta = Math.min(rawDelta, 1 / 20);
    const state = stateRef.current;
    elapsed.current += delta;

    // Walk phase from scroll; the body travels along the branch in step with it.
    const cycles = state.reducedMotion ? 0 : state.walkCycles;
    scrubWalk(clip, cycles);

    // 1) clips first (legs get the clip pose back first: IK overwrote it and the mixer only writes changed values) ...
    restoreLegClipPose(legs);
    mixer.update(delta);
    captureLegClipPose(legs);

    // 2) ... then code on top of the pose.
    const speed = state.scrollSpeed;
    stepSpring(tuck.current, Math.abs(speed), 70, 9, delta);
    stepSpring(swing.current, speed, 45, 3.2, delta);
    poseTail(tailBones, tailRest, {
      phase: (((cycles % 1) + 1) % 1),
      time: state.reducedMotion ? 0 : elapsed.current,
      tuck: tuck.current.x,
      swing: swing.current.x,
      sectionProgress: state.sectionProgress,
      animate: !state.reducedMotion,
    });

    const rig = walker.current?.parent;
    frames.current++;
    // Matrices only become valid after the first render; before that the branch test would push the tail around.
    if (rig && frames.current > 3) {
      plantFeet(legs, clonedScene, rig, branchTravel(state.walkCycles));
      keepTailOutOfBranch(tailBones, clonedScene, rig);
    }

    // Color wave and pupil pulse (uniform writes only, no React state).
    waveClock.current = Math.min(WAVE_SECONDS, waveClock.current + delta);
    const t = waveClock.current / WAVE_SECONDS;
    setWaveFront(skin.uniforms, WAVE_DONE * (t * t * (3 - 2 * t)));
    pupilPulse.current *= Math.exp(-delta * PUPIL_PULSE_DECAY);
    setPupil(eye.uniforms, 1 + 0.55 * pupilPulse.current);
  });

  return (
    // Model faces +Z; the branch runs along X, so turn the walker to face +X. The branch slides under it (see BranchTrack).
    <group ref={walker} rotation={[0, Math.PI / 2, 0]} dispose={null}>
      {/* The whole clone is rendered as is: the mixer must find the bones under its root, so Hips can not be re-parented. */}
      <primitive object={clonedScene} />
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
