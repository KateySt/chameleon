type JungleBackdropProps = {
  accent: string;
};

/**
 * Full-bleed backdrop: a CSS-painted jungle canopy (dark moss gradient + light
 * shafts + bokeh) tinted by the active accent. Drop a real photo at
 * public/images/landing/jungle-bg.png and swap the gradient below for an
 * <Image fill src="/images/landing/jungle-bg.png" .../> for the photographic version.
 */
export default function JungleBackdrop({ accent }: JungleBackdropProps) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 20% 15%, #163023 0%, #0b2018 35%, #03130e 70%)," +
            "linear-gradient(160deg, #0a241b 0%, #03130e 60%)",
        }}
      />
      <div
        className="absolute inset-0 transition-[background] duration-700 ease-out motion-reduce:transition-none"
        style={{ background: `radial-gradient(60% 55% at 26% 58%, color-mix(in oklch, ${accent} 22%, transparent), transparent 70%)`, mixBlendMode: "soft-light" }}
      />
      <div
        className="absolute -left-[6%] top-[-20%] h-[140%] w-[7%] rotate-[-28deg] mix-blend-screen blur-md"
        style={{ background: "linear-gradient(180deg,rgba(255,214,140,0) 0%,rgba(255,214,140,.22) 30%,rgba(255,214,140,0) 85%)" }}
      />
      <div
        className="absolute left-[17%] top-[-20%] h-[140%] w-[3.5%] rotate-[-28deg] mix-blend-screen blur-sm"
        style={{ background: "linear-gradient(180deg,rgba(255,226,160,0) 0%,rgba(255,226,160,.18) 35%,rgba(255,226,160,0) 80%)" }}
      />
      <div
        className="absolute left-[27%] top-[-20%] h-[140%] w-[5%] rotate-[-28deg] mix-blend-screen blur-lg"
        style={{ background: "linear-gradient(180deg,rgba(255,214,140,0) 0%,rgba(255,214,140,.12) 30%,rgba(255,214,140,0) 75%)" }}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,rgba(2,14,10,0) 0%,rgba(2,14,10,.15) 45%,rgba(2,14,10,.5) 100%)" }} />
      <div
        className="absolute left-[12%] top-[14%] h-[90px] w-[90px] rounded-full blur-[4px]"
        style={{ background: "radial-gradient(circle, rgba(255,226,160,.55), rgba(255,226,160,0) 70%)" }}
      />
      <div
        className="absolute left-[30%] top-[30%] h-[46px] w-[46px] rounded-full blur-[2px]"
        style={{ background: "radial-gradient(circle, rgba(255,236,190,.5), rgba(255,236,190,0) 70%)" }}
      />
      <div
        className="absolute left-[22%] top-[8%] h-[140px] w-[140px] rounded-full blur-[8px]"
        style={{ background: "radial-gradient(circle, rgba(170,255,220,.22), rgba(170,255,220,0) 70%)" }}
      />
      <div
        className="absolute left-[62%] top-[20%] h-[70px] w-[70px] rounded-full blur-[4px]"
        style={{ background: "radial-gradient(circle, rgba(255,226,160,.35), rgba(255,226,160,0) 70%)" }}
      />
      <div
        className="absolute left-[8%] top-[40%] h-[28px] w-[28px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,240,200,.7), rgba(255,240,200,0) 70%)" }}
      />
    </div>
  );
}
