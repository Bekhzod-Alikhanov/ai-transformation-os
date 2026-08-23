import { createHash } from "node:crypto";

export type OrganisationRole =
  "owner" | "admin" | "transformation_lead" | "analyst" | "approver" | "viewer";
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "executing"
  | "executed"
  | "rejected"
  | "expired"
  | "failed";

export type ApprovalRevision = {
  id: string;
  organisationId: string;
  revision: number;
  status: ApprovalStatus;
  actionType: string;
  payload: unknown;
  expiresAt: string;
};

function canonicalise(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalise(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export const ApprovalService = {
  decide(
    approval: ApprovalRevision,
    input: {
      actor: { id: string; organisationId: string; roles: OrganisationRole[] };
      revision: number;
      decision: "approve" | "reject";
      now: Date;
    },
  ) {
    if (approval.status !== "pending")
      throw new Error("Approval is no longer pending");
    if (approval.revision !== input.revision)
      throw new Error("Approval revision is stale");
    const canApprove = input.actor.roles.some((role) =>
      ["owner", "admin", "approver"].includes(role),
    );
    if (approval.organisationId !== input.actor.organisationId || !canApprove) {
      throw new Error("Actor cannot approve this action");
    }
    if (input.now.getTime() >= new Date(approval.expiresAt).getTime())
      throw new Error("Approval has expired");

    const payloadHash = createHash("sha256")
      .update(canonicalise(approval.payload))
      .digest("hex");
    return {
      approvalId: approval.id,
      revision: approval.revision,
      status:
        input.decision === "approve"
          ? ("executing" as const)
          : ("rejected" as const),
      payloadHash,
      idempotencyKey: `${approval.id}:${approval.revision}:${payloadHash}`,
      decidedBy: input.actor.id,
      decidedAt: input.now.toISOString(),
    };
  },
};
