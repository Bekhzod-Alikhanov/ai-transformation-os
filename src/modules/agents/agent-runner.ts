import { randomUUID } from "node:crypto";

import OpenAI from "openai";

import { estimateModelCost, modelCatalog } from "@/config/models";
import type { AgentDefinition, AgentRunResult } from "@/lib/domain/contracts";

type RunContext = {
  organisationId: string;
  subjectId: string;
  evidence?: AgentRunResult<unknown>["evidence"];
  payload: unknown;
  mode?: "live" | "synthetic_replay";
};

function modelConfig(id: string) {
  return (
    Object.values(modelCatalog).find((model) => model.id === id) ??
    modelCatalog.terra
  );
}

function syntheticFixture(definitionId: string): unknown {
  const specialist = {
    recommendation: "conditional_go",
    score: definitionId === "risk-lead" ? 61 : 78,
    confidence: 0.78,
    rationale:
      "Proceed with a bounded pilot after the cited evidence and control conditions are verified.",
    objections: ["Adoption and source entitlement evidence remain incomplete"],
    evidenceRefs: ["ev-aster-reporting-baseline"],
  };
  const fixtures: Record<string, unknown> = {
    "opportunity-miner": {
      title: "Client Status Reporting Automation",
      summary:
        "Evidence indicates recurring manual reporting effort with measurable capacity impact.",
      evidenceRefs: ["ev-aster-reporting-baseline"],
      confidence: 0.82,
      assumptions: ["Released capacity can be redeployed"],
    },
    "process-architect": {
      currentState: [
        { id: "c1", type: "human", label: "Collect updates", minutes: 210 },
      ],
      futureState: [
        { id: "f1", type: "agent", label: "Retrieve evidence", minutes: 4 },
        { id: "f2", type: "control", label: "Human approval", minutes: 15 },
      ],
      evidenceRefs: ["ev-aster-reporting-baseline"],
      confidence: 0.8,
    },
    "business-case-challenge": {
      objections: [
        {
          assumptionId: "redeployability",
          objection: "Released capacity is not equivalent to cash savings.",
          severity: "high",
          evidenceRefs: ["ev-aster-reporting-baseline"],
        },
      ],
      missingEvidence: ["Measured redeployment outcome"],
      confidence: 0.76,
    },
    "pilot-planner": {
      phases: [
        {
          dayRange: "0-30",
          milestones: ["Baseline verified"],
          decisionGate: "Access and safety",
        },
        {
          dayRange: "31-60",
          milestones: ["Shadow operation"],
          decisionGate: "Quality and adoption",
        },
        {
          dayRange: "61-90",
          milestones: ["Measured live pilot"],
          decisionGate: "Scale decision",
        },
      ],
      roles: [
        {
          role: "Pilot owner",
          accountable: true,
          responsibleFor: ["Outcomes"],
        },
      ],
      kpis: [
        {
          name: "Adoption",
          target: 0.65,
          unit: "ratio",
          source: "usage events",
        },
      ],
      controls: ["Human approval before publication"],
      risks: ["Low adoption"],
    },
    "executive-briefing": {
      headline: "Conditional go for the reporting proof of value",
      decisions: [
        {
          title: "Fund 90-day pilot",
          recommendation: "Conditional go",
          confidence: 0.68,
          evidenceRefs: ["ev-aster-reporting-baseline"],
        },
      ],
      valueSummary: "$1.1M risk-adjusted annual value",
      riskSummary: "Adoption and entitlement controls remain open",
    },
    orchestrator: {
      proposedDecision: "conditional_go",
      conciseRationale:
        "The economics are positive and evidence is sufficient for a bounded experiment, subject to adoption and entitlement controls.",
      conditions: ["Verify source entitlements", "Reach 65% adoption"],
      unresolvedObjections: ["Redeployability remains partly assumed"],
      evidenceRefs: ["ev-aster-reporting-baseline"],
      confidence: 0.68,
    },
  };
  return fixtures[definitionId] ?? specialist;
}

export const AgentRunner = {
  async run<TOutput>(
    definition: AgentDefinition<TOutput>,
    context: RunContext,
  ): Promise<AgentRunResult<TOutput>> {
    const runId = randomUUID();
    const useLive =
      context.mode === "live" && Boolean(process.env.OPENAI_API_KEY);
    const startedAt = Date.now();

    if (!useLive) {
      const output = definition.outputSchema.parse(
        syntheticFixture(definition.id),
      );
      return {
        runId,
        status: "completed",
        output,
        evidence: context.evidence ?? [],
        toolActivity: [],
        usage: { inputTokens: 0, outputTokens: 0, estimatedCost: 0 },
      };
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
      const response = await client.responses.create(
        {
          model: definition.model,
          reasoning: {
            effort:
              definition.reasoningEffort === "none"
                ? undefined
                : definition.reasoningEffort,
          },
          instructions: definition.instructions,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: JSON.stringify({
                    organisationId: context.organisationId,
                    subjectId: context.subjectId,
                    payload: context.payload,
                    evidence: context.evidence ?? [],
                  }),
                },
              ],
            },
          ],
        },
        { signal: AbortSignal.timeout(90_000) },
      );
      const output = definition.outputSchema.parse(
        JSON.parse(response.output_text) as unknown,
      );
      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;
      return {
        runId,
        status: "completed",
        output,
        evidence: context.evidence ?? [],
        toolActivity: definition.tools.map((tool) => ({
          tool,
          status: "available_not_invoked",
          durationMs: Date.now() - startedAt,
        })),
        usage: {
          inputTokens,
          outputTokens,
          estimatedCost: estimateModelCost(
            modelConfig(definition.model),
            inputTokens,
            outputTokens,
          ),
        },
      };
    } catch {
      return {
        runId,
        status: "failed",
        evidence: context.evidence ?? [],
        toolActivity: [],
        usage: { inputTokens: 0, outputTokens: 0, estimatedCost: 0 },
      };
    }
  },
};
