import { beforeEach, expect, it, vi } from "vitest";

import { getRequestActor } from "@/modules/auth/request-actor";
import { generateDecisionBrief } from "@/modules/exports/brief-document";
import { generateSteeringPack } from "@/modules/exports/steering-pack";

import { GET as getDecisionBrief } from "./decision-brief/route";
import { GET as getSteeringPack } from "./steering-pack/route";

vi.mock("@/modules/auth/request-actor", () => ({
  getRequestActor: vi.fn(),
}));

vi.mock("@/modules/exports/brief-document", () => ({
  generateDecisionBrief: vi.fn(),
}));

vi.mock("@/modules/exports/steering-pack", () => ({
  generateSteeringPack: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRequestActor).mockResolvedValue({
    userId: "beck-user",
    organisationId: "beck-org",
    displayName: "Beck",
    role: "owner",
    synthetic: false,
  });
});

it.each([
  ["decision brief", getDecisionBrief, generateDecisionBrief],
  ["steering pack", getSteeringPack, generateSteeringPack],
] as const)(
  "does not export the synthetic %s from a live workspace",
  async (_name, route, generator) => {
    const response = await route();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "This export is available only in the synthetic demo",
    });
    expect(generator).not.toHaveBeenCalled();
  },
);
