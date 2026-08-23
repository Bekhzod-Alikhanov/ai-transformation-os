import { render, screen } from "@testing-library/react";

import { ExecutiveDashboard } from "./executive-dashboard";

describe("ExecutiveDashboard", () => {
  it("leads with the exact Aster decision metrics and decision queue", () => {
    render(<ExecutiveDashboard />);

    expect(screen.getByText("$8.4M")).toBeInTheDocument();
    expect(screen.getByText("$1.9M")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(
      screen.getByText("4", { selector: "[data-metric-value]" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Customer Support Copilot is below its adoption gate"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /review opportunity/i }),
    ).toHaveAttribute("href", "/use-cases/client-status-reporting");
  });
});
