import { AutonomyPolicy } from "./autonomy-policy";

describe("AutonomyPolicy", () => {
  it("makes autonomy an explicit control and economics tradeoff", () => {
    const assisted = AutonomyPolicy.resolve("assisted");
    const supervised = AutonomyPolicy.resolve("supervised");

    expect(assisted.permittedTools).not.toContain("external_write");
    expect(supervised.approvalPoints).toContain("before_external_action");
    expect(supervised.humanReviewMinutes).toBeLessThan(
      assisted.humanReviewMinutes,
    );
    expect(supervised.riskMultiplier).toBeGreaterThan(assisted.riskMultiplier);
  });
});
