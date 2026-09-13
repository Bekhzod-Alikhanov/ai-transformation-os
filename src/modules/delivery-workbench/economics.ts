import Decimal from "decimal.js";
import { z } from "zod";

const amount = z.number().finite().min(0).max(1e12);
const fraction = z.number().finite().min(0).max(1);
export const inputSchema = z
  .object({
    annualVolume: amount.positive(),
    minutesBefore: amount.positive(),
    reduction: fraction,
    reviewMinutes: amount,
    adoption: fraction,
    hourlyCost: amount,
    realisation: fraction,
    cashShare: fraction,
    productiveHours: amount.positive(),
    implementationCost: amount,
    annualRunCost: amount,
    rampMonths: z.number().int().min(0).max(12),
    discountRate: fraction,
  })
  .strict();
export type EconomicInput = z.infer<typeof inputSchema>;
type Month = {
  month: number;
  benefit: number;
  opex: number;
  net: number;
  cumulative: number;
};
const D = (n: number) => new Decimal(n);

function schedule(input: EconomicInput) {
  return Array.from({ length: 36 }, (_, i) => ({
    month: i + 1,
    ramp:
      input.rampMonths === 0
        ? D(1)
        : Decimal.min(1, D(i + 1).div(input.rampMonths)),
    discount: D(1)
      .plus(input.discountRate)
      .pow((i + 1) / 12),
  }));
}
function compute(
  input: EconomicInput,
  months: ReturnType<typeof schedule>,
  detailed = true,
) {
  const savedMinutes = Decimal.max(
    0,
    D(input.minutesBefore).times(input.reduction).minus(input.reviewMinutes),
  );
  const hours = D(input.annualVolume)
    .times(savedMinutes)
    .div(60)
    .times(input.adoption);
  const capacity = hours.times(input.hourlyCost);
  const annualBenefit = capacity.times(input.realisation);
  const cashSavings = annualBenefit.times(input.cashShare);
  const monthlyOpex = D(input.annualRunCost).div(12);
  let cumulative = D(input.implementationCost).negated();
  let npv = cumulative;
  let cashNpv = cumulative;
  let yearOneBenefit = D(0);
  let yearOneNet = cumulative;
  let paybackMonths: number | null = input.implementationCost === 0 ? 0 : null;
  const monthly: Month[] = [];
  for (const month of months) {
    const benefit = annualBenefit.div(12).times(month.ramp);
    const net = benefit.minus(monthlyOpex);
    const previous = cumulative;
    cumulative = cumulative.plus(net);
    npv = npv.plus(net.div(month.discount));
    cashNpv = cashNpv.plus(
      benefit.times(input.cashShare).minus(monthlyOpex).div(month.discount),
    );
    if (month.month <= 12) {
      yearOneBenefit = yearOneBenefit.plus(benefit);
      yearOneNet = yearOneNet.plus(net);
    }
    if (
      paybackMonths === null &&
      previous.lt(0) &&
      cumulative.gte(0) &&
      net.gt(0)
    )
      paybackMonths = month.month - 1 + previous.negated().div(net).toNumber();
    if (detailed)
      monthly.push({
        month: month.month,
        benefit: benefit.toNumber(),
        opex: monthlyOpex.toNumber(),
        net: net.toNumber(),
        cumulative: cumulative.toNumber(),
      });
  }
  return {
    annualHoursSaved: hours.toNumber(),
    fteCapacity: hours.div(input.productiveHours).toNumber(),
    capacityValue: capacity.toNumber(),
    annualBenefit: annualBenefit.toNumber(),
    cashSavings: cashSavings.toNumber(),
    annualNet: annualBenefit.minus(input.annualRunCost).toNumber(),
    yearOneBenefit: yearOneBenefit.toNumber(),
    yearOneNet: yearOneNet.toNumber(),
    firstYearRoi:
      input.implementationCost === 0
        ? null
        : yearOneNet.div(input.implementationCost).toNumber(),
    paybackMonths,
    npv: npv.toNumber(),
    cashNpv: cashNpv.toNumber(),
    threeYearNet: cumulative.toNumber(),
    monthly,
  };
}
export function calculateEconomics(input: EconomicInput) {
  const parsed = inputSchema.parse(input);
  return compute(parsed, schedule(parsed));
}
export type EconomicResult = ReturnType<typeof calculateEconomics>;

type Range = { min: number; mode: number; max: number };
export type SimulationRanges = Record<
  "adoption" | "reduction" | "implementationCost" | "annualRunCost",
  Range
>;
export function simulateEconomics(
  input: EconomicInput,
  seed = 20260912,
  overrides: Partial<SimulationRanges> = {},
) {
  const parsed = inputSchema.parse(input);
  if (!Number.isSafeInteger(seed))
    throw new Error("Seed must be a finite integer.");
  const ranges: SimulationRanges = {
    adoption: {
      min: Math.max(0, input.adoption - 0.2),
      mode: input.adoption,
      max: Math.min(1, input.adoption + 0.1),
    },
    reduction: {
      min: Math.max(0, input.reduction - 0.15),
      mode: input.reduction,
      max: Math.min(1, input.reduction + 0.08),
    },
    implementationCost: {
      min: input.implementationCost * 0.9,
      mode: input.implementationCost,
      max: input.implementationCost * 1.3,
    },
    annualRunCost: {
      min: input.annualRunCost * 0.9,
      mode: input.annualRunCost,
      max: input.annualRunCost * 1.25,
    },
    ...overrides,
  };
  for (const [key, r] of Object.entries(ranges)) {
    if (
      ![r.min, r.mode, r.max].every(Number.isFinite) ||
      r.min < 0 ||
      r.min > r.mode ||
      r.mode > r.max ||
      r.max > (key === "adoption" || key === "reduction" ? 1 : 1e12)
    )
      throw new Error("Invalid uncertainty range: " + key);
  }
  let state = seed >>> 0 || 0x9e3779b9;
  function random() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  }
  function sample(r: Range) {
    if (r.min === r.max) return r.min;
    const u = random();
    const pivot = (r.mode - r.min) / (r.max - r.min);
    return u < pivot
      ? r.min + Math.sqrt(u * (r.max - r.min) * (r.mode - r.min))
      : r.max - Math.sqrt((1 - u) * (r.max - r.min) * (r.max - r.mode));
  }
  const values: number[] = [];
  let paysBack = 0;
  const months = schedule(parsed);
  for (let i = 0; i < 10000; i++) {
    const result = compute(
      {
        ...parsed,
        adoption: sample(ranges.adoption),
        reduction: sample(ranges.reduction),
        implementationCost: sample(ranges.implementationCost),
        annualRunCost: sample(ranges.annualRunCost),
      },
      months,
      false,
    );
    values.push(result.npv);
    if (result.paybackMonths !== null) paysBack++;
  }
  values.sort((a, b) => a - b);
  const percentile = (p: number) => {
    const idx = 9999 * p;
    const low = Math.floor(idx);
    return (
      values[low]! + (values[Math.ceil(idx)]! - values[low]!) * (idx - low)
    );
  };
  const min = values[0]!;
  const max = values[9999]!;
  const histogram =
    min === max
      ? [{ from: min, to: max, count: 10000 }]
      : Array.from({ length: 12 }, (_, i) => ({
          from: min + ((max - min) * i) / 12,
          to: i === 11 ? max : min + ((max - min) * (i + 1)) / 12,
          count: 0,
        }));
  if (min !== max)
    for (const value of values)
      histogram[Math.min(11, Math.floor(((value - min) / (max - min)) * 12))]!
        .count++;
  return {
    seed,
    iterations: 10000 as const,
    p10: percentile(0.1),
    p50: percentile(0.5),
    p90: percentile(0.9),
    paybackProbability: paysBack / 10000,
    histogram,
  };
}
export type SimulationResult = ReturnType<typeof simulateEconomics>;
export function sensitivity(input: EconomicInput) {
  const base = calculateEconomics(input).npv;
  const dimensions: {
    label: string;
    key: keyof EconomicInput;
    low: number;
    high: number;
  }[] = [
    {
      label: "Adoption",
      key: "adoption",
      low: Math.max(0, input.adoption - 0.2),
      high: Math.min(1, input.adoption + 0.1),
    },
    {
      label: "Implementation cost",
      key: "implementationCost",
      low: input.implementationCost * 0.8,
      high: input.implementationCost * 1.2,
    },
    {
      label: "Review time",
      key: "reviewMinutes",
      low: input.reviewMinutes * 0.5,
      high: input.reviewMinutes * 1.5,
    },
    {
      label: "Time reduction",
      key: "reduction",
      low: Math.max(0, input.reduction - 0.1),
      high: Math.min(1, input.reduction + 0.1),
    },
    {
      label: "Annual run cost",
      key: "annualRunCost",
      low: input.annualRunCost * 0.8,
      high: input.annualRunCost * 1.2,
    },
  ];
  return dimensions.map((d) => ({
    label: d.label,
    low: calculateEconomics({ ...input, [d.key]: d.low }).npv,
    base,
    high: calculateEconomics({ ...input, [d.key]: d.high }).npv,
  }));
}
