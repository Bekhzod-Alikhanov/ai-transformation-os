import { describe, expect, it } from "vitest";

import { FinancialEngine } from "./financial-engine";

describe("FinancialEngine", () => {
  it("calculates a transparent three-year business case from deterministic inputs", () => {
    const result = FinancialEngine.calculate({
      labour: {
        employees: 10,
        tasksPerEmployeePerWeek: 5,
        minutesPerTask: 60,
        loadedHourlyCost: 50,
        expectedTimeReduction: 0.5,
        adoption: 0.8,
        utilisation: 0.75,
        redeployability: 0.5,
      },
      revenue: {
        annualVolume: 1_000,
        conversionRate: 0.1,
        revenuePerConversion: 1_000,
        expectedUplift: 0.1,
        adoption: 0.8,
        confidence: 0.75,
      },
      quality: {
        annualErrorFrequency: 100,
        costPerError: 500,
        expectedReduction: 0.4,
      },
      implementationCosts: {
        engineering: 10_000,
        consulting: 5_000,
        integration: 5_000,
        changeManagement: 0,
        training: 0,
        model: 0,
        licensing: 0,
      },
      annualOperatingCosts: {
        model: 2_000,
        software: 1_000,
        monitoring: 1_000,
        support: 1_000,
        humanReview: 0,
      },
      discountRate: 0.1,
    });

    expect(result.labourBenefit).toBe(19_500);
    expect(result.revenueBenefit).toBe(6_000);
    expect(result.qualityBenefit).toBe(20_000);
    expect(result.grossAnnualBenefit).toBe(45_500);
    expect(result.netAnnualBenefit).toBe(40_500);
    expect(result.implementationCost).toBe(20_000);
    expect(result.firstYearRoi).toBe(1.025);
    expect(result.paybackMonths).toBe(5.93);
    expect(result.threeYearNpv).toBe(80_717.51);
    expect(result.threeYearCumulativeValue).toBe(101_500);
    expect(result.formulas.labour).toContain("redeployability");
  });

  it("returns no payback when annual operating cost consumes all benefit", () => {
    const result = FinancialEngine.calculate({
      labour: undefined,
      revenue: undefined,
      quality: undefined,
      implementationCosts: {
        engineering: 10_000,
        consulting: 0,
        integration: 0,
        changeManagement: 0,
        training: 0,
        model: 0,
        licensing: 0,
      },
      annualOperatingCosts: {
        model: 12_000,
        software: 0,
        monitoring: 0,
        support: 0,
        humanReview: 0,
      },
      discountRate: 0.1,
    });

    expect(result.netAnnualBenefit).toBe(-12_000);
    expect(result.paybackMonths).toBeNull();
  });
});
