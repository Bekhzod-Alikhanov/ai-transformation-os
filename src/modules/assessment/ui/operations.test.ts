import { describe, expect, it } from "vitest";
import { createOpportunity } from "../model";
import {
  applyBaseline,
  saveEvidence,
  reviewEvidence,
  safeAccent,
} from "./operations";
import type { Evidence } from "../types";

const evidence: Evidence = {
  id: "source",
  title: "Timed sample",
  source: "Synthetic sample",
  locator: "Rows 2–4",
  excerpt: "40 cases",
  date: "",
  status: "accepted",
  reviewRationale: "Representative sample",
  reviewedAt: "2026-09-01T12:00:00.000Z",
  version: 1,
  internalNote: "Private",
};
describe("assessment editing boundaries", () => {
  it("returns edited accepted evidence to pending with a new version without changing economics", () => {
    const o = createOpportunity("Triage");
    o.evidence.push(evidence);
    const next = saveEvidence(o, { ...evidence, excerpt: "50 cases" });
    expect(next.evidence[0]).toMatchObject({
      status: "pending",
      version: 2,
      reviewRationale: "",
      reviewedAt: "",
    });
    expect(next.options).toEqual(o.options);
    expect(o.evidence[0].status).toBe("accepted");
  });
  it("requires a rationale and source for review and leaves model inputs alone", () => {
    const o = createOpportunity("Triage");
    o.evidence.push({ ...evidence, status: "pending" });
    expect(() => reviewEvidence(o, "source", "accepted", " ")).toThrow(
      /rationale/i,
    );
    const reviewed = reviewEvidence(
      o,
      "source",
      "accepted",
      "Checked the sample",
    );
    expect(reviewed.evidence[0].status).toBe("accepted");
    expect(reviewed.options).toEqual(o.options);
    const missing = saveEvidence(o, { ...evidence, source: "" });
    expect(missing.evidence[0].status).toBe("missing");
    expect(() =>
      reviewEvidence(missing, "source", "accepted", "Checked"),
    ).toThrow(/source/i);
  });
  it("explicitly applies a valid baseline to all options with pending source and per-field provenance", () => {
    const o = createOpportunity("Triage");
    const preview = {
      valid: true,
      errors: [],
      annualVolume: 480,
      minutesBefore: 3.5,
      rowCount: 2,
      sourceLocator: "Rows 2, 4",
      assumptionsSummary: "Monthly × 12",
    };
    const next = applyBaseline(o, preview, "sample.csv", "Analyst");
    expect(
      next.options.map((x) => [
        x.inputs.annualVolume,
        x.inputs.minutesBefore,
        x.inputs.reduction,
      ]),
    ).toEqual([
      [480, 3.5, null],
      [480, 3.5, null],
      [480, 3.5, null],
      [480, 3.5, null],
    ]);
    expect(next.evidence[0]).toMatchObject({
      status: "pending",
      locator: "Rows 2, 4",
    });
    expect(next.assumptions).toHaveLength(8);
    expect(next.assumptions[0]).toMatchObject({
      provenance: "user_provided",
      confidence: "low",
      owner: "Analyst",
      version: 1,
    });
    expect(() =>
      applyBaseline(o, { ...preview, valid: false }, "bad.csv", "Analyst"),
    ).toThrow(/valid/i);
    expect(o.evidence).toHaveLength(0);
  });
  it("only returns approved CSS colours even for a malicious restored brand", () => {
    expect(safeAccent("url(https://example.test/leak)")).toBe("#3157d5");
    expect(safeAccent("#176b58")).toBe("#176b58");
  });
});
