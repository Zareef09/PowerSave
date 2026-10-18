import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "PowerSave — Run it when it’s cheap",
  description:
    "Free Ontario tool that tells households the cheapest time to run laundry, the dishwasher or an EV based on their rate plan.",
};

export default function HomePage() {
  return <LandingPage />;
}
