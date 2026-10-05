"use client";

import dynamic from "next/dynamic";

// ssr: false is only allowed in Client Components, hence this thin wrapper.
const Scene = dynamic(() => import("@/components/scene/Scene"), { ssr: false });

export default function SceneLoader() {
  return <Scene />;
}
