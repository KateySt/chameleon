import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { SectionDef } from "@/lib/sections";
import SectionLabel from "@/components/landing/SectionLabel";
import { Separator } from "@/components/ui/separator";

type TextSectionProps = {
  section: SectionDef;
  /** Rendered under the text; the last section uses it for the footer. */
  children?: ReactNode;
  /** The last section is tall enough on desktop to scroll its label up to the active line. */
  last?: boolean;
};

/** Every section after the hero: label, heading and two paragraphs from `Sections.<id>`. */
export default function TextSection({ section, children, last = false }: TextSectionProps) {
  const t = useTranslations("Sections");

  return (
    <section
      id={section.id}
      data-section
      className={`flex flex-col gap-[clamp(14px,1.6vw,22px)] px-[clamp(20px,4vw,64px)] py-[clamp(28px,5vw,80px)] ${last ? "min-[820px]:min-h-[70dvh]" : ""}`}
    >
      <Separator className="bg-white/8" />
      <SectionLabel section={section} />
      <h2 className="m-0 max-w-[18ch] text-balance font-serif text-[clamp(28px,3.3vw,52px)] font-bold leading-[1.05] tracking-[-0.01em]">
        {t.rich(`${section.id}.title`, {
          accent: (chunks) => (
            <em className="not-italic" style={{ color: section.accent }}>
              {chunks}
            </em>
          ),
        })}
      </h2>
      <div className="flex max-w-[58ch] flex-col gap-3.5 text-pretty text-[clamp(15px,1.1vw,17px)] leading-[1.6] text-[#CFDAD1]">
        <p className="m-0">{t(`${section.id}.p1`)}</p>
        <p className="m-0">{t(`${section.id}.p2`)}</p>
      </div>
      {children}
    </section>
  );
}
