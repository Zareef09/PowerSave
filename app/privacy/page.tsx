import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Coming soon — PowerSave privacy information.",
};

export default function PrivacyPage() {
  return <ComingSoon title="Privacy" />;
}
