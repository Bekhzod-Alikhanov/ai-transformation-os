import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SyntheticReplayWorkbench } from "./synthetic-replay-workbench";

describe("SyntheticReplayWorkbench", () => {
  it("guides the Support Triage hero from evidence to a stored governed decision", async () => {
    const user = userEvent.setup();
    render(<SyntheticReplayWorkbench organisationId="journey-test" />);

    expect(
      screen.getByRole("heading", { name: "Support Triage" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /open economics/i }));
    await user.click(
      screen.getByRole("button", { name: /run base simulation/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /run synthetic committee replay/i }),
    );
    expect(screen.getByText(/scripted partial failure/i)).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: /retry committee replay/i }),
    );
    await user.click(screen.getByRole("button", { name: /request evidence/i }));
    await user.click(
      screen.getByRole("button", { name: /record beck decision/i }),
    );

    expect(screen.getAllByText(/decision recorded locally/i)[0]).toBeVisible();
    expect(
      screen.getAllByText(/Beck approved conditional_go/i)[0],
    ).toBeVisible();
  });

  it("lets an operator run and compare a validated custom scenario with the seeded scenarios", async () => {
    const user = userEvent.setup();
    render(<SyntheticReplayWorkbench organisationId="custom-scenario-test" />);

    await user.clear(screen.getByLabelText("Custom adoption"));
    await user.type(screen.getByLabelText("Custom adoption"), "0.70");
    await user.clear(screen.getByLabelText("Custom benefit factor"));
    await user.type(screen.getByLabelText("Custom benefit factor"), "0.92");
    await user.click(
      screen.getByRole("button", { name: /run custom scenario/i }),
    );

    expect(
      screen.getByText(/Custom simulation · 10,000 samples/i),
    ).toBeVisible();
    expect(screen.getByText(/Scenario comparison/i)).toBeVisible();
  });

  it("searches the local evidence desk and opens the matching Support Triage case", async () => {
    const user = userEvent.setup();
    render(<SyntheticReplayWorkbench organisationId="search-test" />);

    await user.type(
      screen.getByRole("searchbox", { name: /search local replay/i }),
      "support",
    );
    expect(
      screen.getByRole("button", { name: "Support Triage · Case" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Support Queue Copilot · Use Case" }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Support Triage · Case" }),
    );

    expect(
      screen.getByRole("heading", { name: "Support Triage" }),
    ).toBeVisible();
  });

  it("opens the responsive evidence inspector drawer without leaving the hero flow", async () => {
    const user = userEvent.setup();
    render(<SyntheticReplayWorkbench organisationId="inspector-test" />);

    const toggle = screen.getByRole("button", {
      name: /open evidence inspector/i,
    });
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Local activity")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Support Triage" }),
    ).toBeVisible();
  });

  it("keeps the responsive inspector available while the primary workbench stays visible", async () => {
    const user = userEvent.setup();
    render(
      <SyntheticReplayWorkbench organisationId="responsive-inspector-test" />,
    );

    await user.click(
      screen.getByRole("button", { name: /open evidence inspector/i }),
    );

    expect(screen.getByText("No providers. No database.")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Evidence to governed decision",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Support Triage" }),
    ).toBeVisible();
  });
});
