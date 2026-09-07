import { describe, expect, it } from "vitest";

import { createEvidenceReviewApiHandlers } from "./evidence-review-api";

describe("evidence review API", () => {
  it("requires an actor and forwards a validated persisted review request", async () => {
    const reviewed: unknown[] = [];
    const handlers = createEvidenceReviewApiHandlers({
      resolveActor: async () => ({ userId: "beck-1" }),
      createService: () => ({
        review: async (input: unknown) => {
          reviewed.push(input);
          return { candidate: { id: "candidate-1" }, evidence: null };
        },
      }),
    });

    const response = await handlers.review(
      "candidate-1",
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({
          decision: "rejected",
          rationale: "Exception record.",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(reviewed).toEqual([
      {
        candidateId: "candidate-1",
        decision: "rejected",
        rationale: "Exception record.",
      },
    ]);
  });

  it("rejects malformed reviews before they reach the service", async () => {
    const handlers = createEvidenceReviewApiHandlers({
      resolveActor: async () => ({ userId: "beck-1" }),
      createService: () => ({ review: async () => ({}) }),
    });

    const response = await handlers.review(
      "candidate-1",
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({ decision: "edited", rationale: "" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("denies viewer, approver, and synthetic actors before a privileged review transition", async () => {
    for (const actor of [
      { userId: "viewer", role: "viewer" },
      { userId: "approver", role: "approver" },
      { userId: "demo", role: "owner", synthetic: true },
    ]) {
      const handlers = createEvidenceReviewApiHandlers({
        resolveActor: async () => actor,
        createService: () => ({ review: async () => ({}) }),
      });
      expect(
        (
          await handlers.review(
            "candidate-1",
            new Request("http://local", {
              method: "POST",
              body: JSON.stringify({
                decision: "accepted",
                rationale: "Reviewed.",
              }),
            }),
          )
        ).status,
      ).toBe(403);
    }
  });
});
