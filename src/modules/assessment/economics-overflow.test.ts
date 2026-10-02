import { expect, it } from "vitest";
import { createTemplate as template } from "./templates";
const createTemplate = (kind: "support" | "reporting") =>
  template(kind, "legacy_aggregate");
import {
  calculateOption,
  sensitivityOption,
  simulateOption,
} from "./economics";

it("refuses schema-valid unrepresentable products without rewriting assumptions", () => {
  const o = createTemplate("support").opportunities[0];
  o.options.forEach((x) => {
    x.inputs.annualVolume = 1e200;
    x.inputs.hourlyCost = 1e200;
  });
  const before = structuredClone(o);
  const result = calculateOption(o.options[2], o.options[0]);
  expect(result.status).toBe("incomplete");
  expect(result.npv).toBeNull();
  expect(result.issues.join(" ")).toMatch(/range|represent/i);
  expect(() => sensitivityOption(o.options[2], o.options[0])).toThrow(
    /range|represent/i,
  );
  expect(() =>
    simulateOption(o.options[2], o.options[0], 1, { inputRevision: 0 }),
  ).toThrow(/range|represent/i);
  expect(o).toEqual(before);
});
it("refuses overflow from scenarios and tiny denominators", () => {
  const o = createTemplate("support").opportunities[0];
  expect(
    calculateOption(o.options[2], o.options[0], {
      id: "huge",
      name: "Huge",
      inputPatch: {},
      costMultiplier: 1e308,
      benefitMultiplier: 1,
    }).status,
  ).toBe("incomplete");
  o.options.forEach((x) => {
    x.inputs.productiveHours = 1e-320;
  });
  expect(calculateOption(o.options[2], o.options[0]).status).toBe("incomplete");
});
it("rejects unsafe sampled multipliers before storing a non-finite summary", () => {
  const o = createTemplate("support").opportunities[0];
  expect(() =>
    simulateOption(o.options[2], o.options[0], 7, {
      inputRevision: 0,
      costMultiplier: { min: 1e307, mode: 1e308, max: 1.7e308 },
    }),
  ).toThrow(/range|represent/i);
});
