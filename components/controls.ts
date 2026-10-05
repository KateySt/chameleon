export type ClipName = "walk" | "eyes_look";

/**
 * Mutable controls shared between the DOM panel and the render loop.
 * Lives in a ref so slider drags never trigger React renders inside useFrame.
 * All angles are in radians.
 */
export type ModelTestControls = {
  clip: ClipName;
  /** 0..1 position inside the walk clip. */
  walkPhase: number;
  showBoneAxes: boolean;
  headLookYaw: number;
  headLookPitch: number;
  eyeLeftYaw: number;
  eyeLeftPitch: number;
  /** Per-bone rotation around local X, applied to every Tail_01..12. */
  tailTwist: number;
  /** Per-bone rotation around local Z, applied to every Tail_01..12. */
  tailSway: number;
};

export const DEFAULT_CONTROLS: ModelTestControls = {
  clip: "walk",
  walkPhase: 0,
  showBoneAxes: true,
  headLookYaw: 0,
  headLookPitch: 0,
  eyeLeftYaw: 0,
  eyeLeftPitch: 0,
  tailTwist: 0,
  tailSway: 0,
};
