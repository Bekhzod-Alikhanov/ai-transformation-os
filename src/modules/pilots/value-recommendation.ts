export type PilotGateInput = {
  adoptionRatio: number;
  qualityRatio: number;
  valueRatio: number;
  unresolvedHighRisks: number;
};

export type ValueRecommendation =
  "scale" | "scale_with_conditions" | "fix" | "pause" | "stop";

export const ValueRecommendationEngine = {
  recommend(input: PilotGateInput): {
    recommendation: ValueRecommendation;
    reasons: string[];
  } {
    if (input.unresolvedHighRisks > 0)
      return {
        recommendation: "stop",
        reasons: ["Unresolved high risk exceeds policy tolerance"],
      };
    if (input.qualityRatio < 0.7)
      return {
        recommendation: "pause",
        reasons: ["Quality is materially below target"],
      };
    if (input.valueRatio < 0.6)
      return {
        recommendation: "stop",
        reasons: ["Realised value is materially below target"],
      };
    if (input.adoptionRatio < 0.5)
      return {
        recommendation: "fix",
        reasons: ["Adoption is critically below target"],
      };
    if (input.adoptionRatio < 0.8)
      return {
        recommendation: "scale_with_conditions",
        reasons: ["Adoption is materially below target"],
      };
    if (input.qualityRatio < 0.9 || input.valueRatio < 0.9)
      return {
        recommendation: "scale_with_conditions",
        reasons: ["One or more value gates are below target"],
      };
    return {
      recommendation: "scale",
      reasons: ["All scale gates are satisfied"],
    };
  },
};
