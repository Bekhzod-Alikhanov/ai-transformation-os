import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ApprovalCentre } from "./approval-centre";

describe("ApprovalCentre", () => {
  it("requires an explicit decision and removes executed actions from the pending queue", async () => {
    const user = userEvent.setup();
    render(<ApprovalCentre />);

    expect(screen.getByText("4 pending actions")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Approve" })[0]!);

    expect(screen.getByText("3 pending actions")).toBeInTheDocument();
    expect(screen.getByText("Approved for execution")).toBeInTheDocument();
  });
});
