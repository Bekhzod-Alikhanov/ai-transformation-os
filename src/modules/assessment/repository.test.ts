import { describe, expect, it } from "vitest";
import { createOpportunity, createWorkspace } from "./model";
import { openRepository, parseBackup, serializeBackup } from "./repository";
import { createTemplate } from "./templates";
import { recordRecommendation } from "./model";

function historicalWorkspace() {
  const workspace = createWorkspace();
  let engagement = createTemplate("reporting");
  const input = {
    outcome: "Investigate" as const,
    rationale: "Preserve the reviewed synthetic basis",
    conditions: "Validate assumptions",
    alternativesRejected: "Rules remain viable",
    nextDecisionDate: "2026-12-01",
    strategicException: "",
  };
  for (let n = 0; n < 2; n++)
    engagement = recordRecommendation(
      engagement,
      engagement.opportunities[0].id,
      input,
    );
  workspace.engagements.push(engagement);
  return workspace;
}

describe("assessment workspace backups", () => {
  it.each([
    ["selected option", /Selected option missing/i],
    ["BAU", /Exactly one BAU option required/i],
    ["assumption option", /Broken assumption reference/i],
    ["assumption evidence", /Broken assumption reference/i],
    ["duplicate option", /Duplicate ID/i],
    ["duplicate nested entity", /Duplicate ID/i],
  ] as const)(
    "rejects historical %s corruption before backup replacement",
    (kind, message) => {
      const workspace = historicalWorkspace();
      const snapshot =
        workspace.engagements[0].opportunities[0].recommendations[1];
      const opportunity = snapshot.opportunity;
      if (kind === "selected option") opportunity.selectedOptionId = "missing";
      if (kind === "BAU") opportunity.options[0].kind = "rules";
      if (kind === "assumption option")
        opportunity.assumptions[0].optionId = "missing";
      if (kind === "assumption evidence")
        opportunity.assumptions[0].evidenceIds = ["missing"];
      if (kind === "duplicate option")
        opportunity.options.push(structuredClone(opportunity.options[1]));
      if (kind === "duplicate nested entity")
        opportunity.options[2].costs.push(
          structuredClone(opportunity.options[2].costs[0]),
        );
      expect(() => parseBackup(JSON.stringify(workspace))).toThrow(message);
      expect(() => serializeBackup(workspace)).toThrow(message);
    },
  );

  it("preserves multiple valid historical namespaces with IDs repeated in current data", () => {
    const workspace = historicalWorkspace();
    const opportunity = workspace.engagements[0].opportunities[0];
    const [first, second] = opportunity.recommendations;
    expect(first.opportunity.id).toBe(opportunity.id);
    expect(second.opportunity.options[2].id).toBe(opportunity.options[2].id);
    expect(first.opportunity.evidence[0].id).toBe(
      second.opportunity.evidence[0].id,
    );
    opportunity.options[2].inputs.adoption = 0;
    expect(parseBackup(serializeBackup(workspace))).toEqual(workspace);
  });
  it("gives recovery guidance for a synchronous security failure", async () => {
    const original = globalThis.indexedDB;
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: {
        open: () => {
          throw new DOMException("Denied", "SecurityError");
        },
      },
    });
    try {
      await expect(openRepository()).rejects.toThrow(
        /browser storage permissions.*reopen/i,
      );
    } finally {
      Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        value: original,
      });
    }
  });
  it("round-trips a valid version 2 workspace", () => {
    const workspace = createWorkspace();
    workspace.engagements = [];

    expect(parseBackup(serializeBackup(workspace))).toEqual(workspace);
  });

  it("rejects malformed, unknown-version and broken-reference backups", () => {
    expect(() => parseBackup("not-json")).toThrow(/valid JSON/i);
    expect(() => parseBackup(JSON.stringify({ schemaVersion: 7 }))).toThrow(
      /version 7.*version 2.*original backup/i,
    );

    const workspace = createWorkspace();
    const opportunity = createOpportunity("Broken reference");
    opportunity.selectedOptionId = "missing-option";
    workspace.engagements.push({
      id: "engagement",
      name: "Example",
      client: "",
      sponsor: "",
      processOwner: "",
      lead: "",
      problem: "",
      objectives: "",
      constraints: "",
      assessmentDate: "",
      decisionDeadline: "",
      currency: "USD",
      archived: false,
      revision: 0,
      opportunities: [opportunity],
      history: [],
    });
    expect(() => parseBackup(JSON.stringify(workspace))).toThrow(
      /selected option missing/i,
    );
  });

  it("rejects backups larger than 20 MiB before parsing", () => {
    expect(() => parseBackup(" ".repeat(20 * 1024 * 1024 + 1))).toThrow(
      /20 MiB/i,
    );
  });

  it("explains how to recover when IndexedDB is unavailable", async () => {
    const original = globalThis.indexedDB;
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: undefined,
    });
    try {
      await expect(openRepository()).rejects.toThrow(
        /IndexedDB.*browser settings|browser settings.*IndexedDB/i,
      );
    } finally {
      Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        value: original,
      });
    }
  });

  it("rejects a blocked database open without leaving the caller pending", async () => {
    const original = globalThis.indexedDB;
    const request = {} as IDBOpenDBRequest;
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: {
        open: () => {
          queueMicrotask(() =>
            request.onblocked?.(new Event("blocked") as never),
          );
          return request;
        },
      } as unknown as IDBFactory,
    });
    try {
      await expect(openRepository()).rejects.toThrow(
        /blocked by another tab.*close other workbench tabs/i,
      );
    } finally {
      Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        value: original,
      });
    }
  });
});
