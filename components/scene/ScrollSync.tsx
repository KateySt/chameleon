"use client";

import { useEffect, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useProgressStore } from "@/lib/progressStore";
import { WALK_CYCLES_TOTAL, type SceneState } from "@/components/scene/sceneState";

const MAX_SPEED_PX_PER_S = 2400;
const VELOCITY_DECAY_MS = 140;

type ScrollSyncProps = {
  stateRef: RefObject<SceneState>;
};

/** Turns the DOM-driven progress store into smoothed values for the scene. Renders nothing; must precede consumers. */
export function ScrollSync({ stateRef }: ScrollSyncProps) {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      stateRef.current.reducedMotion = query.matches;
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [stateRef]);

  useFrame((_, delta) => {
    const state = stateRef.current;
    const store = useProgressStore.getState();

    state.sectionProgress += (store.sectionProgress - state.sectionProgress) * (1 - Math.exp(-delta * 10));

    if (state.reducedMotion) {
      state.scrollSpeed = 0;
      return;
    }

    const targetCycles = store.totalProgress * WALK_CYCLES_TOTAL;
    state.walkCycles += (targetCycles - state.walkCycles) * (1 - Math.exp(-delta * 9));

    const age = performance.now() - store.velocityAt;
    const decayed = store.scrollVelocity * Math.exp(-age / VELOCITY_DECAY_MS);
    state.scrollSpeed = Math.max(-1, Math.min(1, decayed / MAX_SPEED_PX_PER_S));
  });

  return null;
}
