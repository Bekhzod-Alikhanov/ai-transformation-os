import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { getWorkspaceContext } from "@/modules/auth/workspace-context.server";

import { WorkspaceShell } from "./workspace-shell";

vi.mock("@/modules/auth/workspace-context.server", () => ({
  getWorkspaceContext: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("WorkspaceShell", () => {
  it("does not render authenticated navigation for signed-out content", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue(null);

    render(await WorkspaceShell({ children: <div>Sign in content</div> }));

    expect(screen.getByText("Sign in content")).toBeVisible();
    expect(
      screen.queryByRole("navigation", { name: "Primary navigation" }),
    ).not.toBeInTheDocument();
  });

  it("renders the workspace shell for an authenticated membership", async () => {
    vi.mocked(getWorkspaceContext).mockResolvedValue({
      organisationId: "live-organisation",
      mode: "live",
      displayName: "Beck",
      role: "owner",
      capabilities: ["overview", "opportunities"],
    });

    render(await WorkspaceShell({ children: <div>Workspace content</div> }));

    expect(
      screen.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeVisible();
    expect(screen.getByText("Beck")).toBeVisible();
  });
});
