import {
  opportunityMinerOutputSchema,
  specialistOutputSchema,
} from "./schemas";

describe("agent output contracts", () => {
  it("rejects uncited opportunity claims", () => {
    expect(() =>
      opportunityMinerOutputSchema.parse({
        title: "Case",
        summary: "Claim",
        evidenceRefs: [],
        confidence: 0.8,
        assumptions: [],
      }),
    ).toThrow();
  });

  it("accepts concise specialist rationale without a reasoning trace", () => {
    const output = specialistOutputSchema.parse({
      recommendation: "conditional_go",
      score: 72,
      confidence: 0.74,
      rationale: "Proceed only after source entitlements are verified.",
      objections: ["Adoption baseline is weak"],
      evidenceRefs: ["ev-1"],
    });
    expect(output.rationale).toContain("source entitlements");
    expect(output).not.toHaveProperty("chainOfThought");
  });
});
