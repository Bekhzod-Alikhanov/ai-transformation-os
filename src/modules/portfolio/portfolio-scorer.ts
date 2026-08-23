export type PortfolioClassification =
  | "quick_win"
  | "big_bet"
  | "strategic_enabler"
  | "experiment"
  | "defer"
  | "stop";

export type OpportunityDimensions = {
  strategicAlignment: number;
  economicValue: number;
  userImpact: number;
  feasibility: number;
  dataReadiness: number;
  timeToValue: number;
  changeReadiness: number;
  risk: number;
  evidenceCoverage: number;
  threeYearNpv: number;
};

export type PortfolioWeights = Omit<
  OpportunityDimensions,
  "evidenceCoverage" | "threeYearNpv"
>;

export const defaultPortfolioWeights: PortfolioWeights = {
  strategicAlignment: 0.15,
  economicValue: 0.2,
  userImpact: 0.1,
  feasibility: 0.15,
  dataReadiness: 0.1,
  timeToValue: 0.1,
  changeReadiness: 0.1,
  risk: 0.1,
};

function classify(input: OpportunityDimensions): PortfolioClassification {
  if (
    input.risk >= 85 ||
    (input.threeYearNpv <= 0 && input.evidenceCoverage >= 0.6)
  )
    return "stop";
  if (input.evidenceCoverage < 0.4 || input.dataReadiness < 35) return "defer";
  if (
    input.economicValue >= 65 &&
    input.feasibility >= 70 &&
    input.timeToValue >= 65 &&
    input.risk <= 45
  )
    return "quick_win";
  if (
    input.economicValue >= 80 &&
    input.strategicAlignment >= 75 &&
    input.feasibility >= 45
  )
    return "big_bet";
  if (input.strategicAlignment >= 85 && input.dataReadiness >= 60)
    return "strategic_enabler";
  return "experiment";
}

export const PortfolioScorer = {
  score(input: OpportunityDimensions, weights: PortfolioWeights) {
    const weightTotal = Object.values(weights).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    if (Math.abs(weightTotal - 1) > 0.000_001)
      throw new RangeError("Portfolio weights must total 1");
    const dimensionValues = Object.entries(weights).map(
      ([dimension, weight]) => {
        const raw = input[dimension as keyof PortfolioWeights];
        if (raw < 0 || raw > 100)
          throw new RangeError(`${dimension} must be between 0 and 100`);
        return (dimension === "risk" ? 100 - raw : raw) * weight;
      },
    );
    return {
      overall: Number(
        dimensionValues.reduce((sum, value) => sum + value, 0).toFixed(2),
      ),
      classification: classify(input),
      evidenceCoverage: input.evidenceCoverage,
      explanation:
        "Weighted dimension score; risk is inverted. Evidence coverage is displayed separately and classification rules are versioned.",
    };
  },
};
