import { describe, expect, it } from "vitest";

import { SimulationEngine } from "./simulation-engine";

describe("SimulationEngine", () => {
  it("returns reproducible ordered distributions for a fixed seed", () => {
    const input = {
      baseAnnualBenefit: 1_100_000,
      annualOperatingCost: 100_000,
      implementationCost: 200_000,
      benefitRange: { minimum: 0.65, mode: 1, maximum: 1.25 },
      adoptionRange: { minimum: 0.55, mode: 0.75, maximum: 0.9 },
      failureRange: { minimum: 0.01, mode: 0.05, maximum: 0.15 },
      iterations: 1_000,
      seed: 42,
    } as const;

    const first = SimulationEngine.run(input);
    const second = SimulationEngine.run(input);

    expect(second).toEqual(first);
    expect(first.annualValue.p10).toBeLessThan(first.annualValue.p50);
    expect(first.annualValue.p50).toBeLessThan(first.annualValue.p90);
    expect(first.paybackWithinTwelveMonthsProbability).toBeGreaterThanOrEqual(
      0,
    );
    expect(first.paybackWithinTwelveMonthsProbability).toBeLessThanOrEqual(1);
    expect(first.iterations).toBe(1_000);
  });
});
