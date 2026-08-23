import { ValueRecommendationEngine } from "./value-recommendation";

describe("ValueRecommendationEngine", () => {
  it("recommends scale with conditions for strong economics but weak adoption", () => {
    expect(
      ValueRecommendationEngine.recommend({
        adoptionRatio: 0.63,
        qualityRatio: 1.04,
        valueRatio: 1.08,
        unresolvedHighRisks: 0,
      }),
    ).toEqual({
      recommendation: "scale_with_conditions",
      reasons: ["Adoption is materially below target"],
    });
  });

  it("stops a pilot when risk is unacceptable", () => {
    expect(
      ValueRecommendationEngine.recommend({
        adoptionRatio: 1,
        qualityRatio: 1,
        valueRatio: 1,
        unresolvedHighRisks: 2,
      }).recommendation,
    ).toBe("stop");
  });
});
