import { describe, expect, it } from "vitest";

import {
  calculateEconomics,
  inputSchema,
  sensitivity,
  simulateEconomics,
  type EconomicInput,
  type SimulationRanges,
} from "./economics";

const input: EconomicInput = {
  annualVolume: 12_000,
  minutesBefore: 30,
  reduction: 0.5,
  reviewMinutes: 3,
  adoption: 0.8,
  hourlyCost: 50,
  realisation: 0.6,
  cashShare: 0.25,
  productiveHours: 1_600,
  implementationCost: 60_000,
  annualRunCost: 12_000,
  rampMonths: 6,
  discountRate: 0,
};

describe("delivery economics", () => {
  it("deducts review time and applies adoption once before valuing capacity", () => {
    const result = calculateEconomics(input);

    expect(result.annualHoursSaved).toBe(1_920);
    expect(result.fteCapacity).toBe(1.2);
    expect(result.capacityValue).toBe(96_000);
    expect(result.annualBenefit).toBe(57_600);
    expect(result.cashSavings).toBe(14_400);
    expect(result.annualNet).toBe(45_600);
  });

  it("charges opex during ramp and keeps cash a subset of economic benefit", () => {
    const result = calculateEconomics(input);

    expect(result.monthly).toHaveLength(36);
    expect(result.monthly[0]).toEqual({
      month: 1,
      benefit: 800,
      opex: 1_000,
      net: -200,
      cumulative: -60_200,
    });
    expect(result.monthly[5]?.benefit).toBe(4_800);
    expect(result.monthly[6]?.benefit).toBe(4_800);
    expect(result.yearOneBenefit).toBe(45_600);
    expect(result.yearOneNet).toBe(-26_400);
    expect(result.firstYearRoi).toBe(-0.44);
    expect(result.threeYearNet).toBe(64_800);
    expect(result.npv).toBe(64_800);
    expect(result.cashNpv).toBe(-55_800);
  });

  it("interpolates the first monthly payback crossing after ramp losses", () => {
    const result = calculateEconomics(input);

    expect(result.monthly[17]?.cumulative).toBe(-3_600);
    expect(result.monthly[18]?.cumulative).toBe(200);
    expect(result.paybackMonths).toBeCloseTo(18.947368421, 8);
  });

  it("supports a partial first month payback with no ramp", () => {
    const result = calculateEconomics({
      ...input,
      implementationCost: 1_900,
      rampMonths: 0,
    });

    expect(result.monthly[0]?.benefit).toBe(4_800);
    expect(result.paybackMonths).toBe(0.5);
  });

  it("discounts monthly cash flows from month one using an annual equivalent rate", () => {
    const result = calculateEconomics({
      ...input,
      annualVolume: 720,
      minutesBefore: 60,
      reduction: 1,
      reviewMinutes: 0,
      adoption: 1,
      hourlyCost: 100,
      realisation: 1,
      cashShare: 0.5,
      implementationCost: 10_000,
      annualRunCost: 0,
      rampMonths: 0,
      discountRate: 0.126825030131969720661201,
    });

    // This annual rate is 1.01^12 - 1, so each month discounts at 1%.
    const annuity = (6_000 * (1 - 1.01 ** -36)) / 0.01;
    expect(result.npv).toBeCloseTo(annuity - 10_000, 5);
    expect(result.cashNpv).toBeCloseTo(annuity / 2 - 10_000, 5);
  });

  it.each([{ adoption: 0 }, { reviewMinutes: 30 }, { reduction: 0 }])(
    "returns no positive savings or payback when work saves no time: %o",
    (change) => {
      const result = calculateEconomics({ ...input, ...change });

      expect(result.annualHoursSaved).toBe(0);
      expect(result.annualBenefit).toBe(0);
      expect(result.paybackMonths).toBeNull();
      expect(result.npv).toBe(-96_000);
    },
  );

  it("returns null ROI for zero investment without dividing by zero", () => {
    const result = calculateEconomics({ ...input, implementationCost: 0 });

    expect(result.firstYearRoi).toBeNull();
    expect(result.paybackMonths).toBe(0);
  });

  it.each([
    { annualVolume: 0 },
    { minutesBefore: 0 },
    { productiveHours: 0 },
    { hourlyCost: Number.NaN },
    { implementationCost: Number.POSITIVE_INFINITY },
    { annualRunCost: -1 },
    { reviewMinutes: -1 },
    { adoption: 1.01 },
    { reduction: -0.01 },
    { realisation: 1.01 },
    { cashShare: 1.01 },
    { discountRate: 1.01 },
    { rampMonths: 1.5 },
    { rampMonths: 13 },
  ])("rejects invalid model inputs: %o", (change) => {
    expect(inputSchema.safeParse({ ...input, ...change }).success).toBe(false);
    expect(() => calculateEconomics({ ...input, ...change })).toThrow();
  });

  it("shows each sensitivity as a change in the same three-year NPV", () => {
    const rows = sensitivity(input);
    const adoption = rows.find((row) => row.label === "Adoption");
    const cost = rows.find((row) => row.label === "Implementation cost");
    const review = rows.find((row) => row.label === "Review time");

    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.every((row) => row.base === 64_800)).toBe(true);
    expect(adoption?.low).toBeLessThan(64_800);
    expect(adoption?.high).toBeGreaterThan(64_800);
    expect(cost?.low).toBeGreaterThan(64_800);
    expect(cost?.high).toBeLessThan(64_800);
    expect(review?.low).toBeGreaterThan(64_800);
    expect(review?.high).toBeLessThan(64_800);
  });
});

describe("economic uncertainty", () => {
  it("reproduces seeded samples and counts actual outcomes in the histogram", () => {
    const first = simulateEconomics(input, 42);
    const repeat = simulateEconomics(input, 42);
    const different = simulateEconomics(input, 43);

    expect(first).toEqual(repeat);
    expect(first.p50).not.toBe(different.p50);
    expect(first.seed).toBe(42);
    expect(first.iterations).toBe(10_000);
    expect(first.p10).toBeLessThan(first.p50);
    expect(first.p50).toBeLessThan(first.p90);
    expect(first.paybackProbability).toBeGreaterThanOrEqual(0);
    expect(first.paybackProbability).toBeLessThanOrEqual(1);
    expect(first.histogram.reduce((sum, bin) => sum + bin.count, 0)).toBe(
      10_000,
    );
    expect(first.histogram.some((bin) => bin.count > 0)).toBe(true);
    expect(first.histogram[0]?.from).toBeLessThanOrEqual(first.p10);
    expect(first.histogram.at(-1)?.to).toBeGreaterThanOrEqual(first.p90);
  }, 30_000);

  it("matches the base case exactly when all uncertainty ranges are fixed", () => {
    const ranges: SimulationRanges = {
      adoption: { min: 0.8, mode: 0.8, max: 0.8 },
      reduction: { min: 0.5, mode: 0.5, max: 0.5 },
      implementationCost: { min: 60_000, mode: 60_000, max: 60_000 },
      annualRunCost: { min: 12_000, mode: 12_000, max: 12_000 },
    };
    const result = simulateEconomics(input, 7, ranges);

    expect(result.p10).toBe(64_800);
    expect(result.p50).toBe(64_800);
    expect(result.p90).toBe(64_800);
    expect(result.paybackProbability).toBe(1);
    expect(result.histogram).toEqual([
      { from: 64_800, to: 64_800, count: 10_000 },
    ]);
  }, 15_000);

  it("reports zero payback probability when every sample has no benefit", () => {
    const result = simulateEconomics({ ...input, realisation: 0 }, 0);

    expect(result.paybackProbability).toBe(0);
    expect(result.p90).toBeLessThan(0);
  }, 15_000);

  it("rejects invalid triangular ranges and seeds", () => {
    expect(() =>
      simulateEconomics(input, 42, {
        adoption: { min: 0.9, mode: 0.8, max: 1 },
      }),
    ).toThrow();
    expect(() =>
      simulateEconomics(input, 42, {
        reduction: { min: 0, mode: 0.5, max: 1.1 },
      }),
    ).toThrow();
    expect(() => simulateEconomics(input, Number.NaN)).toThrow();
  });
});
