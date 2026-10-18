import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Find your cheapest time",
  description: "Coming soon — guest advice on the landing page still works without an account.",
};

export default function StartPage() {
  return <ComingSoon title="Find your cheapest time" />;
}
