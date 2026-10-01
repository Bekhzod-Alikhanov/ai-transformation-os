import { useState, type ReactNode } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it } from "vitest";
import { createTemplate } from "../templates";
import { reviseEngagement } from "../model";
import type { Engagement } from "../types";
import { DraftProvider, useDraft, useDrafts } from "./drafts";
import { Validation } from "./validation";
import { ReadinessControls } from "./readiness";
import { Recommendation } from "./recommendation";
import { Provenance } from "./provenance";
import { Scenarios } from "./scenarios";
import type { SurfaceProps } from "./surface";

const cases: {
  name: string;
  render: (p: SurfaceProps) => ReactNode;
  label: string;
  submitted: string;
  newer: string;
  stored: (e: Engagement) => unknown;
}[] = [
  {
    name: "validation",
    render: (p) => <Validation {...p} />,
    label: "Validation owner",
    submitted: "Saved owner",
    newer: "New unsaved owner",
    stored: (e) => e.opportunities[0].validation.owner,
  },
  {
    name: "readiness",
    render: (p) => <ReadinessControls {...p} />,
    label: "Risk readiness",
    submitted: "concern",
    newer: "unknown",
    stored: (e) => e.opportunities[0].risk,
  },
  {
    name: "recommendation",
    render: (p) => <Recommendation {...p} />,
    label: "Recommendation rationale",
    submitted: "Saved rationale",
    newer: "New unsaved rationale",
    stored: (e) => e.opportunities[0].recommendations[0]?.rationale,
  },
  {
    name: "provenance",
    render: (p) => <Provenance {...p} option={p.opportunity!.options[2]} />,
    label: "Assumption owner",
    submitted: "Saved owner",
    newer: "New unsaved owner",
    stored: (e) => e.opportunities[0].assumptions.at(-1)?.owner,
  },
  {
    name: "scenario",
    render: (p) => (
      <Scenarios
        key={p.opportunity!.revision}
        {...p}
        option={p.opportunity!.options[2]}
        bau={p.opportunity!.options[0]}
      />
    ),
    label: "Scenario name",
    submitted: "Saved scenario",
    newer: "New unsaved scenario",
    stored: (e) => e.opportunities[0].options[2].scenarios.at(-1)?.name,
  },
];
const buttons = {
  validation: "Save validation handover",
  readiness: "Save readiness",
  recommendation: "Record recommendation",
  provenance: "Save provenance",
  scenario: "Save custom scenario",
};
it.each(cases)(
  "preserves newer $name edits when an older pending save completes",
  async (c) => {
    let release!: () => void;
    const pending = new Promise<void>((r) => {
      release = r;
    });
    let committed = createTemplate("support");
    function Form() {
      const [engagement, setEngagement] = useState(committed);
      const p: SurfaceProps = {
        engagement,
        opportunity: engagement.opportunities[0],
        busy: false,
        navigate: () => {},
        inspect: () => {},
        save: async (detail, update) => {
          await pending;
          committed = reviseEngagement(committed, detail, update);
          setEngagement(committed);
          return committed;
        },
      };
      return c.render(p);
    }
    render(
      <DraftProvider>
        <Form />
      </DraftProvider>,
    );
    if (c.name === "provenance")
      fireEvent.click(screen.getByText("Assumption provenance & history"));
    if (c.name === "scenario")
      fireEvent.click(screen.getByText("Compose a custom scenario"));
    if (c.name === "recommendation")
      fireEvent.change(screen.getByLabelText("Next decision date"), {
        target: { value: "2026-12-01" },
      });
    const input = () => screen.getByLabelText(c.label);
    fireEvent.change(input(), { target: { value: c.submitted } });
    fireEvent.click(
      screen.getByRole("button", {
        name: buttons[c.name as keyof typeof buttons],
      }),
    );
    fireEvent.change(input(), { target: { value: c.newer } });
    await act(async () => release());
    await waitFor(() => expect(c.stored(committed)).toBe(c.submitted));
    expect(input()).toHaveValue(c.newer);
  },
);

it("a stale reset cannot clear a newer simulation range draft, even after a clear and re-edit", () => {
  let previousReset!: () => void;
  function Form() {
    const d = useDraft("simulation-ranges", { seed: 42 });
    const all = useDrafts();
    return (
      <>
        <input
          aria-label="Seed"
          value={d.value.seed}
          onChange={(e) => d.set({ seed: Number(e.target.value) })}
        />
        <button
          onClick={() => {
            previousReset = d.reset;
          }}
        >
          Capture save
        </button>
        <button onClick={() => previousReset()}>Complete save</button>
        <button onClick={all.clear}>Clear workspace drafts</button>
        <output>{all.dirty ? "Unsaved" : "Clean"}</output>
      </>
    );
  }
  render(
    <DraftProvider>
      <Form />
    </DraftProvider>,
  );
  fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "23" } });
  fireEvent.click(screen.getByText("Capture save"));
  fireEvent.click(screen.getByText("Clear workspace drafts"));
  fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "67" } });
  fireEvent.click(screen.getByText("Complete save"));
  expect(screen.getByLabelText("Seed")).toHaveValue("67");
  expect(screen.getByText("Unsaved")).toBeVisible();
});
