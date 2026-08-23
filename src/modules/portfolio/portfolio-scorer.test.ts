import { describe, expect, it } from "vitest";

import { PortfolioScorer, defaultPortfolioWeights } from "./portfolio-scorer";

describe("PortfolioScorer", () => {
  it("scores risk inversely and classifies an evidence-backed quick win", () => {
    const result = PortfolioScorer.score(
      {
        strategicAlignment: 80,
        economicValue: 90,
        userImpact: 70,
        feasibility: 75,
        dataReadiness: 65,
        timeToValue: 80,
        changeReadiness: 60,
        risk: 30,
        evidenceCoverage: 0.8,
        threeYearNpv: 1_100_000,
      },
      defaultPortfolioWeights,
    );

    expect(result.overall).toBe(75.75);
    expect(result.classification).toBe("quick_win");
    expect(result.evidenceCoverage).toBe(0.8);
    expect(result.explanation).toContain("risk is inverted");
  });

  it("defers an opportunity when evidence coverage is below the approval floor", () => {
    const result = PortfolioScorer.score(
      {
        strategicAlignment: 90,
        economicValue: 95,
        userImpact: 90,
        feasibility: 80,
        dataReadiness: 70,
        timeToValue: 80,
        changeReadiness: 80,
        risk: 20,
        evidenceCoverage: 0.25,
        threeYearNpv: 2_000_000,
      },
      defaultPortfolioWeights,
    );

    expect(result.classification).toBe("defer");
  });

  it("rejects editable weights that do not total 100 percent", () => {
    expect(() =>
      PortfolioScorer.score(
        {
          strategicAlignment: 50,
          economicValue: 50,
          userImpact: 50,
          feasibility: 50,
          dataReadiness: 50,
          timeToValue: 50,
          changeReadiness: 50,
          risk: 50,
          evidenceCoverage: 1,
          threeYearNpv: 1,
        },
        { ...defaultPortfolioWeights, risk: 0.2 },
      ),
    ).toThrow("Portfolio weights must total 1");
  });
});
