import type { Metadata } from "next";
import { PrivacyPage } from "@/components/info/PrivacyPage";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What PowerSave stores today: guest data in your browser, no accounts, no analytics, no cookies.",
};

export default function PrivacyRoutePage() {
  return <PrivacyPage />;
}
