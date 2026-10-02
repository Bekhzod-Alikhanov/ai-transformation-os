import { z } from "zod";

const id = z.string().min(1);
const number = z.number().finite().nonnegative();
const fraction = number.max(1);
const revision = z.number().int().nonnegative();
export const dateSchema = z.union([z.literal(""), z.iso.date()]);
export const currencySchema = z.enum(["USD", "GBP", "EUR"]);
export const labourInputsSchema = z.object({
  annualVolume: number.nullable(),
  minutesBefore: number.nullable(),
  reduction: fraction.nullable(),
  reviewMinutes: number.nullable(),
  adoption: fraction.nullable(),
  hourlyCost: number.nullable(),
  realisation: fraction.nullable(),
  cashShare: fraction.nullable(),
  productiveHours: number.positive().nullable(),
  rampMonths: number.int().max(12).nullable(),
  discountRate: fraction.nullable(),
});
export const costLineSchema = z
  .object({
    id,
    name: z.string(),
    category: z.enum([
      "discovery",
      "data",
      "implementation",
      "change",
      "technology",
      "operations",
      "review",
      "other",
    ]),
    amount: number.nullable(),
    frequency: z.enum(["one_time", "monthly", "annual"]),
    startMonth: number.int().max(36),
    endMonth: number.int().max(36),
    accounting: z.enum(["unclassified", "capex", "opex"]),
  })
  .refine((v) => v.endMonth >= v.startMonth, {
    message: "End month precedes start month",
    path: ["endMonth"],
  });
export const benefitLineSchema = z.object({
  id,
  name: z.string(),
  kind: z.enum(["quality", "revenue"]),
  annualAmount: number.nullable(),
  pool: z.string().min(1),
  cashShare: fraction,
  enabled: z.boolean(),
  overlapResolved: z.boolean(),
  mechanism: z.string(),
});
export const evidenceSchema = z.object({
  id,
  title: z.string(),
  excerpt: z.string(),
  source: z.string(),
  locator: z.string(),
  date: dateSchema,
  status: z.enum(["missing", "pending", "conflicted", "accepted", "rejected"]),
  reviewRationale: z.string(),
  reviewedAt: z.union([z.literal(""), z.iso.datetime()]),
  version: revision,
  internalNote: z.string(),
});
export const evidenceRequestSchema = z.object({
  id,
  question: z.string(),
  owner: z.string(),
  impact: z.string(),
  status: z.enum(["open", "closed"]),
});
export const assumptionRevisionSchema = z.object({
  id,
  optionId: id,
  field: z.string(),
  value: z.number().finite().nullable(),
  unit: z.string(),
  provenance: z.enum(["assumed", "user_provided", "calculated"]),
  confidence: z.enum(["low", "medium", "high"]),
  evidenceIds: z.array(id),
  owner: z.string(),
  version: revision,
  at: z.iso.datetime(),
  material: z.boolean(),
});
export const processStepSchema = z.object({
  id,
  state: z.enum(["current", "future"]),
  name: z.string(),
  actor: z.string(),
  annualVolume: number.nullable(),
  minutes: number.nullable(),
  exceptions: z.string(),
  review: z.string(),
});
export const validationPlanSchema = z.object({
  hypotheses: z.string(),
  baseline: z.string(),
  thresholds: z.string(),
  method: z.string(),
  owner: z.string(),
  budgetCeiling: number.nullable(),
  controls: z.string(),
  stopCriteria: z.string(),
});
export const scenarioSchema = z.object({
  id,
  name: z.string(),
  inputPatch: labourInputsSchema.partial(),
  costMultiplier: number,
  benefitMultiplier: number,
});
export const triangularRangeSchema = z
  .object({ min: number, mode: number, max: number })
  .refine(
    (r) => r.min <= r.mode && r.mode <= r.max,
    "Range must satisfy min <= mode <= max",
  );
export const simulationSummarySchema = z.object({
  modelVersion: z.enum(["assessment-v2.1", "assessment-v3.0"]),
  seed: z.number().int(),
  inputRevision: revision,
  draws: z.literal(10000),
  p10: z.number().finite(),
  p50: z.number().finite(),
  p90: z.number().finite(),
  histogram: z.array(
    z.object({
      min: z.number().finite(),
      max: z.number().finite(),
      count: revision,
    }),
  ),
  paybackProbability: fraction,
  methodology: z.string(),
  ranges: z.object({
    adoption: triangularRangeSchema.refine((r) => r.max <= 1),
    reduction: triangularRangeSchema.refine((r) => r.max <= 1),
    costMultiplier: triangularRangeSchema,
  }),
});
export const taskRowSchema = z.object({
  id,
  baselineKey: id.optional(),
  name: z.string(),
  annualVolume: number.nullable(),
  currentMinutes: number.nullable(),
  eligible: fraction.nullable(),
  responsibility: z.enum(["human", "automation", "agent"]),
  remainingMinutes: number.nullable(),
  reviewMinutes: number.nullable(),
  exceptionRate: fraction.nullable(),
  exceptionMinutes: number.nullable(),
  evidenceIds: z.array(id),
  assumed: z.boolean(),
});
export const workshopQuestionSchema = z.object({
  id,
  area: z.enum([
    "workload",
    "variation",
    "data",
    "quality",
    "controls",
    "adoption",
    "value",
  ]),
  question: z.string(),
  answer: z.string(),
  owner: z.string(),
  evidenceIds: z.array(id),
  unresolved: z.boolean(),
});
export const evaluationRunSchema = z.object({
  id,
  optionId: id,
  datasetVersion: z.string(),
  at: z.iso.datetime(),
  inputRevision: revision,
  mode: z.enum(["synthetic_replay", "local_rules"]),
  cases: z.array(
    z.object({
      id,
      input: z.string(),
      expected: z.string(),
      output: z.string(),
      correct: z.boolean(),
      supported: z.boolean(),
      escalated: z.boolean(),
      requiredEscalation: z.boolean(),
      control: z.string(),
      sourceRefs: z.array(z.string()),
      events: z.array(z.object({ stage: z.string(), detail: z.string() })),
    }),
  ),
});
export const solutionOptionSchema = z.object({
  id,
  name: z.string(),
  kind: z.enum(["bau", "rules", "assistance", "automation"]),
  inputs: labourInputsSchema,
  cashMechanism: z.string(),
  reviewAllocation: z.string(),
  costs: z.array(costLineSchema),
  benefits: z.array(benefitLineSchema),
  scenarios: z.array(scenarioSchema),
  simulation: simulationSummarySchema.nullable(),
  taskPlan: z
    .object({
      rows: z.array(taskRowSchema).min(1),
      referenceReduction: fraction.optional(),
    })
    .nullable()
    .optional(),
  readiness: z
    .object({
      data: z.enum(["unknown", "ready", "concern"]),
      technical: z.enum(["unknown", "ready", "concern"]),
      controlsOpen: z.boolean(),
      validationRequired: z.boolean(),
      evaluationDataset: z
        .enum([
          "support-fixtures-v1",
          "reporting-rules-v1",
          "reporting-narrative-fixtures-v1",
        ])
        .optional(),
    })
    .optional(),
});
export const outcomeSchema = z.enum([
  "Investigate",
  "Validate through pilot",
  "Recommend investment",
  "Defer",
  "Reject",
]);
export const pilotObservationSchema = z.object({
  taskId: id,
  sampleCount: number.int().nullable(),
  manualMinutes: number.nullable(),
  handlingMinutes: number.nullable(),
  reviewMinutes: number.nullable(),
  exceptions: number.int().nullable(),
  exceptionMinutes: number.nullable(),
});
export const pilotDraftSchema = z.object({
  version: z.literal(1),
  optionId: id,
  name: z.string(),
  startDate: dateSchema,
  endDate: dateSchema,
  owner: z.string(),
  limitations: z.string(),
  source: z.string(),
  rationale: z.string(),
  eligibleCases: number.int().nullable(),
  assistedCases: number.int().nullable(),
  successfulOutcomes: number.int().nullable(),
  unsafeReleased: number.int().nullable(),
  budget: number.nullable(),
  nonLabourSpend: number.nullable(),
  otherHumanMinutes: number.nullable(),
  thresholds: z.object({
    adoption: fraction.nullable(),
    successRate: fraction.nullable(),
  }),
  observations: z.array(pilotObservationSchema),
  forecast: z.object({
    basis: z.string(),
    option: solutionOptionSchema,
    bau: solutionOptionSchema,
    sourceRevision: revision,
    currency: currencySchema,
  }),
});
export const pilotRevisionSchema = pilotDraftSchema.extend({
  id,
  at: z.iso.datetime(),
});
export const pilotApplicationSchema = z.object({
  id,
  pilotId: id,
  evidenceId: id,
  at: z.iso.datetime(),
  owner: z.string(),
  rationale: z.string(),
  basisAfter: z.string(),
  changes: z.array(
    z.object({
      field: z.string(),
      before: z.number().finite().nullable(),
      after: z.number().finite().nullable(),
    }),
  ),
});
export type PilotObservation = z.infer<typeof pilotObservationSchema>;
export type PilotDraft = z.infer<typeof pilotDraftSchema>;
export type PilotRevision = z.infer<typeof pilotRevisionSchema>;
export type PilotApplication = z.infer<typeof pilotApplicationSchema>;
const dimensionSchema = z.enum(["unknown", "ready", "concern"]);
export const assessmentResultSchema = z.object({
  outcome: outcomeSchema,
  dimensions: z.object({
    value: dimensionSchema,
    feasibility: dimensionSchema,
    evidence: dimensionSchema,
    adoption: dimensionSchema,
    risk: dimensionSchema,
  }),
  blockers: z.array(
    z.object({
      message: z.string(),
      section: z.enum([
        "brief",
        "evidence",
        "options",
        "evaluation",
        "recommendation",
      ]),
      targetId: id.optional(),
    }),
  ),
  reasons: z.array(z.string()),
});
export const opportunitySnapshotSchema = z.object({
  id,
  name: z.string(),
  problem: z.string(),
  revision,
  discovery: z.object({
    process: z.object({ notes: z.string() }),
    workload: z.object({ notes: z.string() }),
    pain: z.object({ notes: z.string() }),
    data: z.object({ notes: z.string() }),
    controls: z.object({ notes: z.string() }),
    adoption: z.object({ notes: z.string() }),
    value: z.object({ notes: z.string() }),
  }),
  processSteps: z.array(processStepSchema),
  evidence: z.array(evidenceSchema),
  requests: z.array(evidenceRequestSchema),
  options: z.array(solutionOptionSchema),
  selectedOptionId: id,
  assumptions: z.array(assumptionRevisionSchema),
  validation: validationPlanSchema,
  legacyDecisions: z.array(z.unknown()),
  feasibility: dimensionSchema,
  adoption: dimensionSchema,
  risk: dimensionSchema,
  criticalControlsOpen: z.boolean(),
  economicHurdle: z.number().finite(),
  budgetCeiling: number.nullable(),
  questions: z.array(workshopQuestionSchema).optional(),
  evaluations: z.array(evaluationRunSchema).optional(),
  pilots: z.array(pilotRevisionSchema).optional(),
  pilotApplications: z.array(pilotApplicationSchema).optional(),
  decisionPolicy: z
    .object({
      objective: z.enum(["economic", "cash"]),
      paybackCeiling: number.max(36),
      npvHurdle: z.number().finite(),
    })
    .optional(),
});
export const engagementSummarySchema = z.object({
  id,
  name: z.string(),
  client: z.string(),
  sponsor: z.string(),
  processOwner: z.string(),
  lead: z.string(),
  problem: z.string(),
  objectives: z.string(),
  constraints: z.string(),
  assessmentDate: dateSchema,
  decisionDeadline: dateSchema,
  currency: currencySchema,
  archived: z.boolean(),
  revision,
});
export const recommendationSnapshotSchema = z.object({
  id,
  at: z.iso.datetime(),
  sourceRevision: revision,
  outcome: outcomeSchema,
  rationale: z.string().trim().min(1),
  conditions: z.string(),
  alternativesRejected: z.string(),
  nextDecisionDate: z.iso.date(),
  strategicException: z.string(),
  assessment: assessmentResultSchema,
  engagement: engagementSummarySchema,
  opportunity: opportunitySnapshotSchema,
});
export const opportunitySchema = opportunitySnapshotSchema.extend({
  recommendations: z.array(recommendationSnapshotSchema),
});
export const engagementSchema = engagementSummarySchema.extend({
  opportunities: z.array(opportunitySchema),
  history: z.array(
    z.object({ id, at: z.iso.datetime(), detail: z.string(), revision }),
  ),
});

function validateOpportunityIntegrity(
  opportunity: z.infer<typeof opportunitySnapshotSchema>,
  ctx: z.RefinementCtx,
  ids: Set<string>,
  context = "",
) {
  const issue = (message: string) =>
    ctx.addIssue({ code: "custom", message: `${context}${message}` });
  const register = (value: { id: string }) => {
    if (ids.has(value.id)) issue(`Duplicate ID: ${value.id}`);
    ids.add(value.id);
  };
  register(opportunity);
  [
    opportunity.processSteps,
    opportunity.evidence,
    opportunity.requests,
    opportunity.assumptions,
    opportunity.questions ?? [],
    opportunity.evaluations ?? [],
    opportunity.pilots ?? [],
    opportunity.pilotApplications ?? [],
  ].forEach((list) => list.forEach(register));
  const options = new Set(opportunity.options.map((option) => option.id));
  const evidence = new Set(opportunity.evidence.map((source) => source.id));
  if (!options.has(opportunity.selectedOptionId))
    issue(`Selected option missing: ${opportunity.id}`);
  if (
    opportunity.options.filter((option) => option.kind === "bau").length !== 1
  )
    issue("Exactly one BAU option required");
  for (const option of opportunity.options) {
    register(option);
    [option.costs, option.benefits, option.scenarios].forEach((list) =>
      list.forEach(register),
    );
    for (const task of option.taskPlan?.rows ?? []) {
      register(task);
      if (task.evidenceIds.some((eid) => !evidence.has(eid)))
        issue(`Broken task evidence: ${task.id}`);
    }
  }
  for (const question of opportunity.questions ?? [])
    if (question.evidenceIds.some((eid) => !evidence.has(eid)))
      issue(`Broken question evidence: ${question.id}`);
  for (const run of opportunity.evaluations ?? [])
    if (!options.has(run.optionId))
      issue(`Broken evaluation option: ${run.id}`);
  for (const pilot of opportunity.pilots ?? []) {
    if (
      !options.has(pilot.optionId) ||
      pilot.forecast.option.id !== pilot.optionId ||
      pilot.forecast.bau.kind !== "bau"
    )
      issue(`Broken pilot option: ${pilot.id}`);
    const tasks = new Set(
      pilot.forecast.option.taskPlan?.rows.map((t) => t.id),
    );
    const seen = new Set<string>();
    for (const row of pilot.observations) {
      if (!tasks.has(row.taskId) || seen.has(row.taskId))
        issue(`Broken or duplicate pilot task: ${row.taskId}`);
      seen.add(row.taskId);
    }
  }
  for (const applied of opportunity.pilotApplications ?? [])
    if (
      !opportunity.pilots?.some((p) => p.id === applied.pilotId) ||
      !evidence.has(applied.evidenceId)
    )
      issue(`Broken pilot application: ${applied.id}`);
  for (const assumption of opportunity.assumptions)
    if (
      !options.has(assumption.optionId) ||
      assumption.evidenceIds.some((eid) => !evidence.has(eid))
    )
      issue(`Broken assumption reference: ${assumption.id}`);
}

export const workspaceSchema = z
  .object({
    schemaVersion: z.literal(3),
    revision,
    engagements: z.array(engagementSchema),
    brand: z.object({ name: z.string(), accent: z.string() }),
    migration: z.object({
      confirmed: z.boolean(),
      legacyImported: z.boolean(),
    }),
  })
  .superRefine((workspace, ctx) => {
    const ids = new Set<string>();
    const register = (value: { id: string }) => {
      if (ids.has(value.id))
        ctx.addIssue({ code: "custom", message: `Duplicate ID: ${value.id}` });
      ids.add(value.id);
    };
    for (const e of workspace.engagements) {
      register(e);
      e.history.forEach(register);
      for (const o of e.opportunities) {
        validateOpportunityIntegrity(o, ctx, ids);
        for (const snapshot of o.recommendations) {
          register(snapshot);
          // Historical entities legitimately repeat live IDs and IDs in other
          // snapshots; integrity applies within each captured opportunity.
          validateOpportunityIntegrity(
            snapshot.opportunity,
            ctx,
            new Set(),
            `Recommendation snapshot ${snapshot.id}: `,
          );
        }
      }
    }
  });

export type LabourInputs = z.infer<typeof labourInputsSchema>;
export type TaskRow = z.infer<typeof taskRowSchema>;
export type WorkshopQuestion = z.infer<typeof workshopQuestionSchema>;
export type EvaluationRun = z.infer<typeof evaluationRunSchema>;
export type CostLine = z.infer<typeof costLineSchema>;
export type BenefitLine = z.infer<typeof benefitLineSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type EvidenceRequest = z.infer<typeof evidenceRequestSchema>;
export type AssumptionRevision = z.infer<typeof assumptionRevisionSchema>;
export type ProcessStep = z.infer<typeof processStepSchema>;
export type ValidationPlan = z.infer<typeof validationPlanSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export type SimulationSummary = z.infer<typeof simulationSummarySchema>;
export type SolutionOption = z.infer<typeof solutionOptionSchema>;
export type AssessmentResult = z.infer<typeof assessmentResultSchema>;
export type RecommendationSnapshot = z.infer<
  typeof recommendationSnapshotSchema
>;
export type Opportunity = z.infer<typeof opportunitySchema>;
export type Engagement = z.infer<typeof engagementSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Currency = z.infer<typeof currencySchema>;
export type RecommendationInput = Pick<
  RecommendationSnapshot,
  | "outcome"
  | "rationale"
  | "conditions"
  | "alternativesRejected"
  | "nextDecisionDate"
  | "strategicException"
>;
