import { useTranslations } from "next-intl";
import SceneLoader from "@/components/scene/SceneLoader";
import type { SectionDef } from "@/lib/sections";

// Soft edges so the canvas never shows a hard cut: fades left/right and at the bottom (intersected).
const STAGE_MASK = "linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent), linear-gradient(0deg, transparent, #000 9%)";

type ChameleonStageProps = {
  section: SectionDef;
};

/** Left-hand stage: accent glow plus the live 3D scene (client-only Canvas, see components/scene). */
export default function ChameleonStage({ section }: ChameleonStageProps) {
  const t = useTranslations("Stage");
  const accent = section.accent;
  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="relative mt-[8%] aspect-square w-[min(640px,92%)]">
        {/* ambient glow behind the chameleon, tinted by the active accent */}
        <div
          className="absolute left-[14%] top-[22%] h-[50%] w-[72%] rounded-full opacity-60 blur-3xl transition-[background] duration-700 ease-out motion-reduce:transition-none"
          style={{ background: `radial-gradient(closest-side, color-mix(in oklch, ${accent} 55%, transparent), transparent)` }}
        />
      </div>
      <div role="img" aria-label={t("alt")} className="absolute inset-0"
        style={{ maskImage: STAGE_MASK, maskComposite: "intersect", WebkitMaskImage: STAGE_MASK, WebkitMaskComposite: "source-in" }}
      >
        <SceneLoader />
      </div>
    </div>
  );
}
