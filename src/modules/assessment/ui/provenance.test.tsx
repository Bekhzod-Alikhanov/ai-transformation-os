import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { createTemplate } from "../templates";
import { saveOption } from "./investment-operations";
import { Provenance } from "./provenance";
import { DraftProvider } from "./drafts";
import type { InspectorContent } from "./surface";

it("retains read-only history choices for removed costs and disabled benefits", () => {
  const e = createTemplate("support"),
    o = e.opportunities[0],
    meta = { owner: "Analyst", confidence: "medium" as const, evidenceIds: [] };
  const added = structuredClone(o.options[2]);
  added.benefits.push({
    id: "benefit-history",
    name: "Quality",
    kind: "quality",
    annualAmount: 500,
    pool: "quality",
    cashShare: 0,
    enabled: true,
    overlapResolved: false,
    mechanism: "Less rework",
  });
  const enabled = saveOption(o, added, meta),
    edit = structuredClone(enabled.options[2]);
  const cost = edit.costs.shift()!;
  edit.benefits[0].enabled = false;
  const retired = saveOption(enabled, edit, meta);
  e.opportunities[0] = retired;
  function Form() {
    const [inspector, inspect] = useState<InspectorContent | null>(null);
    return (
      <>
        <Provenance
          engagement={e}
          opportunity={retired}
          option={retired.options[2]}
          busy={false}
          save={async () => e}
          navigate={() => {}}
          inspect={inspect}
        />
        <section>{inspector?.content}</section>
      </>
    );
  }
  render(
    <DraftProvider>
      <Form />
    </DraftProvider>,
  );
  fireEvent.click(screen.getByText("Assumption provenance & history"));
  for (const field of [
    `costs.${cost.id}.amount`,
    "benefits.benefit-history.annualAmount",
  ]) {
    expect(
      screen.getByRole("option", { name: `${field} — retired (read only)` }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Assumption field"), {
      target: { value: field },
    });
    expect(
      screen.queryByRole("button", { name: "Save provenance" }),
    ).toBeNull();
    expect(screen.queryByLabelText("Assumption owner")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Inspect assumption history" }),
    );
    expect(screen.getByText(/Retired at this revision/)).toBeVisible();
  }
});
