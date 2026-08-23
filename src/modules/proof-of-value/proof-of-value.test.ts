import { ProofOfValueService } from "./proof-of-value";

describe("ProofOfValueService", () => {
  it("replays support triage with the same governed event contract as live mode", async () => {
    const result = await ProofOfValueService.run({
      templateId: "support-triage",
      mode: "synthetic_replay",
      input: "A synthetic card dispute enquiry",
    });
    expect(result.templateId).toBe("support-triage");
    expect(result.mode).toBe("synthetic_replay");
    expect(result.metrics.quality).toBe(0.93);
    expect(result.safety.externalActionExecuted).toBe(false);
  });
});
