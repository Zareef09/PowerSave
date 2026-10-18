import type { Metadata } from "next";
import { TodayPage } from "@/components/app/TodayPage";

export const metadata: Metadata = {
  title: "Today",
  description:
    "Cheapest times to run laundry, the dishwasher or an EV today on your Ontario rate plan.",
};

export default function TodayRoutePage() {
  return <TodayPage />;
}
