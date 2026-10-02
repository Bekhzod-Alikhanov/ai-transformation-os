import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { useState } from "react";
import { createTemplate } from "../templates";
import { DraftProvider } from "./drafts";
import { PilotSurface } from "./pilot";
import type { SurfaceProps } from "./surface";

function Harness() {
  const [e, setE] = useState(() => createTemplate("support"));
  const save: SurfaceProps["save"] = async (_, update) => {
    const next = structuredClone(e);
    update(next);
    setE(next);
    return next;
  };
  return (
    <DraftProvider>
      <PilotSurface
        engagement={e}
        opportunity={e.opportunities[0]}
        busy={false}
        save={save}
        navigate={() => {}}
        inspect={() => {}}
      />
    </DraftProvider>
  );
}
it("shows editable pilot projection, saves history and requires explicit reviewed application", async () => {
  render(<Harness />);
  expect(
    screen.getByRole("heading", { name: "Pilot results" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Load target performance" }),
  );
  expect(
    screen.getByText("Annualised projections · not realised savings"),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save pilot revision" }));
  await waitFor(() =>
    expect(screen.getByText(/Saved pilot revision/)).toBeInTheDocument(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Review proposed assumption updates" }),
  );
  fireEvent.change(screen.getByLabelText("Application owner"), {
    target: { value: "Beck" },
  });
  fireEvent.change(screen.getByLabelText("Application rationale"), {
    target: { value: "Reviewed example observations" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Apply reviewed changes" }),
  );
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      /Applied with reviewed evidence/,
    ),
  );
  fireEvent.change(
    screen.getByLabelText("Review total minutes · Prepare response"),
    { target: { value: "777" } },
  );
  expect(
    screen.getByRole("button", { name: "Save pilot revision" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", {
      name: "Retain measurements on current basis",
    }),
  );
  expect(
    screen.getByLabelText("Review total minutes · Prepare response"),
  ).toHaveValue(777);
  fireEvent.click(screen.getByRole("button", { name: "Save pilot revision" }));
  await waitFor(() =>
    expect(
      screen.getByText("Saved pilot history · 2 revisions"),
    ).toBeInTheDocument(),
  );
});
