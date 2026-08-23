import { describe, expect, it } from "vitest";

import { asterData } from "./aster-data";

describe("Aster Financial Group demo data", () => {
  it("matches the executive hero narrative exactly", () => {
    expect(asterData.businessUnits).toHaveLength(8);
    expect(asterData.opportunities).toHaveLength(27);
    expect(asterData.pilots).toHaveLength(6);
    expect(asterData.summary.valueAtStake).toBe(8_400_000);
    expect(asterData.summary.realisedRunRate).toBe(1_900_000);
    expect(asterData.summary.decisionsRequired).toBe(4);
  });

  it("contains the evidence-backed client reporting hero use case", () => {
    const hero = asterData.opportunities.find(
      (item) => item.id === "client-status-reporting",
    );

    expect(hero?.evidence).toHaveLength(4);
    expect(hero?.originalAnnualValue).toBe(1_600_000);
    expect(hero?.annualValue).toBe(1_100_000);
    expect(
      hero?.committee?.specialists.map((specialist) => specialist.score),
    ).toEqual([89, 81, 61, 54, 76, 58]);
  });

  it("includes unattractive opportunities and an adoption-constrained pilot", () => {
    expect(
      asterData.opportunities.filter((item) =>
        ["defer", "stop"].includes(item.classification),
      ).length,
    ).toBeGreaterThanOrEqual(4);
    expect(
      asterData.pilots.some(
        (pilot) =>
          pilot.targetAdoption === 0.7 &&
          pilot.actualAdoption === 0.44 &&
          pilot.recommendation === "scale_with_conditions",
      ),
    ).toBe(true);
  });
});
