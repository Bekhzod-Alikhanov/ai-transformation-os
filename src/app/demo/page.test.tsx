import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { vi } from "vitest";

import { getWorkspaceContext } from "@/modules/auth/workspace-context.server";

import DemoPage from "./page";

vi.mock("@/modules/auth/workspace-context.server", () => ({
  getWorkspaceContext: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("DemoPage", () => {
  it("starts an anonymous demo when no workspace exists", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue(null);

    await DemoPage();

    expect(redirect).toHaveBeenCalledWith("/api/auth/demo?returnTo=/demo");
  });

  it("keeps an authenticated Beck actor out of synthetic mode", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      organisationId: "live-organisation",
      mode: "live",
      displayName: "Beck",
      role: "owner",
      capabilities: ["overview"],
    });

    await DemoPage();

    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("renders a clearly labelled synthetic replay for Aster", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      organisationId: "demo-organisation",
      mode: "synthetic_replay",
      displayName: "Demo Owner",
      role: "owner",
      capabilities: ["overview", "pilots"],
    });

    render(await DemoPage());

    expect(screen.getByText("Synthetic Replay")).toBeVisible();
  });
});
