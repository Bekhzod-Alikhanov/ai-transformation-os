import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ControlTower } from "./control-tower";

describe("ControlTower", () => {
  it("previews deterministic scenario changes without mutating the base case", async () => {
    const user = userEvent.setup();
    render(<ControlTower />);

    await user.type(
      screen.getByRole("textbox", { name: "Ask the Control Tower" }),
      "Assume labour savings are 30% lower",
    );
    await user.click(screen.getByRole("button", { name: "Run analysis" }));

    expect(screen.getByText("Scenario preview")).toBeInTheDocument();
    expect(
      screen.getByText("$770K risk-adjusted annual value"),
    ).toBeInTheDocument();
    expect(screen.getByText("Base assumptions unchanged")).toBeInTheDocument();
  });
});
