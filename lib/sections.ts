export type SectionId = "hero" | "about" | "skills" | "projects" | "process" | "contact";

/** Language-independent section data. Visible text lives in messages/<locale>.json under `Sections.<id>`. */
export interface SectionDef {
  id: SectionId;
  /** oklch() accent color the stage and panel recolor to while this section is active. */
  accent: string;
}

export const SECTIONS: readonly SectionDef[] = [
  { id: "hero", accent: "oklch(0.82 0.15 160)" },
  { id: "about", accent: "oklch(0.84 0.12 195)" },
  { id: "skills", accent: "oklch(0.88 0.15 95)" },
  { id: "projects", accent: "oklch(0.8 0.16 350)" },
  { id: "process", accent: "oklch(0.8 0.15 55)" },
  { id: "contact", accent: "oklch(0.85 0.12 85)" },
];
