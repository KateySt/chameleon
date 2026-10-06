export type SectionId = "hero" | "color" | "eyes" | "tongue" | "grip" | "night";

/** Language-independent section data. Visible text lives in messages/<locale>.json under `Sections.<id>`. */
export interface SectionDef {
  id: SectionId;
  /** oklch() accent color the stage and panel recolor to while this section is active. */
  accent: string;
}

export const SECTIONS: readonly SectionDef[] = [
  { id: "hero", accent: "oklch(0.82 0.15 160)" },
  { id: "color", accent: "oklch(0.84 0.12 195)" },
  { id: "eyes", accent: "oklch(0.88 0.15 95)" },
  { id: "tongue", accent: "oklch(0.8 0.16 350)" },
  { id: "grip", accent: "oklch(0.8 0.15 55)" },
  { id: "night", accent: "oklch(0.85 0.12 85)" },
];
