import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const metadata: Metadata = {
  title: "Settings",
  description: "Plan, chores, quiet hours, theme and report a problem. Saved on this device.",
};

export default function SettingsRoutePage() {
  return <SettingsPage />;
}
