import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { createTemplate } from "../templates";
import {
  createEngagement,
  createOpportunity,
  reviseEngagement,
} from "../model";
import { Options } from "./options";
import { Recommendation } from "./recommendation";
import { DraftProvider } from "./drafts";
import type { SurfaceProps } from "./surface";

function props(blank = false): SurfaceProps {
  let engagement = blank
    ? createEngagement("Blank")
    : createTemplate("support");
  if (blank) engagement.opportunities.push(createOpportunity("Trial"));
  return {
    engagement,
    opportunity: engagement.opportunities[0],
    busy: false,
    navigate: () => {},
    inspect: () => {},
    save: async (detail, update) => {
      engagement = reviseEngagement(engagement, detail, update);
      return engagement;
    },
  };
}
it("keeps blank inputs unknown and option drafts independent across switches", () => {
  const p = props(true);
  render(
    <DraftProvider>
      <Options {...p} />
    </DraftProvider>,
  );
  expect(screen.getByLabelText("Annual volume (items/year)")).toHaveValue(null);
  fireEvent.click(screen.getByRole("button", { name: "AI assistance" }));
  fireEvent.change(screen.getByLabelText("Adoption (%)"), {
    target: { value: "63" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Process and rules" }));
  expect(screen.getByLabelText("Adoption (%)")).toHaveValue(null);
  fireEvent.click(screen.getByRole("button", { name: "AI assistance" }));
  expect(screen.getByLabelText("Adoption (%)")).toHaveValue(63);
});
it("saves fractional base inputs through the service with explicit provenance", async () => {
  const p = props();
  let committed = p.engagement;
  const save = p.save;
  p.save = async (d, u) => (committed = await save(d, u));
  render(
    <DraftProvider>
      <Options {...p} />
    </DraftProvider>,
  );
  fireEvent.change(screen.getByLabelText("Adoption (%)"), {
    target: { value: "63" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save base assumptions" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(/owner/i);
  fireEvent.change(screen.getAllByLabelText("Assumption owner")[0], {
    target: { value: "Analyst" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save base assumptions" }),
  );
  await waitFor(() =>
    expect(committed.opportunities[0].options[2].inputs.adoption).toBe(0.63),
  );
  expect(committed.opportunities[0].assumptions.at(-1)).toMatchObject({
    owner: "Analyst",
    provenance: "assumed",
  });
});
it("records immutable recommendations on the saved base and keeps unknown risk distinct", async () => {
  const p = props();
  let committed = p.engagement;
  const save = p.save;
  p.save = async (d, u) => (committed = await save(d, u));
  render(
    <DraftProvider>
      <Recommendation {...p} />
    </DraftProvider>,
  );
  expect(screen.getByText(/what-if.*do not change/i)).toBeVisible();
  expect(screen.getByLabelText("Risk readiness")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Recommendation rationale"), {
    target: { value: "Collect trial evidence first" },
  });
  fireEvent.change(screen.getByLabelText("Next decision date"), {
    target: { value: "2026-12-01" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Record recommendation" }),
  );
  await waitFor(() =>
    expect(committed.opportunities[0].recommendations).toHaveLength(1),
  );
  expect(committed.opportunities[0].recommendations[0].outcome).toBe(
    "Investigate",
  );
  expect(
    committed.opportunities[0].recommendations[0].opportunity.options[2].inputs
      .adoption,
  ).toBe(0.8);
});
