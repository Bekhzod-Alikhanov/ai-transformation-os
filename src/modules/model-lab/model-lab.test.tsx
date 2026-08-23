import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ModelLab } from "./model-lab";

describe("ModelLab", () => {
  it("compares reproducible benchmark results and exposes routing policy", async () => {
    const user = userEvent.setup();
    render(<ModelLab />);

    expect(screen.getAllByText("GPT-5.6 Sol")[0]).toBeInTheDocument();
    expect(screen.getByText("Extraction & tagging")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Run benchmark" }));
    expect(screen.getByText("Benchmark replay complete")).toBeInTheDocument();
    expect(screen.getByText(/Evaluation set v2026\.08\.1/)).toBeInTheDocument();
  });
});
