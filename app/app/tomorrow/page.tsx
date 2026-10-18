import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Tomorrow",
  description: "Coming soon — tomorrow’s cheapest chore windows.",
};

export default function TomorrowPage() {
  return <ComingSoon title="Tomorrow" />;
}
