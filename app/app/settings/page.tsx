import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Settings",
  description: "Coming soon — plan and preferences stay on this device for now.",
};

export default function SettingsPage() {
  return <ComingSoon title="Settings" />;
}
