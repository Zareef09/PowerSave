import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Plans",
  description: "Coming soon — TOU, ULO and Tiered Ontario rate plans.",
};

export default function PlanPage() {
  return <ComingSoon title="Plans" />;
}
