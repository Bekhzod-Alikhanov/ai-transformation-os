import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  restoreWorkspace,
} from "@/modules/delivery-workbench/model";
import { SyntheticReplayWorkbench } from "./synthetic-replay-workbench";
beforeEach(() => localStorage.clear());
describe("interview workbench", () => {
  it("offers exactly two projects and preserves a reviewed conflict after remount", async () => {
    const user = userEvent.setup();
    const view = render(<SyntheticReplayWorkbench organisationId="demo" />);
    await waitFor(() =>
      expect(
        document.querySelector('[data-replay-ready="true"]'),
      ).not.toBeNull(),
    );
    expect(
      within(
        screen.getByRole("navigation", { name: "Client engagements" }),
      ).getAllByRole("button"),
    ).toHaveLength(2);
    const nav = screen.getByRole("navigation", {
      name: "Engagement workspace",
    });
    await user.click(within(nav).getByRole("button", { name: "Evidence" }));
    await user.click(
      screen.getByRole("button", { name: /Adoption needs validation/ }),
    );
    await user.type(
      screen.getByLabelText("Review rationale"),
      "Pilot must verify the 70% assumption with weekly adoption data.",
    );
    await user.click(screen.getByRole("button", { name: "Accept evidence" }));
    const saved = restoreWorkspace(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.projects[0]!.evidence[3]!.status).toBe("accepted");
    expect(saved.projects[0]!.revision).toBe(2);
    view.unmount();
    render(<SyntheticReplayWorkbench organisationId="new-session" />);
    await waitFor(() =>
      expect(screen.getByText(/Local record · revision 2/)).toBeVisible(),
    );
  });
  it("preserves corrupt saved data and offers explicit recovery", async () => {
    localStorage.setItem(STORAGE_KEY, "broken");
    render(<SyntheticReplayWorkbench organisationId="demo" />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "has not been overwritten",
    );
    expect(localStorage.getItem(STORAGE_KEY)).toBe("broken");
    expect(screen.getByRole("button", { name: "Reset demo" })).toBeEnabled();
  });
});
