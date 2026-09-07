import { describe, expect, it } from "vitest";

import { createSupabaseOpportunityDraftRepository } from "./supabase-opportunity-draft-repository";

describe("Supabase opportunity drafts", () => {
  it("passes the actor and organisation only through trusted opportunity RPCs", async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const repository = createSupabaseOpportunityDraftRepository(
      {
        rpc: async (name, args) => {
          calls.push({ name, args });
          return {
            data: {
              id: "draft-1",
              organisation_id: "organisation-1",
              title: "Cycle opportunity",
              problem_statement: "Cycle is slow",
              business_unit: "Operations",
              evidence_ids: ["evidence-1"],
              status: "draft",
              version: 1,
              created_by: "beck-1",
            },
            error: null,
          };
        },
      },
      "organisation-1",
      "beck-1",
    );

    await repository.createDraft({
      id: "draft-1",
      organisationId: "organisation-1",
      title: "Cycle opportunity",
      problemStatement: "Cycle is slow",
      businessUnit: "Operations",
      evidenceIds: ["evidence-1"],
      createdBy: "beck-1",
    });

    expect(calls).toEqual([
      {
        name: "create_opportunity_draft",
        args: expect.objectContaining({
          target_organisation_id: "organisation-1",
          actor_user_id: "beck-1",
        }),
      },
    ]);
  });

  it("sends versioned edit fields and selected evidence through the trusted edit RPC", async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const repository = createSupabaseOpportunityDraftRepository(
      {
        rpc: async (name, args) => {
          calls.push({ name, args });
          return {
            data: {
              id: "draft-1",
              organisation_id: "organisation-1",
              title: "Faster reporting",
              problem_statement: "Weekly reporting consumes eight hours.",
              business_unit: "Finance",
              evidence_ids: ["evidence-safe"],
              status: "draft",
              version: 2,
              created_by: "beck-1",
            },
            error: null,
          };
        },
      },
      "organisation-1",
      "beck-1",
    );

    await repository.updateDraft({
      draftId: "draft-1",
      expectedVersion: 1,
      title: "Faster reporting",
      problemStatement: "Weekly reporting consumes eight hours.",
      businessUnit: "Finance",
      evidenceIds: ["evidence-safe"],
      actorId: "beck-1",
    });

    expect(calls).toEqual([
      {
        name: "edit_opportunity_draft",
        args: {
          target_organisation_id: "organisation-1",
          actor_user_id: "beck-1",
          target_draft_id: "draft-1",
          expected_version: 1,
          draft_payload: {
            title: "Faster reporting",
            problem_statement: "Weekly reporting consumes eight hours.",
            business_unit: "Finance",
            evidence_ids: ["evidence-safe"],
          },
        },
      },
    ]);
  });
});
