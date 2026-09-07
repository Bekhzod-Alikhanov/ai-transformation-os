import { LiveEmptyState } from "@/components/shell/live-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/surface";
import {
  hasWorkspaceCapability,
  type WorkspaceContext,
} from "@/modules/auth/workspace-context";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { ProcessTwin } from "@/modules/processes/process-twin";

export function ProcessPageContent({
  id,
  workspace,
}: {
  id: string;
  workspace: WorkspaceContext;
}) {
  if (workspace.mode === "live")
    return (
      <LiveEmptyState
        description="Process twins will appear after this organisation maps a live workflow."
        eyebrow="Discover · Process architect"
        title="No live process twin yet"
      />
    );
  const canEdit = hasWorkspaceCapability(workspace, "advanced_process_editing");

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Discover · Process architect"
        title="Client status reporting twin"
        description={`Paired current and future workflow for ${id}. Nodes preserve actors, systems, controls, cycle time, handoffs, and failure modes.`}
        action={
          canEdit ? (
            <div className="flex items-center gap-2">
              <Badge tone="condition">Demo only</Badge>
              <Button size="sm">Edit operational metrics</Button>
            </div>
          ) : undefined
        }
      />
      <div className="flex flex-wrap gap-2">
        <Badge tone="condition">Current · 490 min</Badge>
        <Badge tone="value">Future · 31 min</Badge>
        <Badge tone="action">Human approval retained</Badge>
      </div>
      <ProcessTwin />
    </div>
  );
}

export default async function ProcessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await requireWorkspaceCapability("processes");
  return <ProcessPageContent id={id} workspace={workspace} />;
}
