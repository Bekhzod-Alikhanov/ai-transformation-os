export type CommitteeDecision =
  "go" | "conditional_go" | "experiment_first" | "defer" | "stop";

export function calculateConsensusConfidence(
  specialists: Array<{ score: number; confidence: number }>,
  evidenceCoverage: number,
) {
  if (specialists.length === 0) return 0;
  const meanScore =
    specialists.reduce((sum, specialist) => sum + specialist.score, 0) /
    specialists.length;
  const meanConfidence =
    specialists.reduce((sum, specialist) => sum + specialist.confidence, 0) /
    specialists.length;
  const variance =
    specialists.reduce(
      (sum, specialist) => sum + (specialist.score - meanScore) ** 2,
      0,
    ) / specialists.length;
  const disagreementPenalty = 1 - Math.min(Math.sqrt(variance) / 250, 0.25);
  const evidenceFactor = 0.5 + Math.max(0, Math.min(1, evidenceCoverage)) * 0.5;
  return Number(
    (meanConfidence * evidenceFactor * disagreementPenalty).toFixed(2),
  );
}

export function applyDecisionPolicy(input: {
  proposedDecision: CommitteeDecision;
  evidenceCoverage: number;
  maximumRiskScore: number;
  threeYearNpv: number;
}): { decision: CommitteeDecision; gate: string } {
  if (input.maximumRiskScore >= 85)
    return { decision: "stop", gate: "unacceptable_risk" };
  if (input.evidenceCoverage < 0.4)
    return { decision: "experiment_first", gate: "insufficient_evidence" };
  if (input.threeYearNpv <= 0 && input.evidenceCoverage >= 0.6)
    return { decision: "stop", gate: "negative_economics" };
  return { decision: input.proposedDecision, gate: "none" };
}
