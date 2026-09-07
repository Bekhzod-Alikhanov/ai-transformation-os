import { describe, expect, it } from "vitest";

import {
  deriveClaimConflicts,
  eligibleEvidenceForDecisions,
  resolveClaimConflict,
} from "./evidence-conflicts";

const evidence = [
  {
    id: "evidence-1",
    claimKey: "reporting.cycle_time_hours",
    claim: "Weekly reporting takes eight hours.",
    value: 8,
    locator: { type: "text_line" as const, startLine: 4, endLine: 4 },
  },
  {
    id: "evidence-2",
    claimKey: "reporting.cycle_time_hours",
    claim: "The weekly report takes six hours after the template update.",
    value: 6,
    locator: { type: "text_line" as const, startLine: 12, endLine: 12 },
  },
  {
    id: "evidence-3",
    claimKey: "reporting.volume_per_week",
    claim: "Operations prepares 14 reports per week.",
    value: 14,
    locator: { type: "text_line" as const, startLine: 18, endLine: 18 },
  },
];

describe("evidence conflicts", () => {
  it("groups contradictory accepted evidence by claim key with side-by-side source excerpts", () => {
    const conflicts = deriveClaimConflicts(evidence);

    expect(conflicts).toEqual([
      {
        claimKey: "reporting.cycle_time_hours",
        status: "unresolved",
        entries: [
          {
            evidenceId: "evidence-1",
            excerpt: "Weekly reporting takes eight hours.",
            value: 8,
            locator: { type: "text_line", startLine: 4, endLine: 4 },
          },
          {
            evidenceId: "evidence-2",
            excerpt:
              "The weekly report takes six hours after the template update.",
            value: 6,
            locator: { type: "text_line", startLine: 12, endLine: 12 },
          },
        ],
      },
    ]);
  });

  it("excludes unresolved claims from economics and decision evidence until an evidence-backed resolution is selected", () => {
    const unresolved = deriveClaimConflicts(evidence);

    expect(
      eligibleEvidenceForDecisions(evidence, unresolved).map((item) => item.id),
    ).toEqual(["evidence-3"]);
    const resolved = resolveClaimConflict(unresolved[0]!, "evidence-2");
    expect(
      eligibleEvidenceForDecisions(evidence, [resolved]).map((item) => item.id),
    ).toEqual(["evidence-2", "evidence-3"]);
  });
});
