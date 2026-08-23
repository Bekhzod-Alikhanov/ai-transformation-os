import { render, screen } from "@testing-library/react";

import { PilotPortfolio } from "./pilot-portfolio";

describe("PilotPortfolio", () => {
  it("shows target misses and a deterministic scale recommendation", () => {
    render(<PilotPortfolio />);

    expect(
      screen.getAllByText("Customer Support Copilot")[0],
    ).toBeInTheDocument();
    expect(
      screen.getByText("44%", { selector: "[data-actual-adoption]" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Scale with conditions")).toBeInTheDocument();
    expect(
      screen.getByText("Adoption is 26 points below target"),
    ).toBeInTheDocument();
  });
});
