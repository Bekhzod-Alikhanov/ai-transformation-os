import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { WorkspaceContext } from "@/modules/auth/workspace-context";

import type { MyWorkQueueCounts } from "./my-work-queues";

type CountQuery = {
  eq(column: string, value: string): CountQuery;
  in(column: string, values: string[]): CountQuery;
  lt(column: string, value: string): CountQuery;
  lte(column: string, value: string): CountQuery;
  is(column: string, value: null): CountQuery;
  then<TResult1 = { count: number | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { count: number | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
};
type CountClient = {
  from(table: string): {
    select(
      columns: string,
      options: { count: "exact"; head: true },
    ): CountQuery;
  };
};

async function count(query: CountQuery) {
  return (await query).count ?? 0;
}

export async function loadMyWorkQueueCounts(
  workspace: WorkspaceContext,
  actorId: string,
): Promise<MyWorkQueueCounts> {
  const client = createSupabaseServiceClient() as unknown as CountClient | null;
  if (!client) {
    return {
      sourceReviews: 0,
      candidateReviews: 0,
      opportunityDrafts: 0,
      failedRuns: 0,
      decisionsDue: 0,
      approvalsAssigned: 0,
    };
  }
  const options = { count: "exact" as const, head: true as const };
  const today = new Date().toISOString();
  const [
    sourceReviews,
    candidateReviews,
    opportunityDrafts,
    failedRuns,
    decisionsDue,
    approvalsAssigned,
  ] = await Promise.all([
    count(
      client
        .from("sources")
        .select("id", options)
        .eq("organisation_id", workspace.organisationId)
        .eq("status", "review_ready"),
    ),
    count(
      client
        .from("evidence_candidates")
        .select("id", options)
        .eq("organisation_id", workspace.organisationId)
        .in("status", ["pending", "conflicted"]),
    ),
    count(
      client
        .from("opportunity_drafts")
        .select("id", options)
        .eq("organisation_id", workspace.organisationId)
        .eq("status", "draft"),
    ),
    count(
      client
        .from("agent_runs")
        .select("id", options)
        .eq("organisation_id", workspace.organisationId)
        .eq("status", "failed"),
    ),
    count(
      client
        .from("decisions")
        .select("id", options)
        .eq("organisation_id", workspace.organisationId)
        .is("human_decision", null)
        .lte("follow_up_at", today),
    ),
    count(
      client
        .from("approvals")
        .select("id", options)
        .eq("organisation_id", workspace.organisationId)
        .eq("assigned_to", actorId)
        .eq("status", "pending"),
    ),
  ]);
  return {
    sourceReviews,
    candidateReviews,
    opportunityDrafts,
    failedRuns,
    decisionsDue,
    approvalsAssigned,
  };
}
