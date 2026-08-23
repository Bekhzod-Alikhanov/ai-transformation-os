import { AgentRunner } from "@/modules/agents/agent-runner";
import { committeeDefinitions } from "@/modules/agents/definitions";
import type { SpecialistOutput } from "@/modules/agents/schemas";

import {
  applyDecisionPolicy,
  calculateConsensusConfidence,
  type CommitteeDecision,
} from "./committee-policy";

export type CommitteeRunInput = {
  organisationId: string;
  useCaseId: string;
  evidenceCoverage: number;
  maximumRiskScore: number;
  threeYearNpv: number;
  mode: "live" | "synthetic_replay";
};

export type CommitteeResult = {
  decision: CommitteeDecision;
  proposedDecision: CommitteeDecision;
  policyGate: string;
  consensusConfidence: number;
  specialists: Array<SpecialistOutput & { agentId: string; runId: string }>;
  failures: string[];
};

export const CommitteeService = {
  async run(input: CommitteeRunInput): Promise<CommitteeResult> {
    const runs = await Promise.all(
      committeeDefinitions.map(async (definition) => ({
        definition,
        result: await AgentRunner.run(definition, {
          organisationId: input.organisationId,
          subjectId: input.useCaseId,
          payload: {
            useCaseId: input.useCaseId,
            evidenceCoverage: input.evidenceCoverage,
            threeYearNpv: input.threeYearNpv,
          },
          mode: input.mode,
        }),
      })),
    );

    const specialists = runs.flatMap(({ definition, result }) =>
      result.status === "completed" && result.output
        ? [{ ...result.output, agentId: definition.id, runId: result.runId }]
        : [],
    );
    if (specialists.length === 0)
      throw new Error("Committee failed: no specialist output completed");

    const meanScore =
      specialists.reduce((sum, specialist) => sum + specialist.score, 0) /
      specialists.length;
    const proposedDecision: CommitteeDecision =
      meanScore >= 75
        ? "go"
        : meanScore >= 55
          ? "conditional_go"
          : "experiment_first";
    const policy = applyDecisionPolicy({
      proposedDecision,
      evidenceCoverage: input.evidenceCoverage,
      maximumRiskScore: input.maximumRiskScore,
      threeYearNpv: input.threeYearNpv,
    });

    return {
      decision: policy.decision,
      proposedDecision,
      policyGate: policy.gate,
      consensusConfidence: calculateConsensusConfidence(
        specialists,
        input.evidenceCoverage,
      ),
      specialists,
      failures: runs
        .filter(({ result }) => result.status === "failed")
        .map(({ definition }) => definition.id),
    };
  },
};
