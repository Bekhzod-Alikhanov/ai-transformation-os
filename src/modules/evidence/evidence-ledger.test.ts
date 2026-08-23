import { describe, expect, it } from "vitest";

import {
  calculateEvidenceCoverage,
  createEvidenceRef,
} from "./evidence-ledger";

describe("evidence ledger", () => {
  it("rejects observed evidence without a traceable source locator", () => {
    expect(() =>
      createEvidenceRef({
        id: "ev-1",
        claimKey: "handling-time",
        claim: "Average handling time is 18 minutes",
        provenance: "observed",
        confidence: "high",
        sourceId: "source-1",
      }),
    ).toThrow("Observed evidence requires a source locator");
  });

  it("calculates required-claim coverage without treating confidence as certainty", () => {
    const evidence = [
      createEvidenceRef({
        id: "ev-1",
        claimKey: "handling-time",
        claim: "Average handling time is 18 minutes",
        provenance: "observed",
        confidence: "high",
        sourceId: "source-1",
        locator: {
          kind: "spreadsheet_cell",
          value: "Baseline!F18",
          label: "Operations Baseline.xlsx",
        },
      }),
      createEvidenceRef({
        id: "ev-2",
        claimKey: "adoption",
        claim: "Expected adoption is 75%",
        provenance: "assumed",
        confidence: "low",
      }),
    ];

    expect(
      calculateEvidenceCoverage(evidence, [
        "handling-time",
        "adoption",
        "error-rate",
      ]),
    ).toEqual({
      coverage: 0.67,
      observedCoverage: 0.33,
      missingClaims: ["error-rate"],
    });
  });
});
