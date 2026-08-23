import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OpportunityTable } from "./opportunity-table";

describe("OpportunityTable", () => {
  it("filters the evidence-backed portfolio by user query", async () => {
    const user = userEvent.setup();
    render(<OpportunityTable />);

    await user.type(
      screen.getByRole("searchbox", { name: "Search opportunities" }),
      "regulatory",
    );

    expect(
      screen.getByRole("link", { name: "Regulatory Reporting Assembly" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", {
        name: "Client Status Reporting Automation",
      }),
    ).not.toBeInTheDocument();
  });
});
