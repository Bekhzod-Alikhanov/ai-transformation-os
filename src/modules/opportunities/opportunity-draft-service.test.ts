import { describe, expect, it } from "vitest";

import {
  OpportunityDraftService,
  type OpportunityDraftRepository,
} from "./opportunity-draft-service";

const organisationId = "organisation-1";
const actorId = "beck-1";

function repository(
  overrides: Partial<OpportunityDraftRepository> = {},
): OpportunityDraftRepository {
  return {
    organisationId,
    loadEligibleEvidence: async () => [
      {
        id: "evidence-safe",
        organisationId,
        claimKey: "ops.cycle-time",
        claim: "Weekly reporting takes eight hours.",
        value: "8 hours",
        sourceName: "Operations baseline.txt",
      },
      {
        id: "evidence-conflict",
        organisationId,
        claimKey: "ops.cycle-time",
        claim: "Weekly reporting takes six hours.",
        value: "6 hours",
        sourceName: "Legacy workbook.xlsx",
      },
    ],
    createDraft: async (input) => ({
      ...input,
      id: "draft-1",
      status: "draft",
      version: 1,
    }),
    transitionDraft: async () => null,
    updateDraft: async () => null,
    ...overrides,
  };
}

describe("OpportunityDraftService", () => {
  it("mines only accepted conflict-safe evidence into an editable persisted draft", async () => {
    const created: unknown[] = [];
    const service = new OpportunityDraftService({
      organisationId,
      actorId,
      repository: repository({
        loadEligibleEvidence: async () => [
          {
            id: "evidence-safe",
            organisationId,
            claimKey: "ops.cycle-time",
            claim: "Weekly reporting takes eight hours.",
            value: "8 hours",
            sourceName: "Operations baseline.txt",
          },
        ],
        createDraft: async (input) => {
          created.push(input);
          return { ...input, id: "draft-1", status: "draft", version: 1 };
        },
      }),
      id: () => "draft-1",
    });

    const draft = await service.mine();

    expect(draft).toMatchObject({
      id: "draft-1",
      organisationId,
      status: "draft",
      version: 1,
      evidenceIds: ["evidence-safe"],
    });
    expect(created).toEqual([
      expect.objectContaining({
        organisationId,
        createdBy: actorId,
        evidenceIds: ["evidence-safe"],
      }),
    ]);
  });

  it("requires a merge target and returns the persisted optimistic transition", async () => {
    const service = new OpportunityDraftService({
      organisationId,
      actorId,
      repository: repository({
        transitionDraft: async (input) => ({
          id: input.draftId,
          organisationId,
          title: "Reporting cycle-time reduction",
          problemStatement: "Weekly reporting takes eight hours.",
          businessUnit: "Operations",
          evidenceIds: ["evidence-safe"],
          status: "merged",
          version: 2,
          createdBy: actorId,
          targetUseCaseId: input.targetUseCaseId,
        }),
      }),
    });

    await expect(
      service.transition({
        draftId: "draft-1",
        expectedVersion: 1,
        action: "merge",
      }),
    ).rejects.toThrow("Merge requires a target use case");

    await expect(
      service.transition({
        draftId: "draft-1",
        expectedVersion: 1,
        action: "merge",
        targetUseCaseId: "use-case-1",
      }),
    ).resolves.toMatchObject({
      status: "merged",
      version: 2,
      targetUseCaseId: "use-case-1",
    });
  });

  it("rejects a transition that attempts to carry a merge target", async () => {
    const service = new OpportunityDraftService({
      organisationId,
      actorId,
      repository: repository(),
    });

    await expect(
      service.transition({
        draftId: "draft-1",
        expectedVersion: 1,
        action: "reject",
        targetUseCaseId: "use-case-1",
      }),
    ).rejects.toThrow("Rejected drafts cannot have a target use case");
  });

  it("persists a versioned draft edit with only conflict-safe selected evidence", async () => {
    const edits: unknown[] = [];
    const service = new OpportunityDraftService({
      organisationId,
      actorId,
      repository: repository({
        updateDraft: async (input) => {
          edits.push(input);
          return {
            id: input.draftId,
            organisationId,
            title: input.title,
            problemStatement: input.problemStatement,
            businessUnit: input.businessUnit,
            evidenceIds: input.evidenceIds,
            status: "draft",
            version: 2,
            createdBy: actorId,
          };
        },
      }),
    });

    await expect(
      service.update({
        draftId: "draft-1",
        expectedVersion: 1,
        title: "Faster reporting",
        problemStatement: "Weekly reporting consumes eight hours.",
        businessUnit: "Finance",
        evidenceIds: ["evidence-safe"],
      }),
    ).resolves.toMatchObject({ version: 2, businessUnit: "Finance" });
    expect(edits).toEqual([
      expect.objectContaining({
        actorId,
        expectedVersion: 1,
        evidenceIds: ["evidence-safe"],
      }),
    ]);
  });
});
