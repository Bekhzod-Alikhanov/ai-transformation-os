import { describe, expect, it } from "vitest";
import { createOption } from "./model";
import {
  calculateOption,
  sensitivityOption,
  simulateOption,
} from "./economics";
import type { SolutionOption } from "./types";
import { createTemplate } from "./templates";

function fixture() {
  const bau = createOption("bau"),
    option = createOption("assistance");
  const baseline = {
    annualVolume: 12000,
    minutesBefore: 10,
    reduction: 0,
    reviewMinutes: 0,
    adoption: 1,
    hourlyCost: 60,
    realisation: 1,
    cashShare: 0,
    productiveHours: 1800,
    rampMonths: 0,
    discountRate: 0,
  };
  bau.inputs = { ...baseline };
  option.inputs = {
    ...baseline,
    reduction: 0.5,
    reviewMinutes: 1,
    cashShare: 0.25,
  };
  option.cashMechanism = "Avoid planned contractor renewal";
  option.costs = [
    {
      id: "setup",
      name: "Setup",
      category: "implementation",
      amount: 12000,
      frequency: "one_time",
      startMonth: 0,
      endMonth: 0,
      accounting: "capex",
    },
    {
      id: "ops",
      name: "Operations",
      category: "operations",
      amount: 100,
      frequency: "monthly",
      startMonth: 1,
      endMonth: 36,
      accounting: "opex",
    },
  ];
  return { option, bau };
}
describe("assessment economics", () => {
  it("keeps BAU scenario self-comparisons at zero incremental value", () => {
    const bau = createTemplate("support").opportunities[0].options[0];
    const before = structuredClone(bau);
    const base = calculateOption(bau, bau);
    const scenario = calculateOption(bau, bau, bau.scenarios[0]);
    expect(scenario).toEqual(base);
    expect(scenario.npv).toBe(0);
    expect(scenario.cashNpv).toBe(0);
    expect(
      scenario.monthly.every(
        (row) => row.cost === 0 && row.economicNet === 0 && row.cashNet === 0,
      ),
    ).toBe(true);
    expect(bau).toEqual(before);
  });
  it("rejects BAU sensitivity instead of varying only one side of the baseline", () => {
    const bau = createTemplate("support").opportunities[0].options[0];
    expect(() => sensitivityOption(bau, bau)).toThrow(/BAU.*alternative/i);
  });
  it("rejects BAU simulation instead of generating artificial improvement", () => {
    const bau = createTemplate("support").opportunities[0].options[0];
    expect(() => simulateOption(bau, bau, 42, { inputRevision: 0 })).toThrow(
      /BAU.*alternative/i,
    );
  });
  it("keeps cash a subset of value and computes 36 incremental monthly periods", () => {
    const { option, bau } = fixture();
    const r = calculateOption(option, bau);
    expect(r.status).toBe("complete");
    expect(r.annualHoursSaved).toBe(800);
    expect(r.annualBenefit).toBe(48000);
    expect(r.cashSavings).toBe(12000);
    expect(r.firstYearNet).toBe(34800);
    expect(r.firstYearCashNet).toBe(-1200);
    expect(r.npv).toBe(128400);
    expect(r.cashNpv).toBe(20400);
    expect(r.economicRoi).toBe(2.9);
    expect(r.paybackMonths).toBe(4);
    expect(r.cashPaybackMonths).toBe(14);
    expect(r.monthly).toHaveLength(37);
    expect(r.maximumViableInvestment).toBe(140400);
    expect(r.breakEvenAdoption).toBeCloseTo(15600 / 144000, 5);
  });
  it("exposes null metrics for missing values, inconsistent baseline or undocumented cash", () => {
    const { option, bau } = fixture();
    option.inputs.annualVolume = null;
    expect(calculateOption(option, bau).npv).toBeNull();
    option.inputs.annualVolume = 900;
    expect(calculateOption(option, bau).status).toBe("incomplete");
    option.inputs.annualVolume = 12000;
    option.cashMechanism = "";
    expect(calculateOption(option, bau).status).toBe("incomplete");
    option.cashMechanism = "Contract";
    option.costs[0].amount = null;
    expect(calculateOption(option, bau).annualBenefit).toBeNull();
  });
  it("times one-off, monthly and annual costs and subtracts BAU schedule", () => {
    const { option, bau } = fixture();
    option.costs = [
      { ...option.costs[0], startMonth: 3, endMonth: 3, amount: 10 },
      {
        ...option.costs[1],
        frequency: "annual",
        amount: 120,
        startMonth: 2,
        endMonth: 26,
      },
    ];
    bau.costs = [{ ...option.costs[1], id: "baseline-license", amount: 20 }];
    const r = calculateOption(option, bau);
    expect(r.monthly[2].cost).toBe(100);
    expect(r.monthly[3].cost).toBe(10);
    expect(r.monthly[14].cost).toBe(100);
    expect(r.monthly[26].cost).toBe(100);
    expect(r.monthly[1].cost).toBe(0);
    expect(r.economicRoi).toBeNull();
    expect(calculateOption(bau, bau).npv).toBe(0);
  });
  it("does not invent payback or adoption bounds for unviable cases", () => {
    const { option, bau } = fixture();
    option.inputs.reduction = 0;
    option.inputs.reviewMinutes = 0;
    const r = calculateOption(option, bau);
    expect(r.annualHoursSaved).toBe(0);
    expect(r.paybackMonths).toBeNull();
    expect(r.breakEvenAdoption).toBeNull();
  });
  it("requires explicit costing when review effort exceeds gross savings", () => {
    const { option, bau } = fixture();
    option.inputs.reviewMinutes = 6;
    const result = calculateOption(option, bau);
    expect(result.status).toBe("incomplete");
    expect(result.npv).toBeNull();
    expect(result.issues.some((x) => x.includes("review"))).toBe(true);
  });
  it("blocks benefit overlap, gross revenue and duplicated review costs", () => {
    const { option, bau } = fixture();
    const benefit = {
      id: "b",
      name: "Quality",
      kind: "quality" as const,
      annualAmount: 3000,
      pool: "labour",
      cashShare: 0,
      enabled: true,
      overlapResolved: false,
      mechanism: "",
    };
    option.benefits.push(benefit);
    expect(calculateOption(option, bau).status).toBe("overlap");
    benefit.overlapResolved = true;
    expect(calculateOption(option, bau).status).toBe("overlap");
    benefit.mechanism = "Allocation excludes labour time";
    expect(calculateOption(option, bau).status).toBe("complete");
    benefit.pool = "quality";
    benefit.annualAmount = null as unknown as number;
    expect(calculateOption(option, bau).status).toBe("incomplete");
    option.benefits = [];
    option.costs[1].category = "review";
    expect(calculateOption(option, bau).status).toBe("incomplete");
    option.reviewAllocation =
      "Review cost covers independent audit, excluded from review minutes";
    expect(calculateOption(option, bau).status).toBe("complete");
    option.benefits.push({
      ...benefit,
      annualAmount: 3000,
      kind: "revenue",
      mechanism: "Gross sales",
    });
    expect(calculateOption(option, bau).status).toBe("incomplete");
  });
  it("calculates scenarios without mutation and discounts at annual-equivalent monthly rate", () => {
    const { option, bau } = fixture();
    const before = structuredClone(option);
    const r = calculateOption(option, bau, {
      id: "s",
      name: "Downside",
      inputPatch: { adoption: 0.5 },
      costMultiplier: 2,
      benefitMultiplier: 1,
    });
    expect(r.annualBenefit).toBe(24000);
    expect(r.investment).toBe(24000);
    expect(option).toEqual(before);
    option.inputs.discountRate = bau.inputs.discountRate = 0.12;
    const discounted = calculateOption(option, bau);
    expect(discounted.npv).toBeGreaterThan(106000);
    expect(discounted.npv).toBeLessThan(107000);
  });
  it("reproduces 10000 independent triangular draws and directional sensitivities", () => {
    const { option, bau } = fixture();
    const before = structuredClone(option);
    const ranges = {
      inputRevision: 7,
      adoption: { min: 0.5, mode: 0.75, max: 1 },
      reduction: { min: 0.3, mode: 0.5, max: 0.7 },
      costMultiplier: { min: 0.8, mode: 1, max: 1.2 },
    };
    const a = simulateOption(option, bau, 42, ranges),
      b = simulateOption(option, bau, 42, ranges);
    expect(a).toEqual(b);
    expect(a.inputRevision).toBe(7);
    expect(a.p10).toBeLessThan(a.p50);
    expect(a.p50).toBeLessThan(a.p90);
    expect(a.ranges).toEqual({
      adoption: ranges.adoption,
      reduction: ranges.reduction,
      costMultiplier: ranges.costMultiplier,
    });
    expect(a.histogram.reduce((n, x) => n + x.count, 0)).toBe(10000);
    expect(a.paybackProbability).toBeGreaterThan(0.9);
    expect(option).toEqual(before);
    const s = sensitivityOption(option, bau);
    expect(s.adoption.low).toBeLessThan(s.adoption.high);
    expect(s.costMultiplier.low).toBeGreaterThan(s.costMultiplier.high);
    const blank: SolutionOption = createOption("rules");
    expect(() => simulateOption(blank, bau, 1)).toThrow();
  }, 20000);
});
