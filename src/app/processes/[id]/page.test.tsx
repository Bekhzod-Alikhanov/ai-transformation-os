import { render, screen } from "@testing-library/react";

import type { WorkspaceContext } from "@/modules/auth/workspace-context";

import { ProcessPageContent } from "./page";

const liveWorkspace: WorkspaceContext = {
  organisationId: "live-organisation",
  mode: "live",
  displayName: "Beck",
  role: "owner",
  capabilities: ["processes"],
};

describe("ProcessPageContent", () => {
  it("hides advanced process editing in a live workspace", () => {
    render(
      <ProcessPageContent
        id="client-status-reporting"
        workspace={liveWorkspace}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /edit operational metrics/i }),
    ).not.toBeInTheDocument();
  });

  it("labels advanced process editing as demo-only in Aster", () => {
    render(
      <ProcessPageContent
        id="client-status-reporting"
        workspace={{
          ...liveWorkspace,
          mode: "synthetic_replay",
          capabilities: ["processes", "advanced_process_editing"],
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: /edit operational metrics/i }),
    ).toBeVisible();
    expect(screen.getByText("Demo only")).toBeVisible();
  });
});
