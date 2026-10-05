import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { SectionDef } from "@/lib/sections";
import SectionLabel from "@/components/landing/SectionLabel";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AboutSection({ section }: { section: SectionDef }) {
  const t = useTranslations("About");

  return (
    <section
      id={section.id}
      data-section
      className="flex flex-col gap-[clamp(14px,1.6vw,22px)] px-[clamp(20px,4vw,64px)] py-[clamp(28px,5vw,80px)]"
    >
      <Separator className="bg-white/8" />
      <SectionLabel section={section} />
      <h2 className="m-0 max-w-[18ch] text-balance font-serif text-[clamp(28px,3.3vw,52px)] font-bold leading-[1.05] tracking-[-0.01em]">
        {t.rich("title", { accent: (chunks) => <em className="not-italic" style={{ color: section.accent }}>{chunks}</em> })}
      </h2>
      <div className="flex flex-wrap items-start gap-[clamp(18px,2.4vw,32px)]">
        <Avatar
          className="aspect-square size-[clamp(84px,9vw,132px)] shrink-0 after:border-[1.5px] after:border-(--accent)"
          style={{ "--accent": section.accent } as CSSProperties}
        >
          <AvatarFallback
            className="font-mono text-[10px] tracking-[.08em] text-[#CFDAD1]"
            style={{ background: "repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 6px,rgba(255,255,255,.02) 6px 12px)" }}
          >
            {t("photo")}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-[280px] max-w-[58ch] flex-1 flex-col gap-3.5 text-pretty text-[clamp(15px,1.1vw,17px)] leading-[1.6] text-[#CFDAD1]">
          <p className="m-0">
            {t("p1")}
          </p>
          <p className="m-0">
            {t("p2")}
          </p>
          <p className="m-0 font-mono text-xs tracking-[.06em] text-[#F4F1E6]">{t("meta")}</p>
        </div>
      </div>
    </section>
  );
}
