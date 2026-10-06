"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useProgressStore } from "@/lib/progressStore";
import { WALK_CYCLES_TOTAL, type SceneState } from "@/components/scene/sceneState";

const MAX_SPEED_PX_PER_S = 2400;
const VELOCITY_DECAY_MS = 140;
/** Top walking pace (cycles/s; the clip's own pace is 0.5). A fast scroll is caught up at this pace instead of a sprint. */
const MAX_WALK_CYCLES_PER_S = 1.8;
/** Pace per cycle still to go: the walk eases into its stop. */
const WALK_GAIN = 2;
/** Pace response; 4 * WALK_GAIN is critical damping, so the walk never overshoots and steps back. */
const WALK_RESPONSE = 4 * WALK_GAIN;

type ScrollSyncProps = {
  stateRef: RefObject<SceneState>;
};

/** Turns the DOM-driven progress store into smoothed values for the scene. Renders nothing; must precede consumers. */
export function ScrollSync({ stateRef }: ScrollSyncProps) {
  // Start from the current scroll (the browser restores it on refresh) so nothing has to "catch up" on the first frames.
  useEffect(() => {
    const store = useProgressStore.getState();
    stateRef.current.walkCycles = store.totalProgress * WALK_CYCLES_TOTAL;
    stateRef.current.sectionProgress = store.sectionProgress;
  }, [stateRef]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      stateRef.current.reducedMotion = query.matches;
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [stateRef]);

  const walkPace = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const state = stateRef.current;
    const store = useProgressStore.getState();

    state.sectionProgress += (store.sectionProgress - state.sectionProgress) * (1 - Math.exp(-delta * 10));

    if (state.reducedMotion) {
      state.scrollSpeed = 0;
      return;
    }

    const targetCycles = store.totalProgress * WALK_CYCLES_TOTAL;
    const wantedPace = Math.max(
      -MAX_WALK_CYCLES_PER_S,
      Math.min(MAX_WALK_CYCLES_PER_S, (targetCycles - state.walkCycles) * WALK_GAIN)
    );
    walkPace.current += (wantedPace - walkPace.current) * (1 - Math.exp(-delta * WALK_RESPONSE));
    state.walkCycles += walkPace.current * delta;

    const age = performance.now() - store.velocityAt;
    const decayed = store.scrollVelocity * Math.exp(-age / VELOCITY_DECAY_MS);
    state.scrollSpeed = Math.max(-1, Math.min(1, decayed / MAX_SPEED_PX_PER_S));
  });

  return null;
}
