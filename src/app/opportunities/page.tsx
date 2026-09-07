import { redirect } from "next/navigation";

import { SectionHeader } from "@/components/ui/surface";
import { OpportunityActions } from "@/modules/opportunities/opportunity-actions";
import { loadOpportunityDraftData } from "@/modules/opportunities/opportunity-drafts-data.server";
import { OpportunityDrafts } from "@/modules/opportunities/opportunity-drafts";
import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { getRequestActor } from "@/modules/auth/request-actor";

export const metadata = { title: "Opportunities" };

export default async function OpportunitiesPage() {
  const workspace = await requireWorkspaceCapability("opportunities");
  if (workspace.mode === "live") {
    const actor = await getRequestActor();
    const data = await loadOpportunityDraftData(
      workspace,
      actor?.organisationId === workspace.organisationId
        ? actor.userId
        : undefined,
    );
    return (
      <div className="mx-auto max-w-[1080px] space-y-6 pb-16">
        <SectionHeader
          eyebrow="Discover"
          title="Opportunity intake"
          description="Mine accepted, conflict-safe evidence into editable drafts, then merge, reject, or promote each draft through persisted transitions."
          action={<OpportunityActions />}
        />
        <OpportunityDrafts {...data} />
      </div>
    );
  }
  redirect("/demo");
}
