"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ChameleonModel } from "@/components/ChameleonModel";
import { DEFAULT_CONTROLS, type ClipName, type ModelTestControls } from "@/components/controls";

const DEGREES_TO_RADIANS = Math.PI / 180;

type SliderProps = {
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  initialValue: number;
  unit?: string;
  onValueChange: (value: number) => void;
};

function Slider({ label, hint, min, max, step, initialValue, unit = "", onValueChange }: SliderProps) {
  const [displayedValue, setDisplayedValue] = useState(initialValue);

  return (
    <label className="block text-xs">
      <span className="flex justify-between gap-2">
        <span>
          {label}
          {hint ? <span className="text-white/50"> {hint}</span> : null}
        </span>
        <span className="tabular-nums">
          {displayedValue.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        defaultValue={initialValue}
        onChange={(event) => {
          const value = event.currentTarget.valueAsNumber;
          setDisplayedValue(value);
          onValueChange(value);
        }}
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2 border-t border-white/15 pt-2">
      <legend className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{title}</legend>
      {children}
    </fieldset>
  );
}

export default function ModelTestScene() {
  const controlsRef = useRef<ModelTestControls>({ ...DEFAULT_CONTROLS });
  const [activeClip, setActiveClip] = useState<ClipName>(DEFAULT_CONTROLS.clip);

  const selectClip = (clip: ClipName) => {
    controlsRef.current.clip = clip;
    setActiveClip(clip);
  };

  const bindDegrees = (key: keyof Omit<ModelTestControls, "clip" | "showBoneAxes">) => (degrees: number) => {
    controlsRef.current[key] = degrees * DEGREES_TO_RADIANS;
  };

  return (
    <div className="relative h-screen w-screen bg-neutral-900">
      <Canvas camera={{ position: [2.6, 1.3, 2.6], fov: 40 }}>
        <color attach="background" args={["#1c1c1f"]} />
        <hemisphereLight args={["#ffffff", "#40403a", 1.1]} />
        <directionalLight position={[3, 5, 2]} intensity={2.2} />
        <directionalLight position={[-3, 2, -3]} intensity={0.8} />
        <gridHelper args={[4, 16, "#555555", "#333333"]} />
        <axesHelper args={[0.6]} />
        <Suspense fallback={null}>
          <ChameleonModel controlsRef={controlsRef} />
        </Suspense>
        <OrbitControls target={[0, 0.4, 0]} makeDefault />
      </Canvas>

      <aside className="absolute left-3 top-3 max-h-[calc(100vh-1.5rem)] w-72 space-y-3 overflow-y-auto rounded-lg bg-black/70 p-3 text-white backdrop-blur">
        <h1 className="text-sm font-semibold">/model-test</h1>

        <Section title="Клип">
          <div className="flex gap-3 text-xs">
            {(["walk", "eyes_look"] as const).map((clip) => (
              <label key={clip} className="flex items-center gap-1">
                <input type="radio" name="clip" checked={activeClip === clip} onChange={() => selectClip(clip)} />
                {clip}
              </label>
            ))}
          </div>
          <Slider
            label="Фаза walk"
            hint="(scrub)"
            min={0}
            max={1}
            step={0.005}
            initialValue={DEFAULT_CONTROLS.walkPhase}
            onValueChange={(phase) => {
              controlsRef.current.walkPhase = phase;
            }}
          />
        </Section>

        <Section title="HeadLook (yaw = Z, pitch = X)">
          <Slider label="yaw" hint="пределы ±30" min={-90} max={90} step={1} initialValue={0} unit="°" onValueChange={bindDegrees("headLookYaw")} />
          <Slider label="pitch" hint="пределы ±15" min={-90} max={90} step={1} initialValue={0} unit="°" onValueChange={bindDegrees("headLookPitch")} />
        </Section>

        <Section title="Eye_L (Z и X вокруг +Y взгляда)">
          <Slider label="поворот вокруг Z" min={-90} max={90} step={1} initialValue={0} unit="°" onValueChange={bindDegrees("eyeLeftYaw")} />
          <Slider label="поворот вокруг X" min={-90} max={90} step={1} initialValue={0} unit="°" onValueChange={bindDegrees("eyeLeftPitch")} />
        </Section>

        <Section title="Tail_01…12 (на каждую кость)">
          <Slider label="закрутка вокруг X" hint="вниз = минус" min={-15} max={15} step={0.5} initialValue={0} unit="°" onValueChange={bindDegrees("tailTwist")} />
          <Slider label="покачивание вокруг Z" min={-15} max={15} step={0.5} initialValue={0} unit="°" onValueChange={bindDegrees("tailSway")} />
        </Section>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            defaultChecked={DEFAULT_CONTROLS.showBoneAxes}
            onChange={(event) => {
              controlsRef.current.showBoneAxes = event.currentTarget.checked;
            }}
          />
          оси костей (R = X, G = Y, B = Z)
        </label>
      </aside>
    </div>
  );
}
