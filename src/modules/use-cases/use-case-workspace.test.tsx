import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UseCaseWorkspace } from "./use-case-workspace";

describe("UseCaseWorkspace", () => {
  it("makes evidence, economics, objections, and the policy-constrained decision inspectable", async () => {
    const user = userEvent.setup();
    render(<UseCaseWorkspace useCaseId="client-status-reporting" />);

    expect(screen.getAllByText("Conditional go")[0]).toBeInTheDocument();
    expect(
      screen.getByText("$1.1M", { selector: "[data-risk-adjusted-value]" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("4 anchored claims")[0]).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Committee" }));
    expect(screen.getByText("CFO Red Team")).toBeInTheDocument();
    expect(
      screen.getByText(/released capacity was incorrectly counted/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/chain-of-thought/i)).not.toBeInTheDocument();
  });
});
