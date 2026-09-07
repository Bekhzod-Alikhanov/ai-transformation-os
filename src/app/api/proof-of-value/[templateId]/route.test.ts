import { expect, it, vi } from "vitest";

import { getRequestActor } from "@/modules/auth/request-actor";
import { ProofOfValueService } from "@/modules/proof-of-value/proof-of-value";

import { POST } from "./route";

vi.mock("@/modules/auth/request-actor", () => ({
  getRequestActor: vi.fn(),
}));

vi.mock("@/modules/proof-of-value/proof-of-value", () => ({
  proofTemplateIds: ["executive-brief"],
  ProofOfValueService: { run: vi.fn() },
}));

it("does not run a demo-only proof template from a live workspace", async () => {
  vi.mocked(getRequestActor).mockResolvedValue({
    userId: "beck-user",
    organisationId: "beck-org",
    displayName: "Beck",
    role: "owner",
    synthetic: false,
  });
  const request = new Request(
    "https://example.test/api/proof-of-value/executive-brief",
    {
      method: "POST",
      body: JSON.stringify({
        mode: "synthetic_replay",
        input: "Organisation evidence",
      }),
    },
  );

  const response = await POST(request, {
    params: Promise.resolve({ templateId: "executive-brief" }),
  });

  expect(response.status).toBe(403);
  expect(ProofOfValueService.run).not.toHaveBeenCalled();
});
