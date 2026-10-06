"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

// ssr: false is only allowed in Client Components, hence this thin wrapper.
const Scene = dynamic(() => import("@/components/scene/Scene"), { ssr: false });

/** Covers the stage while the Scene chunk and the model load; fades out once the chameleon is drawable. */
function LoadingVeil({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-700 motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="size-10 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40 motion-reduce:animate-none" />
    </div>
  );
}

export default function SceneLoader() {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <>
      <Scene onReady={handleReady} />
      <LoadingVeil visible={!ready} />
    </>
  );
}
