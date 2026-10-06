"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SECTIONS } from "@/lib/sections";
import { useProgressStore } from "@/lib/progressStore";
import JungleBackdrop from "@/components/landing/JungleBackdrop";
import ChameleonStage from "@/components/landing/ChameleonStage";
import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/sections/HeroSection";
import TextSection from "@/components/landing/sections/TextSection";

// Matches the sticky header's rendered height, so scrollIntoView lands just below it.
const HEADER_OFFSET = 56;

export default function LandingPage() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const lastScroll = useRef({ top: 0, time: 0 });

  const updateFromScroll = useCallback(() => {
    const panel = scrollerRef.current;
    if (!panel) return;
    const sections = panel.querySelectorAll<HTMLElement>("[data-section]");
    const line = panel.scrollTop + panel.clientHeight * 0.38;
    let active = 0;
    sections.forEach((el, i) => {
      if (el.offsetTop <= line) active = i;
    });
    if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 4) {
      active = sections.length - 1;
    }
    const max = panel.scrollHeight - panel.clientHeight;
    const total = max > 0 ? panel.scrollTop / max : 0;
    setActiveIndex(active);
    setProgress(total);

    // Transient scene inputs: the 3D loop reads these from the store without re-rendering React.
    const current = sections[active];
    const sectionEnd = sections[active + 1]?.offsetTop ?? panel.scrollHeight;
    const sectionProgress = Math.min(1, Math.max(0, (line - current.offsetTop) / Math.max(sectionEnd - current.offsetTop, 1)));
    const now = performance.now();
    const elapsed = now - lastScroll.current.time;
    const velocity = elapsed > 0 && elapsed < 200 ? ((panel.scrollTop - lastScroll.current.top) / elapsed) * 1000 : 0;
    lastScroll.current = { top: panel.scrollTop, time: now };
    useProgressStore.setState({
      sectionIndex: active,
      sectionProgress,
      totalProgress: total,
      scrollVelocity: velocity,
      velocityAt: now,
    });
  }, []);

  const navigate = useCallback(
    (index: number) => {
      const panel = scrollerRef.current;
      const sections = panel?.querySelectorAll<HTMLElement>("[data-section]");
      const target = sections?.[index];
      if (!panel || !target) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.scrollTo({ top: index === 0 ? 0 : target.offsetTop - HEADER_OFFSET, behavior: reduced ? "auto" : "smooth" });
      if (reduced) {
        updateFromScroll();
        requestAnimationFrame(updateFromScroll);
      }
    },
    [updateFromScroll]
  );

  const tFooter = useTranslations("Footer");
  const active = SECTIONS[activeIndex];
  const lastIndex = SECTIONS.length - 1;

  return (
    <div
      className="relative h-dvh overflow-hidden bg-[#03130e] text-[#F4F1E6] font-[family-name:var(--font-google-sans)]"
      style={{ WebkitFontSmoothing: "antialiased" }}
    >
      <JungleBackdrop accent={active.accent} />

      <div className="relative h-dvh min-[820px]:mx-auto min-[820px]:grid min-[820px]:max-w-[1600px] min-[820px]:grid-cols-2 min-[820px]:gap-[clamp(16px,2vw,40px)] min-[820px]:p-[clamp(16px,1.8vw,32px)]">
         <div className="absolute inset-x-0 bottom-0 h-[54dvh] min-[820px]:relative min-[820px]:inset-auto min-[820px]:order-1 min-[820px]:h-full">
          <ChameleonStage section={active} />
        </div>

        <div className="absolute inset-x-3 top-3 bottom-0 z-[2] min-[820px]:relative min-[820px]:inset-auto min-[820px]:order-2 min-[820px]:h-full">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-[50dvh] rounded-[22px] border border-white/16 shadow-[0_30px_80px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.12)] transition-[background] duration-700 ease-out motion-reduce:transition-none min-[820px]:h-full min-[820px]:rounded-[28px]"
            style={{
              background: `rgba(3,26,20,${activeIndex === lastIndex ? 0.7 : 0.62})`,
              backdropFilter: "blur(24px) saturate(1.15)",
              WebkitBackdropFilter: "blur(24px) saturate(1.15)",
            }}
          />
          <div
            ref={scrollerRef}
            onScroll={updateFromScroll}
            className="absolute inset-px overflow-y-auto overscroll-contain rounded-t-[21px] pb-[50dvh] [mask-image:linear-gradient(180deg,#000_calc(50dvh_-_56px),transparent_calc(50dvh_-_4px))] min-[820px]:rounded-[27px] min-[820px]:pb-0 min-[820px]:[mask-image:none]"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,.25) transparent" }}
          >
            <Header sections={SECTIONS} activeIndex={activeIndex} progress={progress} accent={active.accent} onNavigate={navigate} />
            <HeroSection section={SECTIONS[0]} />
            {SECTIONS.slice(1).map((section, i) =>
              i + 1 === lastIndex ? (
                <TextSection key={section.id} section={section} last>
                  <p className="m-0 mt-[clamp(24px,4vw,56px)] font-mono text-xs tracking-[.06em] text-[#CFDAD1]">
                    {tFooter("text")}
                  </p>
                </TextSection>
              ) : (
                <TextSection key={section.id} section={section} />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
