import { LiveEmptyState } from "@/components/shell/live-empty-state";
import { SectionHeader } from "@/components/ui/surface";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { ApprovalCentre } from "@/modules/approvals/approval-centre";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const workspace = await requireWorkspaceCapability("approvals");
  if (workspace.mode === "live")
    return (
      <LiveEmptyState
        description="Organisation-scoped approval requests will appear when a governed action needs review."
        eyebrow="Govern"
        title="No live approvals yet"
      />
    );
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Govern"
        title="Approval centre"
        description="Review the exact immutable payload before any persistent or external action. Execution rechecks permission, policy, hash, expiry, and idempotency."
      />
      <ApprovalCentre />
    </div>
  );
}
