import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import type { SectionDef } from "@/lib/sections";
import SectionLabel from "@/components/landing/SectionLabel";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const SOCIALS = ["GitHub", "LinkedIn", "Telegram"];

export default function ContactSection({ section }: { section: SectionDef }) {
  const t = useTranslations("Contact");

  return (
    <section
      id={section.id}
      data-section
      className="flex min-h-0 flex-col gap-[clamp(16px,1.8vw,24px)] px-[clamp(20px,4vw,64px)] pb-6 pt-[clamp(28px,5vw,80px)] min-[820px]:min-h-[70dvh] min-[820px]:pb-[clamp(28px,5vw,64px)]"
    >
      <Separator className="bg-white/8" />
      <SectionLabel section={section} />
      <h2 className="m-0 max-w-[16ch] text-balance font-serif text-[clamp(32px,4vw,64px)] font-bold leading-[1.02] tracking-[-0.01em]">
        {t.rich("title", { accent: (chunks) => <em className="not-italic" style={{ color: section.accent }}>{chunks}</em> })}
      </h2>
      <p className="m-0 max-w-[52ch] text-pretty text-[clamp(15px,1.1vw,17px)] leading-[1.6] text-[#CFDAD1]">
        {t("intro")}
      </p>
      <a
        href="mailto:hello@kate.dev"
        className="self-start font-serif text-[clamp(26px,2.8vw,42px)] font-bold italic underline decoration-1 underline-offset-[6px] transition-[color] duration-200 hover:decoration-2 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#FFF6D8]"
        style={{ color: section.accent }}
      >
        hello@kate.dev
      </a>
      <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
        <Button
          size="lg"
          nativeButton={false}
          render={<a href="mailto:hello@kate.dev" />}
          className="h-[52px] gap-2.5 rounded-full px-[26px] text-base font-bold hover:-translate-y-0.5"
          style={{ background: section.accent, color: "#06150f" }}
        >
          {t("cta")} <span aria-hidden>→</span>
        </Button>
        {SOCIALS.map((social) => (
          <Button
            key={social}
            variant="outline"
            size="lg"
            nativeButton={false}
            render={<a href="#" />}
            className="h-11 rounded-full border-[#F4F1E6]/40 bg-transparent px-[18px] text-[15px] font-semibold text-[#F4F1E6] hover:border-(--accent) hover:bg-transparent hover:text-(--accent) dark:bg-transparent dark:hover:bg-transparent"
            style={{ "--accent": section.accent } as CSSProperties}
          >
            {social}
          </Button>
        ))}
      </div>
      <p className="m-0 mt-[clamp(24px,4vw,56px)] font-mono text-xs tracking-[.06em] text-[#CFDAD1]">{t("footer")}</p>
    </section>
  );
}
