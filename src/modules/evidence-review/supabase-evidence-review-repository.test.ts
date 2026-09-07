import { describe, expect, it } from "vitest";

import { createSupabaseEvidenceReviewRepository } from "./supabase-evidence-review-repository";

const organisationId = "organisation-1";

describe("SupabaseEvidenceReviewRepository", () => {
  it("binds candidate reads and immutable review writes to the repository organisation", async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "candidate-1",
                  organisation_id: organisationId,
                  ingestion_run_id: "run-1",
                  source_item_id: "item-1",
                  claim_key: "reporting.cycle_time_hours",
                  claim: "Weekly reporting takes eight hours.",
                  value: 8,
                  unit: "hours",
                  confidence: 0.86,
                  source_locator: {
                    type: "text_line",
                    startLine: 4,
                    endLine: 4,
                  },
                  status: "pending",
                  created_at: "2026-08-29T12:00:00.000Z",
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return {
          data: {
            candidate: {
              id: "candidate-1",
              organisation_id: organisationId,
              ingestion_run_id: "run-1",
              source_item_id: "item-1",
              claim_key: "reporting.cycle_time_hours",
              claim: "Weekly reporting takes eight hours.",
              value: 8,
              unit: "hours",
              confidence: 0.86,
              source_locator: {
                type: "text_line",
                startLine: 4,
                endLine: 4,
              },
              status: "accepted",
              created_at: "2026-08-29T12:00:00.000Z",
            },
            evidence: {
              id: "evidence-1",
              organisation_id: organisationId,
              source_item_id: "item-1",
              claim_key: "reporting.cycle_time_hours",
              claim: "Weekly reporting takes eight hours.",
              value: 8,
              unit: "hours",
              provenance: "ai_inferred",
              confidence: 0.86,
              source_locator: {
                type: "text_line",
                startLine: 4,
                endLine: 4,
              },
              created_by: "beck-1",
              created_at: "2026-08-29T12:30:00.000Z",
            },
          },
          error: null,
        };
      },
    };
    const repository = createSupabaseEvidenceReviewRepository(
      client,
      organisationId,
      "beck-1",
    );

    await expect(repository.getCandidate("candidate-1")).resolves.toMatchObject(
      {
        organisationId,
        status: "pending",
      },
    );
    await expect(
      repository.reviewCandidate({
        candidateId: "candidate-1",
        decision: "accepted",
        rationale: "Matches the baseline.",
        evidenceId: "evidence-1",
        editedEvidenceId: null,
        reviewedBy: "beck-1",
        reviewedAt: "2026-08-29T12:30:00.000Z",
      }),
    ).resolves.toMatchObject({
      candidate: { organisationId, status: "accepted" },
      evidence: { organisationId, provenance: "ai_inferred" },
    });
    expect(calls).toEqual([
      {
        name: "review_evidence_candidate",
        args: {
          target_organisation_id: organisationId,
          actor_user_id: "beck-1",
          candidate_review: {
            candidate_id: "candidate-1",
            decision: "accepted",
            rationale: "Matches the baseline.",
            edited_value: null,
            evidence_id: "evidence-1",
            edited_evidence_id: null,
            reviewed_by: "beck-1",
            reviewed_at: "2026-08-29T12:30:00.000Z",
          },
        },
      },
    ]);
  });
});
