import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = {
  title: "Chore detail",
  description: "Coming soon — guest chore advice still works on the landing page.",
};

export default function ChorePage() {
  return <ComingSoon title="Chore detail" />;
}
