export type AutonomyLevel =
  "assistive" | "assisted" | "supervised" | "bounded_autonomous";

export type AutonomyProfile = {
  level: AutonomyLevel;
  permittedTools: string[];
  approvalPoints: string[];
  humanReviewMinutes: number;
  modelledCycleMinutes: number;
  riskMultiplier: number;
  operatingCostMultiplier: number;
};

const profiles: Record<AutonomyLevel, AutonomyProfile> = {
  assistive: {
    level: "assistive",
    permittedTools: ["evidence_read", "draft"],
    approvalPoints: ["after_every_step", "before_external_action"],
    humanReviewMinutes: 42,
    modelledCycleMinutes: 62,
    riskMultiplier: 0.72,
    operatingCostMultiplier: 1.22,
  },
  assisted: {
    level: "assisted",
    permittedTools: ["evidence_read", "calculate", "draft"],
    approvalPoints: ["before_handoff", "before_external_action"],
    humanReviewMinutes: 28,
    modelledCycleMinutes: 47,
    riskMultiplier: 0.82,
    operatingCostMultiplier: 1.12,
  },
  supervised: {
    level: "supervised",
    permittedTools: [
      "evidence_read",
      "calculate",
      "draft",
      "internal_write",
      "external_write",
    ],
    approvalPoints: ["before_external_action"],
    humanReviewMinutes: 15,
    modelledCycleMinutes: 31,
    riskMultiplier: 0.96,
    operatingCostMultiplier: 1,
  },
  bounded_autonomous: {
    level: "bounded_autonomous",
    permittedTools: [
      "evidence_read",
      "calculate",
      "draft",
      "internal_write",
      "external_write",
    ],
    approvalPoints: ["high_risk_external_action"],
    humanReviewMinutes: 7,
    modelledCycleMinutes: 21,
    riskMultiplier: 1.18,
    operatingCostMultiplier: 0.92,
  },
};

export const AutonomyPolicy = {
  resolve(level: AutonomyLevel): AutonomyProfile {
    return structuredClone(profiles[level]);
  },
};
