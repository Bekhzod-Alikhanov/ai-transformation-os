import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import type { WorkspaceContext } from "@/modules/auth/workspace-context";
import { AppShell } from "./app-shell";
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
const workspace: WorkspaceContext = {
  organisationId: "live",
  mode: "live",
  displayName: "Beck",
  role: "owner",
  capabilities: [
    "overview",
    "opportunities",
    "processes",
    "portfolio",
    "decisions",
    "agent_blueprints",
    "activity",
    "approvals",
    "integrations",
    "settings",
  ],
};
describe("AppShell", () => {
  it("filters live navigation and renders membership identity", () => {
    render(
      <AppShell workspace={workspace}>
        <div>Page content</div>
      </AppShell>,
    );
    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(
      within(navigation).getByRole("link", { name: "Opportunities" }),
    ).toHaveAttribute("href", "/opportunities");
    expect(screen.getByText("Beck")).toBeVisible();
    for (const label of [
      "Pilots",
      "Realised value",
      "Automations",
      "Model Lab",
    ])
      expect(within(navigation).queryByText(label)).not.toBeInTheDocument();
  });
  it("lets the self-contained demo own its navigation without a duplicate shell", () => {
    render(
      <AppShell workspace={{ ...workspace, mode: "synthetic_replay" }}>
        <div>Delivery workbench</div>
      </AppShell>,
    );
    expect(screen.getByText("Delivery workbench")).toBeVisible();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
