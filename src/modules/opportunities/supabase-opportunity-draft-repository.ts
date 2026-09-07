import type {
  CreateOpportunityDraft,
  EligibleOpportunityEvidence,
  OpportunityDraftRecord,
  OpportunityDraftRepository,
} from "./opportunity-draft-service";

type SupabaseLike = {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
};

type DraftRow = Record<string, unknown>;

function unwrap(result: { data: unknown; error: { message: string } | null }) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function draftFromRow(row: DraftRow): OpportunityDraftRecord {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    title: String(row.title),
    problemStatement: String(row.problem_statement),
    businessUnit: (row.business_unit as string | null) ?? null,
    evidenceIds: Array.isArray(row.evidence_ids)
      ? row.evidence_ids.map(String)
      : [],
    status: row.status as OpportunityDraftRecord["status"],
    version: Number(row.version),
    createdBy: String(row.created_by),
    targetUseCaseId: (row.promoted_use_case_id as string | null) ?? null,
  };
}

function assertTenant(draft: OpportunityDraftRecord, organisationId: string) {
  if (draft.organisationId !== organisationId) {
    throw new Error("Opportunity draft tenant boundary violation");
  }
  return draft;
}

export function createSupabaseOpportunityDraftRepository(
  client: SupabaseLike,
  organisationId: string,
  actorId: string,
): OpportunityDraftRepository {
  return {
    organisationId,
    async loadEligibleEvidence() {
      const data = unwrap(
        await client.rpc("eligible_opportunity_evidence", {
          target_organisation_id: organisationId,
          actor_user_id: actorId,
        }),
      );
      if (!Array.isArray(data)) return [];
      return data.map((row) => {
        const item = row as Record<string, unknown>;
        return {
          id: String(item.id),
          organisationId: String(item.organisation_id),
          claimKey: String(item.claim_key),
          claim: String(item.claim),
          value: item.value,
          sourceName: String(item.source_name ?? "Evidence source"),
        } satisfies EligibleOpportunityEvidence;
      });
    },
    async createDraft(input: CreateOpportunityDraft) {
      const data = unwrap(
        await client.rpc("create_opportunity_draft", {
          target_organisation_id: organisationId,
          actor_user_id: actorId,
          draft_payload: {
            id: input.id,
            title: input.title,
            problem_statement: input.problemStatement,
            business_unit: input.businessUnit,
            evidence_ids: input.evidenceIds,
            created_by: input.createdBy,
          },
        }),
      );
      return assertTenant(draftFromRow(data as DraftRow), organisationId);
    },
    async transitionDraft(input) {
      const data = unwrap(
        await client.rpc("transition_opportunity_draft", {
          target_organisation_id: organisationId,
          actor_user_id: actorId,
          target_draft_id: input.draftId,
          expected_version: input.expectedVersion,
          next_status:
            input.action === "reject"
              ? "rejected"
              : input.action === "merge"
                ? "merged"
                : "promoted",
          target_use_case_id: input.targetUseCaseId ?? null,
        }),
      );
      return data
        ? assertTenant(draftFromRow(data as DraftRow), organisationId)
        : null;
    },
    async updateDraft(input) {
      const data = unwrap(
        await client.rpc("edit_opportunity_draft", {
          target_organisation_id: organisationId,
          actor_user_id: actorId,
          target_draft_id: input.draftId,
          expected_version: input.expectedVersion,
          draft_payload: {
            title: input.title,
            problem_statement: input.problemStatement,
            business_unit: input.businessUnit,
            evidence_ids: input.evidenceIds,
          },
        }),
      );
      return data
        ? assertTenant(draftFromRow(data as DraftRow), organisationId)
        : null;
    },
  };
}
