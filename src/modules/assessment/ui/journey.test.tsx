import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it } from "vitest";
import { createTemplate } from "../templates";
import { DraftProvider } from "./drafts";
import { Workshop } from "./workshop";
import { EvaluationSurface } from "./evaluation";
import type { SurfaceProps } from "./surface";
function fixture(): SurfaceProps {
  const e = createTemplate("support");
  return {
    engagement: e,
    opportunity: e.opportunities[0],
    busy: false,
    save: async (_d, update) => {
      update(e);
      return e;
    },
    navigate: () => {},
    inspect: () => {},
  };
}
it("saves a workshop answer and unresolved status with its owner", async () => {
  const p = fixture();
  render(
    <DraftProvider>
      <Workshop {...p} />
    </DraftProvider>,
  );
  fireEvent.change(screen.getByLabelText("Answer · workload"), {
    target: { value: "Timed 120 cases" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save workshop answers" }),
  );
  await waitFor(() =>
    expect(p.opportunity?.questions?.[0].answer).toBe("Timed 120 cases"),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Answer · workload")).toHaveValue(
      "Timed 120 cases",
    ),
  );
  fireEvent.change(screen.getByLabelText("Answer · variation"), {
    target: { value: "Second saved answer" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save workshop answers" }),
  );
  await waitFor(() =>
    expect(p.opportunity?.questions?.[1].answer).toBe("Second saved answer"),
  );
  expect(p.opportunity?.questions?.[0].answer).toBe("Timed 120 cases");
});
it("persists a synthetic replay with its cases and timeline", async () => {
  const p = fixture();
  render(
    <DraftProvider>
      <EvaluationSurface {...p} />
    </DraftProvider>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Run synthetic support replay" }),
  );
  await waitFor(() =>
    expect(p.opportunity?.evaluations?.[0].cases).toHaveLength(4),
  );
  expect(p.opportunity?.evaluations?.[0].mode).toBe("synthetic_replay");
});
