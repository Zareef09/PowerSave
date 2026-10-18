import type { Metadata } from "next";
import { ChoreDetailPage } from "@/components/app/ChoreDetailPage";

export const metadata: Metadata = {
  title: "Chore",
  description: "Detailed cheapest-start advice for one chore on your Ontario rate plan.",
};

export default async function ChoreRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChoreDetailPage choreId={id} />;
}
