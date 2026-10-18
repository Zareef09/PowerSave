import type { Metadata } from "next";
import { GridPage } from "@/components/grid/GridPage";

export const metadata: Metadata = {
  title: "The Grid",
  description:
    "Live Ontario wholesale market price from IESO public reports. Not what you pay on your bill.",
};

export default function GridRoutePage() {
  return <GridPage />;
}
