import { describe, expect, it } from "vitest";

import { createOpportunityDraftApiHandlers } from "./opportunity-draft-api";

describe("opportunity draft API", () => {
  it("rejects synthetic and unauthorised actors before mining", async () => {
    const handlers = createOpportunityDraftApiHandlers({
      resolveActor: async () => ({
        userId: "demo:1",
        synthetic: true,
        role: "owner",
      }),
      createService: () => ({
        mine: async () => ({}),
        transition: async () => ({}),
        update: async () => ({}),
      }),
    });

    expect((await handlers.mine()).status).toBe(403);
  });

  it("validates a persisted merge target and returns the authoritative result", async () => {
    const transitions: unknown[] = [];
    const handlers = createOpportunityDraftApiHandlers({
      resolveActor: async () => ({
        userId: "beck-1",
        synthetic: false,
        role: "analyst",
      }),
      createService: () => ({
        mine: async () => ({}),
        transition: async (input: unknown) => {
          transitions.push(input);
          return { id: "draft-1", status: "merged", version: 2 };
        },
        update: async () => ({}),
      }),
    });

    const response = await handlers.transition(
      "draft-1",
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({
          action: "merge",
          expectedVersion: 1,
          targetUseCaseId: "use-case-1",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(transitions).toEqual([
      {
        draftId: "draft-1",
        action: "merge",
        expectedVersion: 1,
        targetUseCaseId: "use-case-1",
      },
    ]);
  });

  it("rejects invalid edit evidence before calling the versioned draft editor", async () => {
    const handlers = createOpportunityDraftApiHandlers({
      resolveActor: async () => ({
        userId: "beck-1",
        synthetic: false,
        role: "analyst",
      }),
      createService: () => ({
        mine: async () => ({}),
        transition: async () => ({}),
        update: async () => ({ id: "draft-1", version: 2 }),
      }),
    });

    const response = await handlers.edit(
      "draft-1",
      new Request("http://local", {
        method: "PATCH",
        body: JSON.stringify({
          expectedVersion: 1,
          title: "Faster reporting",
          problemStatement: "Weekly reporting consumes eight hours.",
          businessUnit: "Finance",
          evidenceIds: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects a target attached to a reject transition before persistence", async () => {
    const handlers = createOpportunityDraftApiHandlers({
      resolveActor: async () => ({
        userId: "beck-1",
        synthetic: false,
        role: "analyst",
      }),
      createService: () => ({
        mine: async () => ({}),
        transition: async () => ({ id: "draft-1", status: "rejected" }),
        update: async () => ({}),
      }),
    });

    const response = await handlers.transition(
      "draft-1",
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({
          action: "reject",
          expectedVersion: 1,
          targetUseCaseId: "use-case-1",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
