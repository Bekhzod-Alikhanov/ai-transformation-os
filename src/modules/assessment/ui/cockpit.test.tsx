import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { createTemplate } from "../templates";
import { DraftProvider } from "./drafts";
import { Cockpit } from "./cockpit";
it("recalculates a working draft immediately without silently saving it", () => {
  const e = createTemplate("support");
  render(
    <DraftProvider>
      <Cockpit
        engagement={e}
        opportunity={e.opportunities[0]}
        busy={false}
        save={async () => e}
        navigate={() => {}}
        inspect={() => {}}
      />
    </DraftProvider>,
  );
  const original = screen.getByTestId("cockpit-npv").textContent;
  expect(e.opportunities[0].options[2].costs.map((c) => c.category)).toEqual(
    expect.arrayContaining([
      "discovery",
      "data",
      "implementation",
      "change",
      "technology",
      "operations",
    ]),
  );
  expect(screen.getByLabelText("Challenge initial investment")).toHaveValue(
    45000,
  );
  fireEvent.change(screen.getByLabelText("Challenge initial investment"), {
    target: { value: "60000" },
  });
  expect(screen.getByLabelText("Challenge initial investment")).toHaveValue(
    60000,
  );
  expect(screen.getByTestId("cockpit-npv").textContent).not.toBe(original);
  fireEvent.change(screen.getByLabelText("Challenge adoption (%)"), {
    target: { value: "10" },
  });
  expect(screen.getByTestId("cockpit-npv").textContent).not.toBe(original);
  expect(screen.getByText(/working draft/i)).toBeVisible();
  expect(e.opportunities[0].options[2].inputs.adoption).toBe(0.85);
});
