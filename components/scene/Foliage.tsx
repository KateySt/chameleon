"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  buildFoliage,
  LEAF_TEXTURE_NAMES,
  leafTexturePath,
  updateFoliage,
  type LeafTextureName,
} from "@/components/scene/foliageLayout";
import type { SceneState } from "@/components/scene/sceneState";

const FOCUS_POINT = new THREE.Vector3(0.2, 0.22, 0);

type FoliageProps = {
  stateRef: RefObject<SceneState>;
};

/** Swaying undergrowth along the bottom edge: three depth layers of alpha-textured leaves with a vertex-shader wind. */
export function Foliage({ stateRef }: FoliageProps) {
  const paths = LEAF_TEXTURE_NAMES.map(leafTexturePath);
  const loaded = useTexture(paths, (items) => {
    for (const texture of Array.isArray(items) ? items : [items]) texture.colorSpace = THREE.SRGBColorSpace;
  });
  const camera = useThree((state) => state.camera);

  const foliage = useMemo(() => {
    const byName = {} as Record<LeafTextureName, THREE.Texture>;
    LEAF_TEXTURE_NAMES.forEach((name, i) => {
      byName[name] = loaded[i];
    });
    return buildFoliage(byName);
  }, [loaded]);
  useEffect(() => () => foliage.dispose(), [foliage]);

  // The cursor is damped: raw pointer values jump between events, which made the leaves twitch.
  const smoothPointer = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const scene = stateRef.current;
    const follow = 1 - Math.exp(-Math.min(delta, 0.1) * 3);
    smoothPointer.current.x += (state.pointer.x - smoothPointer.current.x) * follow;
    smoothPointer.current.y += (state.pointer.y - smoothPointer.current.y) * follow;
    updateFoliage(foliage, camera, camera.position.distanceTo(FOCUS_POINT), {
      time: state.clock.elapsedTime,
      scrollSpeed: scene.scrollSpeed,
      pointerX: smoothPointer.current.x,
      pointerY: smoothPointer.current.y,
      animate: !scene.reducedMotion,
    });
  });

  return <primitive object={foliage.root} />;
}
