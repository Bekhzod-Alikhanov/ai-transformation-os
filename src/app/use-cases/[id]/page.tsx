import { notFound } from "next/navigation";

import { LiveEmptyState } from "@/components/shell/live-empty-state";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { opportunities } from "@/modules/demo/aster-data";
import { UseCaseWorkspace } from "@/modules/use-cases/use-case-workspace";

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await requireWorkspaceCapability("agent_blueprints");
  if (workspace.mode === "live")
    return (
      <LiveEmptyState
        description="Agent blueprints will appear after this organisation develops a live use case."
        eyebrow="Design"
        title="No live agent blueprint yet"
      />
    );
  if (!opportunities.some((item) => item.id === id)) notFound();
  return <UseCaseWorkspace useCaseId={id} />;
}
