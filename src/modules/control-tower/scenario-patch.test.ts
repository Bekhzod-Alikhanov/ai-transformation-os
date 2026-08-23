import { ScenarioPatchService } from "./scenario-patch";

describe("ScenarioPatchService", () => {
  it("turns supported natural language into a validated temporary patch", () => {
    expect(
      ScenarioPatchService.parse("Assume labour savings are 30% lower"),
    ).toEqual({
      intent: "temporary_scenario",
      patch: { labourBenefitMultiplier: 0.7 },
      requiresApproval: false,
    });
  });

  it("rejects unsupported scenario claims instead of inventing a patch", () => {
    expect(() =>
      ScenarioPatchService.parse("Make this use case excellent"),
    ).toThrow(/supported scenario/i);
  });
});
