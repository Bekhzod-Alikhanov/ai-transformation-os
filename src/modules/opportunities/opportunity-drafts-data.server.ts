import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { WorkspaceContext } from "@/modules/auth/workspace-context";

import type {
  EligibleEvidenceView,
  OpportunityDraftView,
} from "./opportunity-drafts";

type Row = Record<string, unknown>;

export async function loadOpportunityDraftData(
  workspace: WorkspaceContext,
  actorId?: string,
) {
  const client = createSupabaseServiceClient();
  if (!client)
    return {
      drafts: [] as OpportunityDraftView[],
      useCases: [] as Array<{ id: string; title: string }>,
      eligibleEvidence: [] as EligibleEvidenceView[],
    };
  const database = client as unknown as {
    from(table: string): {
      select(columns: string): {
        eq(
          column: string,
          value: string,
        ): Promise<{ data: Row[] | null; error: unknown }>;
      };
    };
  };
  const [draftResult, useCaseResult] = await Promise.all([
    database
      .from("opportunity_drafts")
      .select(
        "id,title,problem_statement,business_unit,status,version,opportunity_draft_evidence(evidence_id)",
      )
      .eq("organisation_id", workspace.organisationId),
    database
      .from("use_cases")
      .select("id,title")
      .eq("organisation_id", workspace.organisationId),
  ]);
  const eligibleResult = actorId
    ? await (
        client as unknown as {
          rpc(
            name: string,
            args: Record<string, unknown>,
          ): Promise<{ data: Row[] | null; error: unknown }>;
        }
      ).rpc("eligible_opportunity_evidence", {
        target_organisation_id: workspace.organisationId,
        actor_user_id: actorId,
      })
    : { data: null, error: null };
  return {
    drafts:
      draftResult.error || !draftResult.data
        ? []
        : draftResult.data
            .filter((row) => row.status === "draft")
            .map((row) => ({
              id: String(row.id),
              title: String(row.title),
              problemStatement: String(row.problem_statement),
              businessUnit: (row.business_unit as string | null) ?? null,
              status: "draft" as const,
              version: Number(row.version),
              evidenceIds: Array.isArray(row.opportunity_draft_evidence)
                ? (row.opportunity_draft_evidence as Row[]).map((entry) =>
                    String(entry.evidence_id),
                  )
                : [],
            })),
    useCases:
      useCaseResult.error || !useCaseResult.data
        ? []
        : useCaseResult.data.map((row) => ({
            id: String(row.id),
            title: String(row.title),
          })),
    eligibleEvidence:
      eligibleResult.error || !eligibleResult.data
        ? []
        : eligibleResult.data.map((row) => ({
            id: String(row.id),
            claim: String(row.claim),
            sourceName: String(row.source_name ?? "Evidence source"),
          })),
  };
}
