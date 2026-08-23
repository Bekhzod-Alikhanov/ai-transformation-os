import { notFound } from "next/navigation";

import { opportunities } from "@/modules/demo/aster-data";
import { UseCaseWorkspace } from "@/modules/use-cases/use-case-workspace";

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!opportunities.some((item) => item.id === id)) notFound();
  return <UseCaseWorkspace useCaseId={id} />;
}
