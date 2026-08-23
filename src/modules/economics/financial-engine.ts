import Decimal from "decimal.js";

type LabourValueInput = {
  employees: number;
  tasksPerEmployeePerWeek: number;
  minutesPerTask: number;
  loadedHourlyCost: number;
  expectedTimeReduction: number;
  adoption: number;
  utilisation: number;
  redeployability: number;
};

type RevenueValueInput = {
  annualVolume: number;
  conversionRate: number;
  revenuePerConversion: number;
  expectedUplift: number;
  adoption: number;
  confidence: number;
};

type QualityValueInput = {
  annualErrorFrequency: number;
  costPerError: number;
  expectedReduction: number;
};

type ImplementationCosts = {
  engineering: number;
  consulting: number;
  integration: number;
  changeManagement: number;
  training: number;
  model: number;
  licensing: number;
};

type OperatingCosts = {
  model: number;
  software: number;
  monitoring: number;
  support: number;
  humanReview: number;
};

export type FinancialInput = {
  labour?: LabourValueInput;
  revenue?: RevenueValueInput;
  quality?: QualityValueInput;
  implementationCosts: ImplementationCosts;
  annualOperatingCosts: OperatingCosts;
  discountRate: number;
};

export type FinancialResult = {
  labourBenefit: number;
  revenueBenefit: number;
  qualityBenefit: number;
  grossAnnualBenefit: number;
  netAnnualBenefit: number;
  implementationCost: number;
  annualOperatingCost: number;
  firstYearRoi: number | null;
  paybackMonths: number | null;
  threeYearNpv: number;
  threeYearCumulativeValue: number;
  formulas: Record<"labour" | "revenue" | "quality" | "roi" | "npv", string>;
};

const ZERO = new Decimal(0);

function toMoney(value: Decimal) {
  return value.toDecimalPlaces(2).toNumber();
}

function sumValues(values: Record<string, number>) {
  return Object.values(values).reduce(
    (total, value) => total.plus(value),
    ZERO,
  );
}

function assertRate(name: string, value: number) {
  if (value < 0 || value > 1)
    throw new RangeError(`${name} must be between 0 and 1`);
}

function validate(input: FinancialInput) {
  assertRate("discountRate", input.discountRate);
  const rates = [
    input.labour?.expectedTimeReduction,
    input.labour?.adoption,
    input.labour?.utilisation,
    input.labour?.redeployability,
    input.revenue?.conversionRate,
    input.revenue?.expectedUplift,
    input.revenue?.adoption,
    input.revenue?.confidence,
    input.quality?.expectedReduction,
  ].filter((value): value is number => value !== undefined);
  rates.forEach((rate) => assertRate("Financial rate", rate));
}

export const FinancialEngine = {
  calculate(input: FinancialInput): FinancialResult {
    validate(input);
    const labourBenefit = input.labour
      ? new Decimal(input.labour.employees)
          .times(input.labour.tasksPerEmployeePerWeek)
          .times(52)
          .times(input.labour.minutesPerTask)
          .div(60)
          .times(input.labour.loadedHourlyCost)
          .times(input.labour.expectedTimeReduction)
          .times(input.labour.adoption)
          .times(input.labour.utilisation)
          .times(input.labour.redeployability)
      : ZERO;
    const revenueBenefit = input.revenue
      ? new Decimal(input.revenue.annualVolume)
          .times(input.revenue.conversionRate)
          .times(input.revenue.revenuePerConversion)
          .times(input.revenue.expectedUplift)
          .times(input.revenue.adoption)
          .times(input.revenue.confidence)
      : ZERO;
    const qualityBenefit = input.quality
      ? new Decimal(input.quality.annualErrorFrequency)
          .times(input.quality.costPerError)
          .times(input.quality.expectedReduction)
      : ZERO;
    const grossAnnualBenefit = labourBenefit
      .plus(revenueBenefit)
      .plus(qualityBenefit);
    const implementationCost = sumValues(input.implementationCosts);
    const annualOperatingCost = sumValues(input.annualOperatingCosts);
    const netAnnualBenefit = grossAnnualBenefit.minus(annualOperatingCost);
    const firstYearRoi = implementationCost.isZero()
      ? null
      : netAnnualBenefit.minus(implementationCost).div(implementationCost);
    const paybackMonths = netAnnualBenefit.lte(0)
      ? null
      : implementationCost.div(netAnnualBenefit.div(12));
    let discountedCashFlows = ZERO;
    for (let year = 1; year <= 3; year += 1) {
      discountedCashFlows = discountedCashFlows.plus(
        netAnnualBenefit.div(new Decimal(1).plus(input.discountRate).pow(year)),
      );
    }
    const threeYearNpv = discountedCashFlows.minus(implementationCost);
    const threeYearCumulativeValue = netAnnualBenefit
      .times(3)
      .minus(implementationCost);

    return {
      labourBenefit: toMoney(labourBenefit),
      revenueBenefit: toMoney(revenueBenefit),
      qualityBenefit: toMoney(qualityBenefit),
      grossAnnualBenefit: toMoney(grossAnnualBenefit),
      netAnnualBenefit: toMoney(netAnnualBenefit),
      implementationCost: toMoney(implementationCost),
      annualOperatingCost: toMoney(annualOperatingCost),
      firstYearRoi: firstYearRoi?.toDecimalPlaces(4).toNumber() ?? null,
      paybackMonths: paybackMonths?.toDecimalPlaces(2).toNumber() ?? null,
      threeYearNpv: toMoney(threeYearNpv),
      threeYearCumulativeValue: toMoney(threeYearCumulativeValue),
      formulas: {
        labour:
          "employees × tasks/week × 52 × minutes/60 × loaded cost × time reduction × adoption × utilisation × redeployability",
        revenue:
          "annual volume × conversion × revenue/conversion × expected uplift × adoption × confidence",
        quality: "annual errors × cost/error × expected reduction",
        roi: "(net annual benefit − implementation cost) ÷ implementation cost",
        npv: "−implementation cost + Σ(net annual benefit ÷ (1 + discount rate)^year), years 1–3",
      },
    };
  },
};
