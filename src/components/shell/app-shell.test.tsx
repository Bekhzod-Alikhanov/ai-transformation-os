import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("AppShell", () => {
  it("groups the transformation lifecycle into one accessible navigation", () => {
    render(
      <AppShell>
        <div>Page content</div>
      </AppShell>,
    );

    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Opportunities" })).toHaveAttribute(
      "href",
      "/opportunities",
    );
    expect(screen.getByRole("link", { name: "Decision Room" })).toHaveAttribute(
      "href",
      "/decision-room",
    );
    expect(screen.getByRole("link", { name: "Approvals" })).toHaveAttribute(
      "href",
      "/approvals",
    );
    expect(screen.getByText("Synthetic enterprise")).toBeInTheDocument();
  });
});
