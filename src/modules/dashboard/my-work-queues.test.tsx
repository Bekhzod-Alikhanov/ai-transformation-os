import { render, screen } from "@testing-library/react";

import { MyWorkQueues } from "./my-work-queues";

describe("MyWorkQueues", () => {
  it("keeps each authenticated work queue visible and navigable even when empty", () => {
    render(
      <MyWorkQueues
        queues={{
          sourceReviews: 2,
          candidateReviews: 3,
          opportunityDrafts: 1,
          failedRuns: 0,
          decisionsDue: 0,
          approvalsAssigned: 0,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "My Work" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: /5 evidence reviews/i }),
    ).toHaveAttribute("href", "/evidence");
    expect(
      screen.getByRole("link", { name: /1 opportunity draft/i }),
    ).toHaveAttribute("href", "/opportunities");
    expect(screen.getByText("No failed runs")).toBeVisible();
  });
});
