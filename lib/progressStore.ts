import { create } from "zustand";

export type ProgressState = {
  sectionIndex: number;
  /** 0..1 inside the active section. */
  sectionProgress: number;
  /** 0..1 over the whole panel scroll. */
  totalProgress: number;
  /** Signed scroll speed in px/s, as of `velocityAt`. */
  scrollVelocity: number;
  /** performance.now() of the last scroll event; lets readers decay the velocity without a timer. */
  velocityAt: number;
};

/**
 * Written from DOM scroll events only. The render loop reads it with
 * `useProgressStore.getState()` and never subscribes through React.
 */
export const useProgressStore = create<ProgressState>(() => ({
  sectionIndex: 0,
  sectionProgress: 0,
  totalProgress: 0,
  scrollVelocity: 0,
  velocityAt: 0,
}));
