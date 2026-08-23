import { describe, expect, it } from "vitest";

import { ApprovalService } from "./approval-service";

const pendingApproval = {
  id: "approval-1",
  organisationId: "org-aster",
  revision: 3,
  status: "pending" as const,
  actionType: "gmail.create_draft",
  payload: {
    to: ["pilot@aster.example"],
    subject: "Pilot kickoff",
    body: "Approved copy",
  },
  expiresAt: "2030-01-01T00:00:00.000Z",
};

describe("ApprovalService", () => {
  it("rejects stale approval revisions before any action can execute", () => {
    expect(() =>
      ApprovalService.decide(pendingApproval, {
        actor: {
          id: "user-1",
          organisationId: "org-aster",
          roles: ["approver"],
        },
        revision: 2,
        decision: "approve",
        now: new Date("2029-01-01T00:00:00.000Z"),
      }),
    ).toThrow("Approval revision is stale");
  });

  it("requires an approver in the same organisation", () => {
    expect(() =>
      ApprovalService.decide(pendingApproval, {
        actor: {
          id: "user-1",
          organisationId: "other-org",
          roles: ["approver"],
        },
        revision: 3,
        decision: "approve",
        now: new Date("2029-01-01T00:00:00.000Z"),
      }),
    ).toThrow("Actor cannot approve this action");
  });

  it("creates a stable execution receipt for the exact approved payload", () => {
    const first = ApprovalService.decide(pendingApproval, {
      actor: { id: "user-1", organisationId: "org-aster", roles: ["approver"] },
      revision: 3,
      decision: "approve",
      now: new Date("2029-01-01T00:00:00.000Z"),
    });
    const second = ApprovalService.decide(pendingApproval, {
      actor: { id: "user-1", organisationId: "org-aster", roles: ["approver"] },
      revision: 3,
      decision: "approve",
      now: new Date("2029-01-01T00:00:00.000Z"),
    });

    expect(first.status).toBe("executing");
    expect(first.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.idempotencyKey).toBe(second.idempotencyKey);
  });
});
