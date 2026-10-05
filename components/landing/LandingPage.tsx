"use client";

import { useCallback, useRef, useState } from "react";
import { SECTIONS } from "@/lib/sections";
import { useProgressStore } from "@/lib/progressStore";
import JungleBackdrop from "@/components/landing/JungleBackdrop";
import ChameleonStage from "@/components/landing/ChameleonStage";
import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/sections/HeroSection";
import AboutSection from "@/components/landing/sections/AboutSection";
import SkillsSection from "@/components/landing/sections/SkillsSection";
import ProjectsSection from "@/components/landing/sections/ProjectsSection";
import ProcessSection from "@/components/landing/sections/ProcessSection";
import ContactSection from "@/components/landing/sections/ContactSection";

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

  const navigateById = useCallback(
    (id: string) => {
      const index = SECTIONS.findIndex((section) => section.id === id);
      if (index >= 0) navigate(index);
    },
    [navigate]
  );

  const active = SECTIONS[activeIndex];

  return (
    <div
      className="relative h-dvh overflow-hidden bg-[#03130e] text-[#F4F1E6] font-[family-name:var(--font-google-sans)]"
      style={{ WebkitFontSmoothing: "antialiased" }}
    >
      <JungleBackdrop accent={active.accent} />

      <div className="relative flex h-dvh flex-col min-[820px]:mx-auto min-[820px]:grid min-[820px]:max-w-[1600px] min-[820px]:grid-cols-2 min-[820px]:gap-[clamp(16px,2vw,40px)] min-[820px]:p-[clamp(16px,1.8vw,32px)]">
        <div className="relative order-2 h-[50dvh] min-[820px]:order-1 min-[820px]:h-full">
          <ChameleonStage section={active} />
        </div>

        <div
          className="relative z-[2] order-1 h-[50dvh] overflow-hidden transition-[background] duration-700 ease-out [mask-image:linear-gradient(180deg,#000_82%,transparent_100%)] motion-reduce:transition-none min-[820px]:order-2 min-[820px]:h-full min-[820px]:rounded-[28px] min-[820px]:border min-[820px]:border-white/16 min-[820px]:shadow-[0_30px_80px_rgba(0,0,0,.4),inset_0_1px_0_rgba(255,255,255,.12)] min-[820px]:[mask-image:none]"
          style={{
            background: `rgba(3,26,20,${activeIndex === 5 ? 0.7 : 0.62})`,
            backdropFilter: "blur(24px) saturate(1.15)",
            WebkitBackdropFilter: "blur(24px) saturate(1.15)",
          }}
        >
          <div
            ref={scrollerRef}
            onScroll={updateFromScroll}
            className="absolute inset-0 overflow-y-auto overscroll-contain pb-[12dvh] min-[820px]:pb-0"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,.25) transparent" }}
          >
            <Header sections={SECTIONS} activeIndex={activeIndex} progress={progress} accent={active.accent} onNavigate={navigate} />
            <HeroSection section={SECTIONS[0]} onNavigate={navigateById} />
            <AboutSection section={SECTIONS[1]} />
            <SkillsSection section={SECTIONS[2]} />
            <ProjectsSection section={SECTIONS[3]} />
            <ProcessSection section={SECTIONS[4]} />
            <ContactSection section={SECTIONS[5]} />
          </div>
        </div>
      </div>
    </div>
  );
}
