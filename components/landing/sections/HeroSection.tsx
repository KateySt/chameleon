import { useTranslations } from "next-intl";
import type { SectionDef } from "@/lib/sections";
import SectionLabel from "@/components/landing/SectionLabel";

export default function HeroSection({ section }: { section: SectionDef }) {
  const t = useTranslations("Sections.hero");

  return (
    <section
      id={section.id}
      data-section
      className="flex flex-col gap-[clamp(14px,1.6vw,22px)] px-[clamp(20px,4vw,64px)] pb-[clamp(36px,5vw,80px)] pt-[clamp(28px,8vw,150px)]"
    >
      <SectionLabel section={section} />
      <h1 className="m-0 font-serif text-[clamp(52px,7vw,112px)] font-extrabold leading-[0.88] tracking-[-0.02em] text-[#F4F1E6]">
        {t("title")}
      </h1>
      <p className="m-0 max-w-[20ch] text-balance font-serif text-[clamp(24px,2.6vw,40px)] font-medium leading-[1.12] text-[#F4F1E6]">
        {t.rich("tagline", {
          accent: (chunks) => (
            <em className="font-bold not-italic" style={{ color: section.accent }}>
              {chunks}
            </em>
          ),
        })}
      </p>
      <div className="flex max-w-[56ch] flex-col gap-3.5 text-pretty text-[clamp(15px,1.1vw,17px)] leading-[1.6] text-[#CFDAD1]">
        <p className="m-0">{t("p1")}</p>
        <p className="m-0">{t("p2")}</p>
      </div>
    </section>
  );
}
