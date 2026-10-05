/*
Landing-page chameleon. Follows docs/CHAMELEON_MODEL_CONTRACT.md: own AnimationMixer,
mixer.update() first and code second in every frame, walk scrubbed by phase,
tail rotated additively on top of the clip pose.
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
import { BRANCH_AXIS_Y, BRANCH_RADIUS_MAX } from "@/components/scene/branchGeometry";
import { type SceneState } from "@/components/scene/sceneState";

export const MODEL_PATH = "/models/chameleon.glb";

type TailBoneName = `Tail_${"01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11" | "12"}`;

const TAIL_BONE_NAMES: readonly TailBoneName[] = [
  "Tail_01", "Tail_02", "Tail_03", "Tail_04", "Tail_05", "Tail_06",
  "Tail_07", "Tail_08", "Tail_09", "Tail_10", "Tail_11", "Tail_12",
];

type NodeMap = {
  Chameleon: THREE.SkinnedMesh;
  Chameleon_Eyes: THREE.SkinnedMesh;
  Hips: THREE.Bone;
} & Record<TailBoneName, THREE.Bone>;

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

  // Both actions stay enabled so the mixer restores the rest pose each frame and code offsets never accumulate.
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
  const walkAction = useRef<THREE.AnimationAction | null>(null);

  const walker = useRef<THREE.Group>(null);
  const tailBones = useMemo(() => TAIL_BONE_NAMES.map((name) => nodes[name]), [nodes]);
  const waveClock = useRef(WAVE_SECONDS);
  const pupilPulse = useRef(0);
  const tuck = useRef<Spring>({ x: 0, v: 0 });
  const swing = useRef<Spring>({ x: 0, v: 0 });
  const elapsed = useRef(0);

  useEffect(() => {
    walkAction.current = startClips(mixer, animations);
    return () => {
      mixer.stopAllAction();
      walkAction.current = null;
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
    const clip = walkAction.current;
    if (!clip) return;
    const delta = Math.min(rawDelta, 1 / 20);
    const state = stateRef.current;
    elapsed.current += delta;

    // Walk phase from scroll; the body travels along the branch in step with it.
    const cycles = state.reducedMotion ? 0 : state.walkCycles;
    scrubWalk(clip, cycles);

    // 1) clips first ...
    mixer.update(delta);

    // 2) ... then code on top of the pose.
    const speed = state.scrollSpeed;
    stepSpring(tuck.current, Math.abs(speed), 70, 9, delta);
    stepSpring(swing.current, speed, 45, 3.2, delta);
    const idle = state.reducedMotion ? 0 : 1;
    for (let i = 0; i < TAIL_BONE_NAMES.length; i++) {
      const weight = (i + 1) / TAIL_BONE_NAMES.length;
      const bone = nodes[TAIL_BONE_NAMES[i]];
      // Twist: negative rotation around local X tightens the spiral; later bones twist more.
      const twist = -(0.004 + 0.012 * weight) * state.sectionProgress - tuck.current.x * 0.016 * (0.4 + weight);
      // Sway: around local Z, the tip swings most, with a small idle ripple down the chain.
      const sway = swing.current.x * 0.035 * weight + idle * 0.006 * weight * Math.sin(elapsed.current * 1.3 - i * 0.45);
      rotateAroundLocalAxis(bone, AXIS_X, twist);
      rotateAroundLocalAxis(bone, AXIS_Z, sway);
    }

    const rig = walker.current?.parent;
    if (rig) keepTailOutOfBranch(tailBones, clonedScene, rig);

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
