import { ActionPolicy } from "./action-policy";

describe("ActionPolicy", () => {
  it("requires approval for external and persistent effects", () => {
    expect(
      ActionPolicy.evaluate(
        { kind: "external_action", risk: "medium" },
        { roles: ["transformation_lead"] },
      ),
    ).toEqual({
      allowed: true,
      requiresApproval: true,
      requiredRoles: ["owner", "admin", "approver"],
      reason: "External actions require explicit approval",
    });
    expect(
      ActionPolicy.evaluate(
        { kind: "temporary_scenario", risk: "low" },
        { roles: ["analyst"] },
      ).requiresApproval,
    ).toBe(false);
  });

  it("denies action proposals from viewers", () => {
    expect(
      ActionPolicy.evaluate(
        { kind: "external_action", risk: "low" },
        { roles: ["viewer"] },
      ).allowed,
    ).toBe(false);
  });
});
