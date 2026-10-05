import { useTranslations } from "next-intl";
import type { SectionDef } from "@/lib/sections";
import SectionLabel from "@/components/landing/SectionLabel";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const GROUPS = [
  { key: "interface", items: ["TypeScript", "React", "Next.js", "Three.js", "Tailwind"] },
  { key: "server", items: ["Node.js", "NestJS", "Go", "GraphQL", "REST"] },
  { key: "data", items: ["PostgreSQL", "Redis", "Prisma", "ClickHouse"] },
  { key: "infrastructure", items: ["Docker", "AWS", "Terraform", "GitHub Actions"] },
] as const;

export default function SkillsSection({ section }: { section: SectionDef }) {
  const t = useTranslations("Skills");

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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-[clamp(18px,2vw,28px)]">
        {GROUPS.map((group) => (
          <div key={group.key} className="flex flex-col gap-2.5">
            <h3 className="m-0 text-[13px] font-bold tracking-[.04em] text-[#F4F1E6]">{t(`groups.${group.key}`)}</h3>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <Badge
                  key={item}
                  variant="outline"
                  className="h-auto rounded-full border-[rgba(255,236,150,.4)] bg-[rgba(255,236,150,.07)] px-3 py-1.5 text-sm font-normal text-[#F4F1E6]"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
