import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Today",
  description: "Coming soon — guest chore advice still works on the landing page.",
};

export default function TodayPage() {
  return <ComingSoon title="Today" />;
}
