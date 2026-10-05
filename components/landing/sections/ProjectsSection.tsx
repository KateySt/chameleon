import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { SectionDef } from "@/lib/sections";
import SectionLabel from "@/components/landing/SectionLabel";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

const PROJECTS = [
  { key: "canopy", name: "Canopy", stack: "Next.js · NestJS · PostgreSQL" },
  { key: "ripplePay", name: "Ripple Pay", stack: "React · Go · ClickHouse" },
  { key: "fernhouse", name: "Fernhouse", stack: "Remix · Node.js · Prisma" },
  { key: "lumenAtlas", name: "Lumen Atlas", stack: "Three.js · WebGL · AWS" },
] as const;

export default function ProjectsSection({ section }: { section: SectionDef }) {
  const t = useTranslations("Projects");

  return (
    <section
      id={section.id}
      data-section
      className="flex flex-col gap-[clamp(16px,1.8vw,26px)] px-[clamp(20px,4vw,64px)] py-[clamp(28px,5vw,80px)]"
    >
      <Separator className="bg-white/8" />
      <SectionLabel section={section} />
      <h2 className="m-0 max-w-[18ch] text-balance font-serif text-[clamp(28px,3.3vw,52px)] font-bold leading-[1.05] tracking-[-0.01em]">
        {t.rich("title", { accent: (chunks) => <em className="not-italic" style={{ color: section.accent }}>{chunks}</em> })}
      </h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))] gap-[clamp(14px,1.6vw,22px)]">
        {PROJECTS.map((project) => (
          <a
            key={project.key}
            href="#"
            className="block no-underline focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#FFF6D8]"
            style={{ "--accent": section.accent } as CSSProperties}
          >
            <Card className="gap-0 overflow-hidden rounded-[18px] py-0 text-[#F4F1E6] ring-white/14 transition-[transform,box-shadow,background] duration-[250ms] ease-out hover:-translate-y-1 hover:bg-white/7 hover:ring-(--accent)">
              <div
                className="flex aspect-video items-end border-b border-white/10 p-3 font-mono text-[11px] text-[#CFDAD1]"
                style={{ background: "repeating-linear-gradient(135deg,rgba(255,150,200,.12) 0 8px,rgba(255,150,200,.04) 8px 16px)" }}
              >
                {t("preview", { name: project.name })}
              </div>
              <CardContent className="flex flex-col gap-2 px-[18px] pt-4 pb-[18px]">
                <div className="flex items-baseline justify-between gap-2.5">
                  <h3 className="m-0 font-serif text-2xl font-bold">{project.name}</h3>
                  <span className="text-sm font-semibold" style={{ color: section.accent }}>
                    {t("caseStudy")}
                  </span>
                </div>
                <p className="m-0 text-sm leading-[1.5] text-[#CFDAD1]">{t(`items.${project.key}.description`)}</p>
                <p className="m-0 font-mono text-xs text-[#F4F1E6]">{project.stack}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}
