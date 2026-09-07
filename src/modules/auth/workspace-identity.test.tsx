import { render, screen } from "@testing-library/react";

import { ActivityFeed } from "@/modules/activity/activity-feed";
import { ExecutiveDashboard } from "@/modules/dashboard/executive-dashboard";
import { SettingsPanel } from "@/modules/settings/settings-panel";

import { WorkspaceProvider } from "./workspace-provider";

describe("workspace identity", () => {
  it("renders Beck's live profile and membership without synthetic identities", () => {
    render(
      <WorkspaceProvider
        workspace={{
          organisationId: "live-organisation",
          mode: "live",
          displayName: "Beck",
          role: "owner",
          capabilities: ["overview", "activity", "settings"],
        }}
      >
        <ExecutiveDashboard />
        <ActivityFeed />
        <SettingsPanel />
      </WorkspaceProvider>,
    );

    const removedIdentity = ["Ma", "ya"].join("");
    expect(
      screen.queryByText(new RegExp(removedIdentity, "i")),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/Beck/).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("AI Transformation OS")).toBeVisible();
    expect(screen.queryByText(/synthetic replay/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /reset synthetic demo/i }),
    ).not.toBeInTheDocument();
  });
});
