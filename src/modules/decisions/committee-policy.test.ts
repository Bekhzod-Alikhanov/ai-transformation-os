import { describe, expect, it } from "vitest";

import {
  calculateConsensusConfidence,
  applyDecisionPolicy,
} from "./committee-policy";

describe("committee decision policy", () => {
  it("makes specialist disagreement visible in consensus confidence", () => {
    const aligned = calculateConsensusConfidence(
      [
        { score: 80, confidence: 0.8 },
        { score: 80, confidence: 0.8 },
        { score: 80, confidence: 0.8 },
      ],
      1,
    );
    const divided = calculateConsensusConfidence(
      [
        { score: 95, confidence: 0.8 },
        { score: 45, confidence: 0.8 },
        { score: 70, confidence: 0.8 },
      ],
      1,
    );

    expect(aligned).toBe(0.8);
    expect(divided).toBeLessThan(aligned);
  });

  it("forces an experiment when evidence is insufficient", () => {
    expect(
      applyDecisionPolicy({
        proposedDecision: "go",
        evidenceCoverage: 0.3,
        maximumRiskScore: 40,
        threeYearNpv: 1_000_000,
      }),
    ).toEqual({ decision: "experiment_first", gate: "insufficient_evidence" });
  });

  it("forces stop when quantified value is negative and evidence is credible", () => {
    expect(
      applyDecisionPolicy({
        proposedDecision: "conditional_go",
        evidenceCoverage: 0.8,
        maximumRiskScore: 50,
        threeYearNpv: -1,
      }),
    ).toEqual({ decision: "stop", gate: "negative_economics" });
  });
});
