import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { createTemplate } from "../templates";
import { recordRecommendation } from "../model";
import { Deliverables } from "./deliverables";
import * as exports from "../exports";

describe("deliverable preview", () => {
  it("locks download controls during generation and recovers with actionable errors", async () => {
    const e = createTemplate("reporting");
    let reject!: (error: Error) => void;
    const failure = new Promise<Blob>((_resolve, rejectPromise) => {
      reject = rejectPromise;
    });
    const spy = vi
      .spyOn(exports, "createSteeringPack")
      .mockReturnValue(failure);
    render(
      <Deliverables
        engagement={e}
        opportunity={e.opportunities[0]}
        brand={{ name: "Example", accent: "#414c3c" }}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Download PowerPoint" }),
    );
    for (const name of [
      "Download Markdown",
      "Download PowerPoint",
      "Download Excel",
    ])
      expect(screen.getByRole("button", { name })).toBeDisabled();
    expect(screen.getByLabelText("Export basis")).toBeDisabled();
    await act(async () => {
      reject(new Error("Simulated compression failure"));
    });
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Retry the download"),
    );
    expect(
      screen.getByRole("button", { name: "Download PowerPoint" }),
    ).toBeEnabled();
    spy.mockRestore();
  });
  it("selects exact saved snapshots and excludes notes until explicitly requested", () => {
    let engagement = createTemplate("reporting");
    let opportunity = engagement.opportunities[0];
    opportunity.evidence[0].internalNote = "HIDDENNOTE";
    engagement = recordRecommendation(engagement, opportunity.id, {
      outcome: "Investigate",
      rationale: "Earlier decision",
      conditions: "Earlier conditions",
      alternativesRejected: "Rules remain credible",
      nextDecisionDate: "2026-12-01",
      strategicException: "",
    });
    opportunity = engagement.opportunities[0];
    const snapshotId = opportunity.recommendations[0].id;
    engagement.client = "Current fictional client";
    engagement.currency = "GBP";
    opportunity.revision++;
    render(
      <Deliverables
        engagement={engagement}
        opportunity={opportunity}
        brand={{ name: "Example", accent: "#414c3c" }}
      />,
    );
    const preview = screen.getByLabelText("Investment brief preview");
    expect(preview).toHaveTextContent("Draft / not reviewed");
    expect(preview).toHaveTextContent("GBP");
    expect(preview).not.toHaveTextContent("HIDDENNOTE");
    fireEvent.change(screen.getByLabelText("Export basis"), {
      target: { value: snapshotId },
    });
    expect(preview).toHaveTextContent("Earlier decision");
    expect(preview).not.toHaveTextContent("Current fictional client");
    expect(preview).toHaveTextContent("historical snapshot is stale");
    fireEvent.click(screen.getByLabelText("Include internal notes"));
    expect(preview).toHaveTextContent("HIDDENNOTE");
  });
});
