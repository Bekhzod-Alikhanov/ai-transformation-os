import type { OrganisationRole } from "./approval-service";

export type ActionKind =
  | "read_query"
  | "temporary_scenario"
  | "persistent_scenario_change"
  | "draft_output"
  | "external_action";

export type PolicyDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  requiredRoles: OrganisationRole[];
  reason: string;
};

export const ActionPolicy = {
  evaluate(
    proposal: { kind: ActionKind; risk: "low" | "medium" | "high" },
    actor: { roles: OrganisationRole[] },
  ): PolicyDecision {
    if (actor.roles.every((role) => role === "viewer"))
      return {
        allowed: false,
        requiresApproval: false,
        requiredRoles: [],
        reason: "Viewers cannot propose actions",
      };
    if (
      proposal.risk === "high" &&
      actor.roles.every(
        (role) => !["owner", "admin", "transformation_lead"].includes(role),
      )
    )
      return {
        allowed: false,
        requiresApproval: false,
        requiredRoles: ["owner", "admin", "transformation_lead"],
        reason: "High-risk proposals require a transformation lead",
      };
    if (proposal.kind === "external_action")
      return {
        allowed: true,
        requiresApproval: true,
        requiredRoles: ["owner", "admin", "approver"],
        reason: "External actions require explicit approval",
      };
    if (proposal.kind === "persistent_scenario_change")
      return {
        allowed: true,
        requiresApproval: true,
        requiredRoles: ["owner", "admin", "approver"],
        reason: "Persistent scenario changes require explicit approval",
      };
    if (proposal.kind === "draft_output")
      return {
        allowed: true,
        requiresApproval: false,
        requiredRoles: [],
        reason: "Drafts may be generated without external effect",
      };
    return {
      allowed: true,
      requiresApproval: false,
      requiredRoles: [],
      reason: "Read-only and temporary operations are permitted",
    };
  },
};
