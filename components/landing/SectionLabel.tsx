import { useTranslations } from "next-intl";
import type { SectionDef } from "@/lib/sections";

export default function SectionLabel({ section }: { section: SectionDef }) {
  const t = useTranslations("Sections");

  return (
    <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[.14em]" style={{ color: section.accent }}>
      <span className="h-2 w-2 rounded-full" style={{ background: section.accent }} />
      {t(`${section.id}.label`)}
    </div>
  );
}
