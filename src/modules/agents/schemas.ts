import { z } from "zod";

const confidenceSchema = z.number().min(0).max(1);
const evidenceRefsSchema = z
  .array(z.string().min(1))
  .min(1, "At least one evidence reference is required");

export const opportunityMinerOutputSchema = z
  .object({
    title: z.string().min(3),
    summary: z.string().min(10),
    evidenceRefs: evidenceRefsSchema,
    confidence: confidenceSchema,
    assumptions: z.array(z.string()),
  })
  .strict();

export const workflowOutputSchema = z
  .object({
    currentState: z.array(
      z.object({
        id: z.string(),
        type: z.enum(["human", "system", "decision", "control"]),
        label: z.string(),
        minutes: z.number().nonnegative(),
      }),
    ),
    futureState: z.array(
      z.object({
        id: z.string(),
        type: z.enum([
          "human",
          "agent",
          "automation",
          "system",
          "decision",
          "control",
        ]),
        label: z.string(),
        minutes: z.number().nonnegative(),
      }),
    ),
    evidenceRefs: evidenceRefsSchema,
    confidence: confidenceSchema,
  })
  .strict();

export const specialistOutputSchema = z
  .object({
    recommendation: z.enum([
      "go",
      "conditional_go",
      "experiment_first",
      "defer",
      "stop",
    ]),
    score: z.number().min(0).max(100),
    confidence: confidenceSchema,
    rationale: z.string().min(10).max(1_000),
    objections: z.array(z.string().max(500)),
    evidenceRefs: evidenceRefsSchema,
  })
  .strict();

export const businessCaseChallengeSchema = z
  .object({
    objections: z.array(
      z.object({
        assumptionId: z.string(),
        objection: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        evidenceRefs: z.array(z.string()),
      }),
    ),
    missingEvidence: z.array(z.string()),
    confidence: confidenceSchema,
  })
  .strict();

export const pilotPlanOutputSchema = z
  .object({
    phases: z
      .array(
        z.object({
          dayRange: z.enum(["0-30", "31-60", "61-90"]),
          milestones: z.array(z.string()),
          decisionGate: z.string(),
        }),
      )
      .length(3),
    roles: z.array(
      z.object({
        role: z.string(),
        accountable: z.boolean(),
        responsibleFor: z.array(z.string()),
      }),
    ),
    kpis: z.array(
      z.object({
        name: z.string(),
        target: z.number(),
        unit: z.string(),
        source: z.string(),
      }),
    ),
    controls: z.array(z.string()),
    risks: z.array(z.string()),
  })
  .strict();

export const executiveBriefingOutputSchema = z
  .object({
    headline: z.string(),
    decisions: z.array(
      z.object({
        title: z.string(),
        recommendation: z.string(),
        confidence: confidenceSchema,
        evidenceRefs: evidenceRefsSchema,
      }),
    ),
    valueSummary: z.string(),
    riskSummary: z.string(),
  })
  .strict();

export const orchestratorOutputSchema = z
  .object({
    proposedDecision: z.enum([
      "go",
      "conditional_go",
      "experiment_first",
      "defer",
      "stop",
    ]),
    conciseRationale: z.string().min(10).max(1_000),
    conditions: z.array(z.string()),
    unresolvedObjections: z.array(z.string()),
    evidenceRefs: evidenceRefsSchema,
    confidence: confidenceSchema,
  })
  .strict();

export type OpportunityMinerOutput = z.infer<
  typeof opportunityMinerOutputSchema
>;
export type SpecialistOutput = z.infer<typeof specialistOutputSchema>;
