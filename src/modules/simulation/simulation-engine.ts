export type TriangularRange = {
  minimum: number;
  mode: number;
  maximum: number;
};
export type SimulationInput = {
  baseAnnualBenefit: number;
  annualOperatingCost: number;
  implementationCost: number;
  benefitRange: TriangularRange;
  adoptionRange: TriangularRange;
  failureRange: TriangularRange;
  iterations: number;
  seed: number;
};
export type SimulationDistribution = {
  annualValue: { p10: number; p50: number; p90: number };
  paybackWithinTwelveMonthsProbability: number;
  iterations: number;
  seed: number;
};

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
}

function triangular(random: () => number, range: TriangularRange) {
  if (range.minimum > range.mode || range.mode > range.maximum)
    throw new RangeError(
      "Triangular range must satisfy minimum ≤ mode ≤ maximum",
    );
  if (range.minimum === range.maximum) return range.minimum;
  const u = random();
  const pivot = (range.mode - range.minimum) / (range.maximum - range.minimum);
  return u < pivot
    ? range.minimum +
        Math.sqrt(
          u * (range.maximum - range.minimum) * (range.mode - range.minimum),
        )
    : range.maximum -
        Math.sqrt(
          (1 - u) *
            (range.maximum - range.minimum) *
            (range.maximum - range.mode),
        );
}

function percentile(sorted: number[], point: number) {
  const index = (sorted.length - 1) * point;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower] ?? 0;
  const fraction = index - lower;
  return (
    (sorted[lower] ?? 0) * (1 - fraction) + (sorted[upper] ?? 0) * fraction
  );
}

export const SimulationEngine = {
  run(input: SimulationInput): SimulationDistribution {
    if (!Number.isInteger(input.iterations) || input.iterations < 100)
      throw new RangeError(
        "Simulation iterations must be an integer of at least 100",
      );
    const random = createRandom(input.seed);
    const values: number[] = [];
    let paysBackWithinYear = 0;
    for (let iteration = 0; iteration < input.iterations; iteration += 1) {
      const annualValue =
        input.baseAnnualBenefit *
          triangular(random, input.benefitRange) *
          triangular(random, input.adoptionRange) *
          (1 - triangular(random, input.failureRange)) -
        input.annualOperatingCost;
      values.push(annualValue);
      if (
        annualValue > 0 &&
        input.implementationCost / (annualValue / 12) <= 12
      )
        paysBackWithinYear += 1;
    }
    values.sort((a, b) => a - b);
    return {
      annualValue: {
        p10: Math.round(percentile(values, 0.1)),
        p50: Math.round(percentile(values, 0.5)),
        p90: Math.round(percentile(values, 0.9)),
      },
      paybackWithinTwelveMonthsProbability: Number(
        (paysBackWithinYear / input.iterations).toFixed(4),
      ),
      iterations: input.iterations,
      seed: input.seed,
    };
  },
};
