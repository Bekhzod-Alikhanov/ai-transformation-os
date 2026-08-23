import { CommitteeService } from "./committee-service";

describe("CommitteeService", () => {
  it("runs specialists independently and applies hard decision gates", async () => {
    const result = await CommitteeService.run({
      organisationId: "org-aster",
      useCaseId: "client-status-reporting",
      evidenceCoverage: 0.32,
      maximumRiskScore: 39,
      threeYearNpv: 1_700_000,
      mode: "synthetic_replay",
    });

    expect(result.specialists).toHaveLength(5);
    expect(result.decision).toBe("experiment_first");
    expect(result.policyGate).toBe("insufficient_evidence");
  });
});
