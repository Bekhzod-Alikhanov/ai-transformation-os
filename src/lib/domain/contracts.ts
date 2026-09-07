import { z } from "zod";

import type {
  ApprovalRevision,
  OrganisationRole,
} from "@/modules/approvals/approval-service";
import type {
  FinancialInput,
  FinancialResult,
} from "@/modules/economics/financial-engine";
import type { EvidenceRef } from "@/modules/evidence/evidence-ledger";
import type {
  OpportunityDimensions,
  PortfolioClassification,
  PortfolioWeights,
} from "@/modules/portfolio/portfolio-scorer";
import type {
  SimulationDistribution,
  SimulationInput,
} from "@/modules/simulation/simulation-engine";

export type {
  ApprovalRevision,
  EvidenceRef,
  FinancialInput,
  FinancialResult,
  OrganisationRole,
};
export type {
  OpportunityDimensions,
  PortfolioClassification,
  PortfolioWeights,
  SimulationDistribution,
  SimulationInput,
};

export const connectorCapabilities = [
  "read_messages",
  "create_draft",
  "send_message",
  "read_events",
  "create_event",
  "ingest_files",
] as const;
export type ConnectorCapability = (typeof connectorCapabilities)[number];

export type SyncCursor = {
  value: string;
  updatedAt: string;
  expiresAt?: string;
};

export type ExternalAction = {
  id: string;
  organisationId: string;
  type: string;
  payload: unknown;
  requestedBy: string;
  risk: "low" | "medium" | "high";
};

export interface ConnectorAdapter {
  id: string;
  capabilities: readonly ConnectorCapability[];
  sync(cursor?: SyncCursor): Promise<{ cursor: SyncCursor; items: unknown[] }>;
  propose(action: ExternalAction): Promise<ApprovalRevision>;
  execute(
    action: ExternalAction & { approvalId: string; payloadHash: string },
  ): Promise<{
    externalId: string;
    executedAt: string;
  }>;
}

export const commandIntentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("read_query"), query: z.string().min(1) }),
  z.object({
    kind: z.literal("temporary_scenario"),
    patch: z.record(z.string(), z.number()),
    label: z.string().min(1),
  }),
  z.object({
    kind: z.literal("persistent_scenario_change"),
    useCaseId: z.string().min(1),
    patch: z.record(z.string(), z.number()),
  }),
  z.object({
    kind: z.literal("draft_output"),
    outputType: z.string().min(1),
    subjectId: z.string(),
  }),
  z.object({
    kind: z.literal("external_action"),
    action: z.string().min(1),
    payload: z.unknown(),
  }),
]);
export type CommandIntent = z.infer<typeof commandIntentSchema>;

export const automationRecipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  when: z.discriminatedUnion("type", [
    z.object({ type: z.literal("schedule"), cron: z.string().min(5) }),
    z.object({ type: z.literal("event"), event: z.string().min(1) }),
  ]),
  conditions: z.array(
    z.object({
      field: z.string().min(1),
      operator: z.enum(["eq", "lt", "lte", "gt", "gte"]),
      value: z.unknown(),
    }),
  ),
  then: z.object({
    action: z.string().min(1),
    parameters: z.record(z.string(), z.unknown()),
  }),
  approval: z.enum(["none", "notify", "required"]),
});
export type AutomationRecipe = z.infer<typeof automationRecipeSchema>;

export type AgentDefinition<TOutput> = {
  id: string;
  name: string;
  instructions: string;
  model: string;
  reasoningEffort: "none" | "low" | "medium" | "high" | "xhigh" | "max";
  tools: string[];
  outputSchema: z.ZodType<TOutput>;
};

export type AgentRunResult<TOutput> = {
  runId: string;
  status: "completed" | "failed" | "requires_approval";
  output?: TOutput;
  evidence: EvidenceRef[];
  toolActivity: Array<{ tool: string; status: string; durationMs: number }>;
  usage: { inputTokens: number; outputTokens: number; estimatedCost: number };
};

export type ValueRecommendation =
  "scale" | "scale_with_conditions" | "fix" | "pause" | "stop";

export type {
  AgentEvent,
  AgentRun,
  Approval,
  AssumptionRevision,
  AuditEvent,
  ClaimConflict,
  EvidenceCandidate,
  EvidenceReview,
  ExecutionReceipt,
  IngestionRun,
  OpportunityDraft,
  ProviderCredentialSummary,
  Source,
  SourceItem,
  SourceLocator,
  SourceStatus,
} from "@/modules/sources/source-types";
