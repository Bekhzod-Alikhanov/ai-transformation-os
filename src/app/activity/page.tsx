import { LiveEmptyState } from "@/components/shell/live-empty-state";
import { SectionHeader } from "@/components/ui/surface";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { ActivityFeed } from "@/modules/activity/activity-feed";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const workspace = await requireWorkspaceCapability("activity");
  if (workspace.mode === "live")
    return (
      <LiveEmptyState
        description="Organisation-scoped agent and audit events will appear after live workflows run."
        eyebrow="Measure"
        title="No live activity yet"
      />
    );
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Measure"
        title="Agent and audit activity"
        description="Inspect model use, latency, estimated cost, concise rationale, evidence links, approvals, and immutable execution receipts."
      />
      <ActivityFeed />
    </div>
  );
}
