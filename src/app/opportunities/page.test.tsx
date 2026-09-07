import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";
import { getRequestActor } from "@/modules/auth/request-actor";

import OpportunitiesPage from "./page";

vi.mock("@/modules/auth/workspace-routes.server", () => ({
  requireWorkspaceCapability: vi.fn(),
}));
vi.mock("@/modules/auth/request-actor", () => ({
  getRequestActor: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT:/demo");
  }),
}));

it("shows the live operational draft queue instead of Aster opportunities in live mode", async () => {
  vi.mocked(requireWorkspaceCapability).mockResolvedValue({
    organisationId: "beck-org",
    mode: "live",
    displayName: "Beck",
    role: "owner",
    capabilities: ["opportunities"],
  });
  vi.mocked(getRequestActor).mockResolvedValue({
    userId: "beck-user",
    organisationId: "beck-org",
    displayName: "Beck",
    role: "owner",
    synthetic: false,
  });

  render(await OpportunitiesPage());

  expect(screen.getByText(/No active opportunity drafts/i)).toBeVisible();
  expect(screen.queryByText("27 opportunities")).not.toBeInTheDocument();
  expect(requireWorkspaceCapability).toHaveBeenCalledWith("opportunities");
});

it("redirects synthetic sessions away from the legacy opportunity portfolio", async () => {
  vi.mocked(requireWorkspaceCapability).mockResolvedValue({
    organisationId: "demo-org",
    mode: "synthetic_replay",
    displayName: "Synthetic Replay",
    role: "owner",
    capabilities: ["opportunities"],
  });

  await expect(OpportunitiesPage()).rejects.toThrow("NEXT_REDIRECT:/demo");
});
