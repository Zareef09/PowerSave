import type { Metadata } from "next";
import { PlanPage } from "@/components/info/PlanPage";

export const metadata: Metadata = {
  title: "Plans",
  description: "TOU, ULO and Tiered Ontario rate plans — rates in force today and coming Nov 1 2026.",
};

export default function PlanRoutePage() {
  return <PlanPage />;
}
