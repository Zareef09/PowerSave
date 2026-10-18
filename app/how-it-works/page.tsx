import type { Metadata } from "next";
import { HowItWorksPage } from "@/components/info/HowItWorksPage";

export const metadata: Metadata = {
  title: "How it works",
  description: "How PowerSave prices chores from your Ontario rate plan — method, example and sources.",
};

export default function HowItWorksRoutePage() {
  return <HowItWorksPage />;
}
