import { render, screen } from "@testing-library/react";

import { ProcessTwin } from "./process-twin";

describe("ProcessTwin", () => {
  it("pairs current and future operations with explicit human control", () => {
    render(<ProcessTwin />);

    expect(screen.getByText("Current state")).toBeInTheDocument();
    expect(screen.getByText("Future state")).toBeInTheDocument();
    expect(screen.getByText("Human approval")).toBeInTheDocument();
    expect(screen.getByText("490 min")).toBeInTheDocument();
    expect(screen.getByText("31 min")).toBeInTheDocument();
  });
});
