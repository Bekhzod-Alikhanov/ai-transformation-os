import { render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import type { WorkspaceContext } from "@/modules/auth/workspace-context";

import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const liveWorkspace: WorkspaceContext = {
  organisationId: "live-organisation",
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

const demoWorkspace: WorkspaceContext = {
  ...liveWorkspace,
  organisationId: "demo-organisation",
  mode: "synthetic_replay",
  displayName: "Demo Owner",
  capabilities: [
    ...liveWorkspace.capabilities,
    "model_lab",
    "pilots",
    "automations",
    "realised_value",
    "advanced_process_editing",
  ],
};

describe("AppShell", () => {
  it("filters live navigation by capabilities and renders membership identity", () => {
    render(
      <AppShell workspace={liveWorkspace}>
        <div>Page content</div>
      </AppShell>,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(navigation).toBeInTheDocument();
    expect(
      within(navigation).getByRole("link", { name: "Opportunities" }),
    ).toHaveAttribute("href", "/opportunities");
    expect(screen.getByText("AI Transformation OS")).toBeVisible();
    expect(screen.getByText("Beck")).toBeVisible();
    expect(within(navigation).queryByText("Pilots")).not.toBeInTheDocument();
    expect(
      within(navigation).queryByText("Realised value"),
    ).not.toBeInTheDocument();
    expect(
      within(navigation).queryByText("Automations"),
    ).not.toBeInTheDocument();
    expect(within(navigation).queryByText("Model Lab")).not.toBeInTheDocument();
    const mobileNavigation = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });
    expect(
      within(mobileNavigation).queryByRole("link", { name: "Deliver" }),
    ).not.toHaveAttribute("href", "/pilots");
  });

  it("keeps the Synthetic Replay shell local-only and removes provider routes", () => {
    render(
      <AppShell workspace={demoWorkspace}>
        <div>Page content</div>
      </AppShell>,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(
      within(navigation).getByRole("link", { name: /Synthetic Replay/i }),
    ).toHaveAttribute("href", "/demo");
    expect(
      within(navigation).queryByText("Integrations"),
    ).not.toBeInTheDocument();
    expect(within(navigation).queryByText("Approvals")).not.toBeInTheDocument();
    expect(
      within(navigation).queryByText("Automations"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Synthetic Replay").at(-1)).toBeVisible();
    expect(screen.getByText("Sia Partners Synthetic Replay")).toBeVisible();
    expect(
      within(
        screen.getByRole("navigation", { name: "Mobile navigation" }),
      ).getByRole("link", { name: /Synthetic Replay/i }),
    ).toHaveAttribute("href", "/demo");
  });
});
