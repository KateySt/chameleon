/** Smoothed, per-frame values derived from the progress store. Mutated by ScrollSync, read by scene components. */
export type SceneState = {
  /** Unbounded walk phase in cycles; fract() of it scrubs the walk clip. */
  walkCycles: number;
  sectionProgress: number;
  /** Signed scroll speed, roughly -1..1. */
  scrollSpeed: number;
  reducedMotion: boolean;
};

export function createSceneState(): SceneState {
  return { walkCycles: 0, sectionProgress: 0, scrollSpeed: 0, reducedMotion: false };
}

/** Walk cycles covered by a full scroll through the panel. */
export const WALK_CYCLES_TOTAL = 24;
/** Distance (original model units) the chameleon covers per walk cycle, per the model contract. */
export const METERS_PER_CYCLE = 0.12;
