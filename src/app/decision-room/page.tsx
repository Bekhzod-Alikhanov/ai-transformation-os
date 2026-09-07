import { LiveEmptyState } from "@/components/shell/live-empty-state";
import { SectionHeader } from "@/components/ui/surface";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { DecisionRoom } from "@/modules/decisions/decision-room";

export const metadata = { title: "Decision Room" };

export default async function DecisionRoomPage() {
  const workspace = await requireWorkspaceCapability("decisions");
  if (workspace.mode === "live")
    return (
      <LiveEmptyState
        description="Decision cases will appear when this organisation advances an opportunity for review."
        eyebrow="Decide"
        title="No live decisions yet"
      />
    );
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-16">
      <SectionHeader
        eyebrow="Decide"
        title="Decision Room"
        description="Challenge the business case, inspect specialist objections, test temporary scenarios, and record policy-constrained executive decisions."
      />
      <DecisionRoom />
    </div>
  );
}
