import type { Metadata } from "next";
import ModelTestLoader from "@/components/ModelTestLoader";

export const metadata: Metadata = {
  title: "Model test",
  robots: { index: false },
};

export default function ModelTestPage() {
  return <ModelTestLoader />;
}
