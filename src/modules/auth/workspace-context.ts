import { z } from "zod";

import type { OrganisationRole } from "@/modules/approvals/approval-service";

const workspaceCapabilitySchema = z.enum([
  "overview",
  "opportunities",
  "processes",
  "portfolio",
  "decisions",
  "model_lab",
  "agent_blueprints",
  "pilots",
  "automations",
  "realised_value",
  "activity",
  "approvals",
  "integrations",
  "settings",
  "advanced_process_editing",
]);

export type WorkspaceCapability = z.infer<typeof workspaceCapabilitySchema>;

export const workspaceContextSchema = z
  .object({
    organisationId: z.string().min(1),
    mode: z.enum(["live", "synthetic_replay"]),
    displayName: z.string().min(1),
    role: z.enum([
      "owner",
      "admin",
      "transformation_lead",
      "analyst",
      "approver",
      "viewer",
    ]),
    capabilities: z.array(workspaceCapabilitySchema),
  })
  .strict();

export type WorkspaceContext = z.infer<typeof workspaceContextSchema>;

const liveCapabilities: WorkspaceCapability[] = [
  "overview",
  "opportunities",
  "processes",
  "portfolio",
  "decisions",
  "agent_blueprints",
  "activity",
  "approvals",
  "integrations",
  "settings",
];

const demoCapabilities: WorkspaceCapability[] = [
  ...liveCapabilities,
  "model_lab",
  "pilots",
  "automations",
  "realised_value",
  "advanced_process_editing",
];

export function workspaceContextForActor(actor: {
  userId: string;
  organisationId: string;
  displayName: string;
  role: OrganisationRole;
  synthetic: boolean;
}): WorkspaceContext {
  return workspaceContextSchema.parse({
    organisationId: actor.organisationId,
    mode: actor.synthetic ? "synthetic_replay" : "live",
    displayName: actor.displayName,
    role: actor.role,
    capabilities: actor.synthetic ? demoCapabilities : liveCapabilities,
  });
}

export function hasWorkspaceCapability(
  workspace: WorkspaceContext,
  capability: WorkspaceCapability,
) {
  return workspace.capabilities.includes(capability);
}
