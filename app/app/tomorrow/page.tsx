import type { Metadata } from "next";
import { TomorrowPage } from "@/components/app/TomorrowPage";

export const metadata: Metadata = {
  title: "Tomorrow",
  description: "Plan tomorrow’s cheapest chore windows on your Ontario rate plan.",
};

export default function TomorrowRoutePage() {
  return <TomorrowPage />;
}
