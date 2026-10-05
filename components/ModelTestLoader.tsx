"use client";

import dynamic from "next/dynamic";

// ssr: false is only allowed in Client Components, hence this thin wrapper.
const ModelTestScene = dynamic(() => import("@/components/ModelTestScene"), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-white/70">Загрузка сцены…</p>,
});

export default function ModelTestLoader() {
  return <ModelTestScene />;
}
