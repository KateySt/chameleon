"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import type { Group } from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Branch } from "@/components/scene/Branch";
import { Foliage } from "@/components/scene/Foliage";
import { Chameleon } from "@/components/scene/Chameleon";
import { ScrollSync } from "@/components/scene/ScrollSync";
import { branchTravel, createSceneState, type SceneState } from "@/components/scene/sceneState";

const FOV = 28;
const FRAME_WIDTH = 1.9;
const FRAME_HEIGHT = 1.12;
const LOOK_AT_Y = 0.22;

/** Backs the camera off until the chameleon and a stretch of branch fit both ways, on any cell aspect. */
function FitCamera() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useLayoutEffect(() => {
    if (!("fov" in camera)) return;
    const tan = Math.tan((FOV * Math.PI) / 360);
    const aspect = size.width / Math.max(size.height, 1);
    const distance = Math.max(FRAME_HEIGHT / (2 * tan), FRAME_WIDTH / (2 * tan * aspect));
    camera.position.set(0.45, LOOK_AT_Y + 0.35, distance);
    camera.lookAt(0.2, LOOK_AT_Y, 0);
    camera.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

/** The chameleon stays framed; the branch slides under it by the distance the walk cycles cover. */
function BranchTrack({ stateRef }: { stateRef: RefObject<SceneState> }) {
  const group = useRef<Group>(null);
  useFrame(() => {
    if (!group.current) return;
    group.current.position.x = -branchTravel(stateRef.current.walkCycles);
  });
  return (
    <group ref={group}>
      <Branch length={9} />
    </group>
  );
}

/** Mounts after the model suspended children resolved, i.e. once the chameleon is ready to draw. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

export default function Scene({ onReady }: { onReady: () => void }) {
  const stateRef = useRef(createSceneState());

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.1, far: 50 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      className="!absolute inset-0"
    >
      <FitCamera />
      <hemisphereLight args={["#bfe9d0", "#1a0f06", 1.1]} />
      <directionalLight position={[2.5, 3.5, 3]} intensity={1.5} color="#ffe2b0" />
      <directionalLight position={[-3, 1.5, -1.5]} intensity={0.8} color="#7fd6c2" />
      <Suspense fallback={null}>
        <ScrollSync stateRef={stateRef} />
        {/* three-quarter view: turn the whole rig so the chameleon walks toward the camera-right */}
        <group rotation={[0, -0.55, 0]}>
          <BranchTrack stateRef={stateRef} />
          <Chameleon stateRef={stateRef} />
        </group>
        <Foliage stateRef={stateRef} />
        <ReadySignal onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
