import { LiveEmptyState } from "@/components/shell/live-empty-state";
import { SectionHeader } from "@/components/ui/surface";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { IntegrationsHub } from "@/modules/integrations/integrations-hub";

export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const workspace = await requireWorkspaceCapability("integrations");
  if (workspace.mode === "live")
    return (
      <LiveEmptyState
        description="No evidence-source connections have been configured for this organisation."
        eyebrow="Govern"
        title="No live integrations yet"
      />
    );
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Govern"
        title="Integrations"
        description="Connect evidence sources incrementally. Unconfigured extension adapters stay visibly disabled and never imply operational access."
      />
      <IntegrationsHub />
    </div>
  );
}
