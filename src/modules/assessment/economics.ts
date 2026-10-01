import Decimal from "decimal.js";
import {
  scenarioSchema,
  solutionOptionSchema,
  type LabourInputs,
  type Scenario,
  type SimulationSummary,
  type SolutionOption,
} from "./types";

export type MonthlyFlow = {
  month: number;
  economicBenefit: number;
  cashBenefit: number;
  cost: number;
  economicNet: number;
  cashNet: number;
  cumulative: number;
  cashCumulative: number;
};
export type FinancialResult = {
  status: "complete" | "incomplete" | "overlap";
  issues: string[];
  annualHoursSaved: number | null;
  fteCapacity: number | null;
  capacityValue: number | null;
  annualBenefit: number | null;
  cashSavings: number | null;
  investment: number | null;
  annualOpex: number | null;
  firstYearNet: number | null;
  firstYearCashNet: number | null;
  economicRoi: number | null;
  cashRoi: number | null;
  npv: number | null;
  cashNpv: number | null;
  paybackMonths: number | null;
  cashPaybackMonths: number | null;
  threeYearNet: number | null;
  maximumViableInvestment: number | null;
  breakEvenAdoption: number | null;
  monthly: MonthlyFlow[];
};
class FinancialRangeError extends Error {
  constructor() {
    super(
      "Financial result exceeds the representable range. Review volumes, unit costs, multipliers and positive denominators before calculating.",
    );
  }
}
function finiteNumber(value: Decimal): number {
  return finiteResult(value.toNumber());
}
function finiteResult(result: number): number {
  if (!Number.isFinite(result)) throw new FinancialRangeError();
  return result;
}
const money = (n: Decimal.Value) =>
  finiteNumber(new Decimal(n).toDecimalPlaces(2));
type Known = { [K in keyof LabourInputs]: number };
const inputNames = [
  "annualVolume",
  "minutesBefore",
  "reduction",
  "reviewMinutes",
  "adoption",
  "hourlyCost",
  "realisation",
  "cashShare",
  "productiveHours",
  "rampMonths",
  "discountRate",
] as const;
const baselineNames = [
  "annualVolume",
  "minutesBefore",
  "hourlyCost",
  "productiveHours",
  "discountRate",
] as const;

function validate(
  option: SolutionOption,
  bau: SolutionOption,
): { issues: string[]; overlap: boolean } {
  const issues: string[] = [];
  let overlap = false;
  for (const candidate of [option, bau]) {
    const parsed = solutionOptionSchema.safeParse(candidate);
    if (!parsed.success) {
      issues.push(
        ...parsed.error.issues.map(
          (i) => `${candidate.name}: ${i.path.join(".")}: ${i.message}`,
        ),
      );
      continue;
    }
    for (const name of inputNames)
      if (candidate.inputs[name] === null)
        issues.push(`${candidate.name}: ${name} is unknown`);
    if (
      candidate.inputs.reviewMinutes !== null &&
      candidate.inputs.minutesBefore !== null &&
      candidate.inputs.reduction !== null &&
      candidate.inputs.reviewMinutes >
        candidate.inputs.minutesBefore * candidate.inputs.reduction
    )
      issues.push(
        `${candidate.name}: Additional review effort exceeds gross time savings; move the excess effort into an explicit incremental review cost and document allocation`,
      );
    if (
      (candidate.inputs.cashShare ?? 0) > 0 &&
      !candidate.cashMechanism.trim()
    )
      issues.push(`${candidate.name}: Document the labour cash mechanism`);
    if (
      (candidate.inputs.reviewMinutes ?? 0) > 0 &&
      candidate.costs.some((c) => c.category === "review" && c.amount !== 0) &&
      !candidate.reviewAllocation.trim()
    )
      issues.push(
        `${candidate.name}: Allocate review costs separately from review minutes`,
      );
    for (const cost of candidate.costs)
      if (cost.amount === null)
        issues.push(`${cost.name}: Cost amount is unknown`);
    const pools = new Map<string, number>([["labour", 1]]);
    for (const b of candidate.benefits.filter((b) => b.enabled))
      pools.set(b.pool, (pools.get(b.pool) ?? 0) + 1);
    for (const b of candidate.benefits.filter((b) => b.enabled)) {
      if (b.annualAmount === null)
        issues.push(`${b.name}: Benefit amount is unknown`);
      if (
        (pools.get(b.pool) ?? 0) > 1 &&
        (!b.overlapResolved || !b.mechanism.trim())
      ) {
        overlap = true;
        issues.push(
          `${b.name}: Pool ${b.pool} requires non-overlapping allocation and its mechanism`,
        );
      }
      if (b.kind === "revenue" && !/margin|contribution/i.test(b.mechanism))
        issues.push(
          `${b.name}: Identify incremental contribution margin, not gross revenue`,
        );
      if (b.cashShare > 0 && !b.mechanism.trim())
        issues.push(`${b.name}: Document cash mechanism`);
    }
  }
  if (bau.kind !== "bau")
    issues.push("Comparison requires a business-as-usual option");
  for (const name of baselineNames)
    if (option.inputs[name] !== bau.inputs[name])
      issues.push(`Baseline mismatch: ${name}`);
  if (bau.inputs.reduction !== null && bau.inputs.reduction !== 0)
    issues.push("BAU reduction must be zero relative to current workload");
  return { issues: [...new Set(issues)], overlap };
}
function incomplete(issues: string[], overlap = false): FinancialResult {
  return {
    status: overlap ? "overlap" : "incomplete",
    issues,
    annualHoursSaved: null,
    fteCapacity: null,
    capacityValue: null,
    annualBenefit: null,
    cashSavings: null,
    investment: null,
    annualOpex: null,
    firstYearNet: null,
    firstYearCashNet: null,
    economicRoi: null,
    cashRoi: null,
    npv: null,
    cashNpv: null,
    paybackMonths: null,
    cashPaybackMonths: null,
    threeYearNet: null,
    maximumViableInvestment: null,
    breakEvenAdoption: null,
    monthly: [],
  };
}
function annual(option: SolutionOption) {
  const i = option.inputs as Known;
  const hours = new Decimal(i.annualVolume)
    .times(
      Decimal.max(
        0,
        new Decimal(i.minutesBefore).times(i.reduction).minus(i.reviewMinutes),
      ),
    )
    .div(60)
    .times(i.adoption);
  const labour = hours.times(i.hourlyCost).times(i.realisation);
  let economic = labour,
    cash = labour.times(i.cashShare);
  for (const b of option.benefits.filter((b) => b.enabled)) {
    const value = new Decimal(b.annualAmount!).times(i.adoption);
    economic = economic.plus(value);
    cash = cash.plus(value.times(b.cashShare));
  }
  return { hours, labour, economic, cash };
}
function costAt(
  option: SolutionOption,
  month: number,
  recurringOnly = false,
): Decimal {
  return option.costs.reduce((sum, c) => {
    if (
      month < c.startMonth ||
      month > c.endMonth ||
      (recurringOnly && c.frequency === "one_time")
    )
      return sum;
    const due =
      c.frequency === "monthly" ||
      (c.frequency === "one_time"
        ? month === c.startMonth
        : (month - c.startMonth) % 12 === 0);
    return due ? sum.plus(c.amount!) : sum;
  }, new Decimal(0));
}
const discountCache = new Map<number, Decimal[]>();
function discounts(rate: number) {
  let result = discountCache.get(rate);
  if (!result) {
    result = Array.from({ length: 37 }, (_, m) =>
      new Decimal(1).plus(rate).pow(new Decimal(m).div(12)),
    );
    if (discountCache.size > 20) discountCache.clear();
    discountCache.set(rate, result);
  }
  return result;
}
// All deterministic, sensitivity and Monte Carlo flows share this core. It does not calculate sensitivity recursively.
function core(
  option: SolutionOption,
  bau: SolutionOption,
  costMultiplier = 1,
  benefitMultiplier = 1,
  includeMonthly = true,
): FinancialResult {
  const i = option.inputs as Known,
    base = bau.inputs as Known;
  const a = annual(option),
    b = annual(bau),
    df = discounts(i.discountRate);
  let cumulative = new Decimal(0),
    cashCumulative = new Decimal(0),
    npv = new Decimal(0),
    cashNpv = new Decimal(0),
    year = new Decimal(0),
    cashYear = new Decimal(0),
    opex = new Decimal(0);
  let payback: number | null = null,
    cashPayback: number | null = null;
  const monthly: MonthlyFlow[] = [];
  const investment = costAt(option, 0)
    .times(costMultiplier)
    .minus(costAt(bau, 0));
  for (let month = 0; month <= 36; month++) {
    const ramp =
      month === 0
        ? 0
        : i.rampMonths === 0
          ? 1
          : Math.min(1, month / i.rampMonths);
    const baseRamp =
      month === 0
        ? 0
        : base.rampMonths === 0
          ? 1
          : Math.min(1, month / base.rampMonths);
    const economicBenefit = a.economic
      .times(ramp)
      .times(benefitMultiplier)
      .minus(b.economic.times(baseRamp))
      .div(12);
    const cashBenefit = a.cash
      .times(ramp)
      .times(benefitMultiplier)
      .minus(b.cash.times(baseRamp))
      .div(12);
    const cost = costAt(option, month)
      .times(costMultiplier)
      .minus(costAt(bau, month));
    const economicNet = economicBenefit.minus(cost),
      cashNet = cashBenefit.minus(cost);
    cumulative = cumulative.plus(economicNet);
    cashCumulative = cashCumulative.plus(cashNet);
    npv = npv.plus(economicNet.div(df[month]));
    cashNpv = cashNpv.plus(cashNet.div(df[month]));
    if (month <= 12) {
      year = year.plus(economicNet);
      cashYear = cashYear.plus(cashNet);
      if (month > 0)
        opex = opex.plus(
          costAt(option, month, true)
            .times(costMultiplier)
            .minus(costAt(bau, month, true)),
        );
    }
    if (cumulative.gte(0) && payback === null) payback = month;
    if (cashCumulative.gte(0) && cashPayback === null) cashPayback = month;
    // A later scheduled investment can undo early break-even; report only sustained payback.
    if (cumulative.lt(0)) payback = null;
    if (cashCumulative.lt(0)) cashPayback = null;
    if (includeMonthly)
      monthly.push({
        month,
        economicBenefit: money(economicBenefit),
        cashBenefit: money(cashBenefit),
        cost: money(cost),
        economicNet: money(economicNet),
        cashNet: money(cashNet),
        cumulative: money(cumulative),
        cashCumulative: money(cashCumulative),
      });
  }
  return {
    status: "complete",
    issues: [],
    annualHoursSaved: money(a.hours.minus(b.hours)),
    fteCapacity: finiteNumber(a.hours.minus(b.hours).div(i.productiveHours)),
    capacityValue: money(a.labour.times(benefitMultiplier).minus(b.labour)),
    annualBenefit: money(a.economic.times(benefitMultiplier).minus(b.economic)),
    cashSavings: money(a.cash.times(benefitMultiplier).minus(b.cash)),
    investment: money(investment),
    annualOpex: money(opex),
    firstYearNet: money(year),
    firstYearCashNet: money(cashYear),
    economicRoi: investment.gt(0) ? finiteNumber(year.div(investment)) : null,
    cashRoi: investment.gt(0) ? finiteNumber(cashYear.div(investment)) : null,
    npv: money(npv),
    cashNpv: money(cashNpv),
    paybackMonths: payback,
    cashPaybackMonths: cashPayback,
    threeYearNet: money(cumulative),
    maximumViableInvestment: money(npv.plus(investment)),
    breakEvenAdoption: null,
    monthly,
  };
}
export function calculateOption(
  option: SolutionOption,
  bau: SolutionOption,
  scenario?: Scenario,
): FinancialResult {
  try {
    return calculateCheckedOption(option, bau, scenario);
  } catch (error) {
    if (error instanceof FinancialRangeError)
      return incomplete([error.message]);
    throw error;
  }
}
function calculateCheckedOption(
  option: SolutionOption,
  bau: SolutionOption,
  scenario?: Scenario,
): FinancialResult {
  const validated = validate(option, bau);
  if (validated.issues.length)
    return incomplete(validated.issues, validated.overlap);
  if (scenario && !scenarioSchema.safeParse(scenario).success)
    return incomplete(["Invalid scenario"]);
  // BAU is the reference itself. A scenario cannot independently perturb only
  // one side of that self-comparison and manufacture incremental costs/value.
  if (option.kind === "bau" && option.id === bau.id)
    return { ...core(bau, bau), breakEvenAdoption: 0 };
  const candidate = scenario
    ? { ...option, inputs: { ...option.inputs, ...scenario.inputPatch } }
    : option;
  const checked = validate(candidate, bau);
  if (checked.issues.length) return incomplete(checked.issues, checked.overlap);
  const costs = scenario?.costMultiplier ?? 1,
    benefits = scenario?.benefitMultiplier ?? 1;
  const result = core(candidate, bau, costs, benefits);
  const at = (adoption: number) =>
    core(
      { ...candidate, inputs: { ...candidate.inputs, adoption } },
      bau,
      costs,
      benefits,
      false,
    ).npv!;
  if (at(1) >= 0) {
    if (at(0) >= 0) result.breakEvenAdoption = 0;
    else {
      let low = 0,
        high = 1;
      for (let k = 0; k < 28; k++) {
        const mid = (low + high) / 2;
        if (at(mid) >= 0) high = mid;
        else low = mid;
      }
      result.breakEvenAdoption = high;
    }
  }
  return result;
}
export function sensitivityOption(option: SolutionOption, bau: SolutionOption) {
  if (option.kind === "bau")
    throw new Error(
      "BAU sensitivity is unsupported; select an alternative to compare against BAU",
    );
  const checked = validate(option, bau);
  if (checked.issues.length) throw new Error(checked.issues.join("; "));
  const npv = (field: "adoption" | "reduction", value: number) => {
    const candidate = {
      ...option,
      inputs: { ...option.inputs, [field]: value },
    };
    const check = validate(candidate, bau);
    if (check.issues.length)
      throw new Error(`Sensitivity: ${check.issues.join("; ")}`);
    return core(candidate, bau, 1, 1, false).npv!;
  };
  return {
    adoption: {
      low: npv("adoption", Math.max(0, option.inputs.adoption! - 0.1)),
      high: npv("adoption", Math.min(1, option.inputs.adoption! + 0.1)),
    },
    reduction: {
      low: npv("reduction", Math.max(0, option.inputs.reduction! - 0.1)),
      high: npv("reduction", Math.min(1, option.inputs.reduction! + 0.1)),
    },
    costMultiplier: {
      low: core(option, bau, 0.8, 1, false).npv!,
      high: core(option, bau, 1.2, 1, false).npv!,
    },
  };
}
export type TriangularRange = { min: number; mode: number; max: number };
export type SimulationRanges = {
  inputRevision: number;
  adoption?: TriangularRange;
  reduction?: TriangularRange;
  costMultiplier?: TriangularRange;
};
export function simulateOption(
  option: SolutionOption,
  bau: SolutionOption,
  seed: number,
  ranges?: SimulationRanges,
): SimulationSummary {
  if (option.kind === "bau")
    throw new Error(
      "BAU simulation is unsupported; select an alternative to compare against BAU",
    );
  const checked = validate(option, bau);
  if (checked.issues.length) throw new Error(checked.issues.join("; "));
  if (
    !Number.isInteger(seed) ||
    !ranges ||
    !Number.isInteger(ranges.inputRevision) ||
    ranges.inputRevision < 0
  )
    throw new Error("Integer seed and caller inputRevision are required");
  const around = (n: number): TriangularRange => ({
    min: Math.max(0, n - 0.1),
    mode: n,
    max: Math.min(1, n + 0.1),
  });
  const bounds = {
    adoption: ranges.adoption ?? around(option.inputs.adoption!),
    reduction: ranges.reduction ?? around(option.inputs.reduction!),
    costMultiplier: ranges.costMultiplier ?? { min: 0.8, mode: 1, max: 1.2 },
  };
  for (const [key, r] of Object.entries(bounds))
    if (
      ![r.min, r.mode, r.max].every(Number.isFinite) ||
      r.min < 0 ||
      r.min > r.mode ||
      r.mode > r.max ||
      (key !== "costMultiplier" && r.max > 1)
    )
      throw new Error(`Invalid triangular range: ${key}`);
  if (
    option.inputs.reviewMinutes! >
    option.inputs.minutesBefore! * bounds.reduction.min
  )
    throw new Error(
      "Simulation range includes additional review effort; cost and allocate the excess effort before simulation",
    );
  let state = seed >>> 0;
  function random() {
    state = (state + 0x6d2b79f5) | 0;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  }
  function triangular(r: TriangularRange) {
    if (r.min === r.max) return r.min;
    const u = random(),
      width = r.max - r.min;
    // Preserve the v2.1 draw sequence and normal-range arithmetic exactly.
    return finiteResult(
      u < (r.mode - r.min) / width
        ? r.min + Math.sqrt(u * width * (r.mode - r.min))
        : r.max - Math.sqrt((1 - u) * width * (r.max - r.mode)),
    );
  }
  const values: number[] = [];
  let paidBack = 0;
  for (let draw = 0; draw < 10000; draw++) {
    const candidate = {
      ...option,
      inputs: {
        ...option.inputs,
        adoption: triangular(bounds.adoption),
        reduction: triangular(bounds.reduction),
      },
    };
    const result = core(
      candidate,
      bau,
      triangular(bounds.costMultiplier),
      1,
      false,
    );
    values.push(result.npv!);
    if (result.paybackMonths !== null) paidBack++;
  }
  values.sort((a, b) => a - b);
  const min = values[0],
    max = values.at(-1)!,
    width = finiteResult((max - min) / 20);
  const histogram = Array.from({ length: 20 }, (_, k) => ({
    min: finiteResult(min + k * width),
    max: finiteResult(min + (k + 1) * width),
    count: 0,
  }));
  values.forEach(
    (n) =>
      histogram[
        width === 0
          ? 0
          : Math.min(19, Math.floor(finiteResult(n - min) / width))
      ].count++,
  );
  return {
    modelVersion: "assessment-v2.1",
    seed,
    inputRevision: ranges.inputRevision,
    ranges: structuredClone(bounds),
    draws: 10000,
    p10: values[999],
    p50: values[4999],
    p90: values[8999],
    histogram,
    paybackProbability: paidBack / 10000,
    methodology:
      "10,000 independent triangular draws for adoption, reduction and option cost multiplier; correlations are not modelled. NPV and economic payback over 36 months.",
  };
}
