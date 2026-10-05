import { useTranslations } from "next-intl";
import type { SectionDef } from "@/lib/sections";
import SectionLabel from "@/components/landing/SectionLabel";
import { Button } from "@/components/ui/button";

export default function HeroSection({ section, onNavigate }: { section: SectionDef; onNavigate: (id: string) => void }) {
  const t = useTranslations("Hero");

  return (
    <section
      id={section.id}
      data-section
      className="flex flex-col gap-[clamp(14px,1.6vw,22px)] px-[clamp(20px,4vw,64px)] pb-[clamp(36px,5vw,80px)] pt-[clamp(28px,8vw,150px)]"
    >
      <SectionLabel section={section} />
      <h1 className="m-0 font-serif text-[clamp(60px,8.6vw,136px)] font-extrabold leading-[0.88] tracking-[-0.02em] text-[#F4F1E6]">Kate</h1>
      <p className="m-0 font-mono text-[clamp(12px,1vw,14px)] uppercase tracking-[.12em] text-[#CFDAD1]">{t("role")}</p>
      <p className="m-0 max-w-[20ch] text-balance font-serif text-[clamp(24px,2.6vw,40px)] font-medium leading-[1.12] text-[#F4F1E6]">
        {t.rich("tagline", {
          accent: (chunks) => (
            <em className="font-bold not-italic" style={{ color: section.accent }}>
              {chunks}
            </em>
          ),
        })}
      </p>
      <p className="m-0 max-w-[56ch] text-pretty text-[clamp(15px,1.1vw,17px)] leading-[1.6] text-[#CFDAD1]">
        {t("intro")}
      </p>
      <div className="mt-[clamp(4px,1vw,14px)] flex flex-wrap gap-3">
        <Button
          size="lg"
          render={
            <a
              href="#projects"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("projects");
              }}
            />
          }
          className="h-[52px] gap-2.5 rounded-full px-[26px] text-base font-bold shadow-2xl shadow-black/30 hover:-translate-y-0.5"
          style={{ background: section.accent, color: "#03130e" }}
        >
          {t("ctaProjects")} <span aria-hidden>→</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          render={
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("contact");
              }}
            />
          }
          className="h-[52px] rounded-full border-[1.5px] border-[#F4F1E6]/55 bg-transparent px-6 text-base font-semibold text-[#F4F1E6] hover:border-white hover:bg-white/8 hover:text-white dark:bg-transparent dark:hover:bg-white/8"
        >
          {t("ctaContact")}
        </Button>
      </div>
    </section>
  );
}
