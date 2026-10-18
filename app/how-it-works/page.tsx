import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "How it works",
  description: "Coming soon — how PowerSave prices chores from your Ontario rate plan.",
};

export default function HowItWorksPage() {
  return <ComingSoon title="How it works" />;
}
