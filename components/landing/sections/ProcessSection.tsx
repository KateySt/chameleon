import { useTranslations } from "next-intl";
import type { SectionDef } from "@/lib/sections";
import SectionLabel from "@/components/landing/SectionLabel";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

const STEPS = [
  { n: "01", key: "observe" },
  { n: "02", key: "design" },
  { n: "03", key: "build" },
  { n: "04", key: "deliver" },
] as const;

export default function ProcessSection({ section }: { section: SectionDef }) {
  const t = useTranslations("Process");

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
      <ol className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-[clamp(14px,1.6vw,22px)] p-0">
        {STEPS.map((step) => (
          <li key={step.n}>
            <Card className="gap-2 rounded-2xl bg-white/3 px-5 pt-[18px] pb-5 ring-white/12">
              <span className="font-serif text-[30px] font-bold italic leading-none" style={{ color: section.accent }}>
                {step.n}
              </span>
              <h3 className="m-0 text-[17px] font-bold">{t(`steps.${step.key}.title`)}</h3>
              <p className="m-0 text-[15px] leading-[1.55] text-[#CFDAD1]">{t(`steps.${step.key}.text`)}</p>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
