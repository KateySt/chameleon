import { useTranslations } from "next-intl";
import type { SectionDef } from "@/lib/sections";

type HeaderProps = {
  sections: readonly SectionDef[];
  activeIndex: number;
  progress: number;
  accent: string;
  onNavigate: (index: number) => void;
};

export default function Header({ sections, activeIndex, progress, accent, onNavigate }: HeaderProps) {
  const t = useTranslations("Header");
  const tSections = useTranslations("Sections");
  const active = sections[activeIndex];

  return (
    <header className="sticky top-0 flex items-center justify-between gap-2 border-b border-white/8 bg-[#031611]/62 px-[clamp(14px,3.6vw,52px)] py-3 backdrop-blur-xl min-[560px]:gap-3" style={{ zIndex: 3 }}>
      <a
        href={`#${sections[0].id}`}
        onClick={(e) => {
          e.preventDefault();
          onNavigate(0);
        }}
        className="flex shrink-0 items-center gap-2 rounded-md font-serif text-lg font-bold italic min-[560px]:gap-2.5 min-[560px]:text-[22px] text-[#F4F1E6] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFF6D8]"
      >
        <span
          className="inline-block h-3 w-3 rounded-full transition-[background,box-shadow] duration-700 ease-out motion-reduce:transition-none"
          style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
        />
        {t("brand")}
      </a>

      <nav aria-label={t("navLabel")} className="flex items-center gap-0.5">
        {sections.map((section, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={section.id}
              type="button"
              aria-label={t("itemLabel", { index: index + 1, name: tSections(`${section.id}.navLabel`) })}
              aria-current={isActive}
              onClick={() => onNavigate(index)}
              className="flex h-8 w-6 items-center min-[560px]:w-[30px] justify-center rounded-lg border-0 bg-transparent p-0 hover:bg-white/8 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#FFF6D8]"
            >
              <span
                className="block h-1.5 rounded-full transition-[width,background] duration-300 ease-out motion-reduce:transition-none"
                style={{ width: isActive ? 18 : 6, background: isActive ? accent : "rgba(244,241,230,.4)" }}
              />
            </button>
          );
        })}
      </nav>

      <div className="hidden whitespace-nowrap font-mono text-xs min-[560px]:block tracking-[.06em] text-[#CFDAD1]">
        {t("counter", { current: `0${activeIndex + 1}`, total: `0${sections.length}`, name: tSections(`${active.id}.navLabel`) })}
      </div>

      <div aria-hidden className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-white/6">
        <div
          className="h-full transition-[width,background] duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${(progress * 100).toFixed(1)}%`, background: accent, boxShadow: `0 0 10px ${accent}` }}
        />
      </div>
    </header>
  );
}
