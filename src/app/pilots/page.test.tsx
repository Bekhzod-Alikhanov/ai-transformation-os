import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { requireWorkspaceCapability } from "@/modules/auth/workspace-routes.server";

import PilotsPage from "./page";

vi.mock("@/modules/auth/workspace-routes.server", () => ({
  requireWorkspaceCapability: vi.fn(),
}));

it("enforces the pilots capability before rendering synthetic data", async () => {
  vi.mocked(requireWorkspaceCapability).mockResolvedValue({
    organisationId: "demo-org",
    mode: "synthetic_replay",
    displayName: "Demo operator",
    role: "owner",
    capabilities: ["pilots"],
  });

  render(await PilotsPage());

  expect(
    screen.getByRole("heading", { level: 1, name: "Pilot portfolio" }),
  ).toBeVisible();
  expect(requireWorkspaceCapability).toHaveBeenCalledWith("pilots");
});
