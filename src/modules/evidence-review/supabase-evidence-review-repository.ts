import type {
  EvidenceCandidate,
  SourceLocator,
} from "@/modules/sources/source-types";

import type {
  CandidateReviewInput,
  EvidenceReviewRepository,
  PersistedEvidence,
} from "./evidence-review-repository";

type QueryResult = { data: unknown; error: { message: string } | null };
type SupabaseLike = {
  from(table: "evidence_candidates"): {
    select(): {
      eq(
        column: string,
        value: string,
      ): {
        eq(
          column: string,
          value: string,
        ): {
          maybeSingle(): Promise<QueryResult>;
        };
      };
    };
  };
  rpc(name: string, args: Record<string, unknown>): Promise<QueryResult>;
};

type CandidateRow = Record<string, unknown> & {
  id: string;
  organisation_id: string;
};
type EvidenceRow = Record<string, unknown> & {
  id: string;
  organisation_id: string;
};

function assertNoError(result: QueryResult) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function toCandidate(row: CandidateRow): EvidenceCandidate {
  return {
    id: row.id,
    organisationId: String(row.organisation_id),
    ingestionRunId: String(row.ingestion_run_id),
    sourceItemId: String(row.source_item_id),
    claimKey: String(row.claim_key),
    claim: String(row.claim),
    value: row.value,
    unit: (row.unit as string | null) ?? null,
    confidence: Number(row.confidence),
    locator: row.source_locator as SourceLocator,
    status: row.status as EvidenceCandidate["status"],
    createdAt: String(row.created_at),
  };
}

function toEvidence(row: EvidenceRow): PersistedEvidence {
  return {
    id: row.id,
    organisationId: String(row.organisation_id),
    sourceItemId: String(row.source_item_id),
    claimKey: String(row.claim_key),
    claim: String(row.claim),
    value: row.value,
    unit: (row.unit as string | null) ?? null,
    provenance: row.provenance as PersistedEvidence["provenance"],
    confidence: Number(row.confidence),
    locator: row.source_locator as SourceLocator,
    linkedEvidenceId: (row.linked_evidence_id as string | null) ?? null,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
  };
}

function assertTenant<T extends { organisationId: string }>(
  record: T,
  organisationId: string,
) {
  if (record.organisationId !== organisationId) {
    throw new Error("Evidence review tenant boundary violation");
  }
  return record;
}

function reviewPayload(input: CandidateReviewInput) {
  return {
    candidate_id: input.candidateId,
    decision: input.decision,
    rationale: input.rationale,
    edited_value: input.editedValue ?? null,
    evidence_id: input.evidenceId,
    edited_evidence_id: input.editedEvidenceId,
    reviewed_by: input.reviewedBy,
    reviewed_at: input.reviewedAt,
  };
}

export function createSupabaseEvidenceReviewRepository(
  client: SupabaseLike,
  organisationId: string,
  actorId: string,
): EvidenceReviewRepository {
  return {
    organisationId,
    async getCandidate(candidateId) {
      const result = await client
        .from("evidence_candidates")
        .select()
        .eq("organisation_id", organisationId)
        .eq("id", candidateId)
        .maybeSingle();
      const row = assertNoError(result) as CandidateRow | null;
      return row ? assertTenant(toCandidate(row), organisationId) : null;
    },
    async reviewCandidate(input) {
      const result = await client.rpc("review_evidence_candidate", {
        target_organisation_id: organisationId,
        actor_user_id: actorId,
        candidate_review: reviewPayload(input),
      });
      const data = assertNoError(result) as {
        candidate: CandidateRow;
        evidence: EvidenceRow | null;
      } | null;
      if (!data) return null;
      return {
        candidate: assertTenant(toCandidate(data.candidate), organisationId),
        evidence: data.evidence
          ? assertTenant(toEvidence(data.evidence), organisationId)
          : null,
      };
    },
  };
}
