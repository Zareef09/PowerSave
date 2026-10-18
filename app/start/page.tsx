import type { Metadata } from "next";
import { StartPage } from "@/components/start/StartPage";

export const metadata: Metadata = {
  title: "Get started",
  description: "Pick your Ontario rate plan, chores and preferences. Guest setup — no account required.",
};

export default function StartRoutePage() {
  return <StartPage />;
}
