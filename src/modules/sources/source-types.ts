import { z } from "zod";

export const sourceStatuses = [
  "awaiting_upload",
  "validating",
  "queued",
  "parsing",
  "requires_ocr",
  "extracting",
  "review_ready",
  "completed",
  "failed",
  "purged",
  "ready",
] as const;
export type SourceStatus = (typeof sourceStatuses)[number];

export const sourceLocatorSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pdf_page"), page: z.number().int().positive() }),
  z.object({ type: z.literal("docx_section"), section: z.string().min(1) }),
  z.object({
    type: z.literal("spreadsheet_cell"),
    sheet: z.string().min(1),
    range: z.string().regex(/^[A-Z]+\d+(?::[A-Z]+\d+)?$/),
  }),
  z.object({ type: z.literal("csv_row"), row: z.number().int().positive() }),
  z.object({
    type: z.literal("text_line"),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  }),
  z.object({ type: z.literal("email_thread"), threadId: z.string().min(1) }),
  z.object({ type: z.literal("calendar_event"), eventId: z.string().min(1) }),
]);
export type SourceLocator = z.infer<typeof sourceLocatorSchema>;

export type Source = {
  id: string;
  organisationId: string;
  kind:
    | "pdf"
    | "docx"
    | "xlsx"
    | "csv"
    | "text"
    | "markdown"
    | "gmail"
    | "calendar";
  name: string;
  synthetic: boolean;
  storagePath: string | null;
  status: SourceStatus;
  expectedSha256: string | null;
  expectedSizeBytes: number | null;
  expectedMimeType: string | null;
  actualSha256: string | null;
  actualSizeBytes: number | null;
  actualMimeType: string | null;
  acknowledgedInternalNonRegulated: boolean;
  aiProcessingConsent: boolean;
  consentedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
  failureCode: string | null;
};

export type SourceItem = {
  id: string;
  organisationId: string;
  sourceId: string;
  content: string | null;
  contentHash: string;
  locator: SourceLocator;
  createdAt: string;
};

export type IngestionRun = {
  id: string;
  organisationId: string;
  sourceId: string;
  status: "queued" | "running" | "requires_ocr" | "completed" | "failed";
  parserVersion: string;
  itemCount: number;
  errorCode: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type EvidenceCandidate = {
  id: string;
  organisationId: string;
  ingestionRunId: string;
  sourceItemId: string;
  claimKey: string;
  claim: string;
  value: unknown;
  unit: string | null;
  confidence: number;
  locator: SourceLocator;
  status: "pending" | "accepted" | "edited" | "rejected" | "conflicted";
  createdAt: string;
};

export type EvidenceReview = {
  id: string;
  organisationId: string;
  candidateId: string;
  decision: "accepted" | "edited" | "rejected";
  rationale: string;
  resultingEvidenceId: string | null;
  reviewedBy: string;
  reviewedAt: string;
};

export type ClaimConflict = {
  claimKey: string;
  organisationId: string;
  candidateIds: string[];
  status: "unresolved" | "resolved";
  resolvedByEvidenceId?: string;
};

export type OpportunityDraft = {
  id: string;
  organisationId: string;
  title: string;
  problemStatement: string;
  evidence: Array<{ evidenceId: string }>;
  status: "draft" | "merged" | "rejected" | "promoted";
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type AssumptionRevision = {
  id: string;
  organisationId: string;
  useCaseId: string;
  assumptionKey: string;
  value: unknown;
  unit: string | null;
  provenance:
    "observed" | "user_provided" | "ai_inferred" | "assumed" | "calculated";
  confidence: number;
  evidenceId: string | null;
  version: number;
  createdBy: string;
  createdAt: string;
};

export type AgentRun = {
  id: string;
  organisationId: string;
  runType: string;
  status:
    | "queued"
    | "running"
    | "requires_approval"
    | "completed"
    | "failed"
    | "cancelled";
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCost: number | null;
  startedAt: string | null;
  endedAt: string | null;
  errorCode: string | null;
};

export type AgentEvent = {
  id: string;
  organisationId: string;
  runId: string;
  sequence: number;
  eventType: string;
  summary: string;
  payload: unknown;
  occurredAt: string;
};

export type ProviderCredentialSummary = {
  id: string;
  organisationId: string;
  provider: string;
  status: "active" | "expired" | "revoked" | "error";
  secretSuffix: string;
  scopes: string[];
  expiresAt: string | null;
  updatedAt: string;
};

export type Approval = {
  id: string;
  organisationId: string;
  status:
    | "pending"
    | "approved"
    | "executing"
    | "executed"
    | "rejected"
    | "expired"
    | "failed";
  currentRevision: number;
  expiresAt: string;
};

export type ExecutionReceipt = {
  id: string;
  organisationId: string;
  operation: string;
  objectType: string;
  objectId: string;
  status: "succeeded" | "failed";
  idempotencyKey: string;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  organisationId: string;
  actorId: string | null;
  actorType: string;
  action: string;
  targetType: string;
  targetId: string;
  payloadHash: string | null;
  metadata: unknown;
  occurredAt: string;
};
