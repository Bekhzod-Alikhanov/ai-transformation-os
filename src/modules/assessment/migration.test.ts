import { describe, expect, it } from "vitest";
import { seedWorkspace } from "../delivery-workbench/model";
import { migrateLegacy } from "./migration";
import { workspaceSchema } from "./types";

describe("legacy delivery-workbench migration", () => {
  it("preserves selected economics, evidence reviews and immutable old records", () => {
    const legacy = seedWorkspace();
    const support = legacy.projects[0]!;
    support.name = "Edited support case";
    support.client = "Edited client";
    support.lead = "Edited lead";
    support.goal = "Edited measurable goal";
    support.inputs.implementationCost = 47_123;
    support.inputs.annualRunCost = 18_000;
    support.inputs.adoption = 0.63;
    support.evidence[0]!.status = "rejected";
    support.evidence[0]!.note = "Reviewer rejected this source";
    support.decisions.push({
      id: "legacy-decision",
      at: "2026-09-01T12:00:00.000Z",
      revision: support.revision,
      recommendation: "Pilot",
      decision: "Pilot",
      rationale: "Run a bounded test",
      conditions: "Keep human review",
      owner: "Edited lead",
      followUp: "2026-10-01",
      override: "",
      snapshot: {
        inputs: structuredClone(support.inputs),
        evidence: structuredClone(support.evidence),
        measurements: null,
        economicNpv: 123,
        cashNpv: 45,
      },
    });
    const original = structuredClone(legacy);

    const migrated = workspaceSchema.parse(
      migrateLegacy(JSON.stringify(legacy)),
    );
    const engagement = migrated.engagements[0]!;
    const opportunity = engagement.opportunities[0]!;
    const selected = opportunity.options.find(
      (option) => option.id === opportunity.selectedOptionId,
    )!;

    expect(legacy).toEqual(original);
    expect(migrated.migration).toEqual({
      legacyImported: true,
      confirmed: false,
    });
    expect(migrated.engagements).toHaveLength(2);
    expect(engagement).toMatchObject({
      name: "Edited support case",
      client: "Edited client",
      lead: "Edited lead",
      objectives: "Edited measurable goal",
      currency: "USD",
    });
    expect(selected.kind).toBe("assistance");
    expect(selected.inputs.adoption).toBe(0.63);
    expect(selected.costs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          amount: 47_123,
          frequency: "one_time",
          startMonth: 0,
          endMonth: 0,
        }),
        expect.objectContaining({
          amount: 1_500,
          frequency: "monthly",
          startMonth: 1,
          endMonth: 36,
        }),
      ]),
    );
    expect(opportunity.evidence[0]).toMatchObject({
      status: "rejected",
      reviewRationale: "Reviewer rejected this source",
    });
    expect(opportunity.legacyDecisions).toContainEqual(
      original.projects[0]!.decisions[0],
    );
    expect(opportunity.legacyDecisions).toContainEqual({
      type: "legacy-project-v1-raw",
      project: original.projects[0],
    });
    expect(opportunity.legacyDecisions).toContainEqual(
      expect.objectContaining({
        type: "legacy-project-v1-unmapped",
        tasks: original.projects[0]!.tasks,
        risks: original.projects[0]!.risks,
        measurements: original.projects[0]!.measurements,
        evaluationRevision: original.projects[0]!.evaluationRevision,
        evaluationInput: original.projects[0]!.evaluationInput,
        history: original.projects[0]!.history,
      }),
    );
  });

  it("shares baselines but does not manufacture unsaved alternative economics", () => {
    const migrated = migrateLegacy(JSON.stringify(seedWorkspace()));
    const opportunity = migrated.engagements[0]!.opportunities[0]!;
    const selected = opportunity.options.find(
      (option) => option.id === opportunity.selectedOptionId,
    )!;
    const alternatives = opportunity.options.filter(
      (option) => option.kind !== "bau" && option.id !== selected.id,
    );

    for (const option of opportunity.options) {
      expect(option.inputs.annualVolume).toBe(selected.inputs.annualVolume);
      expect(option.inputs.minutesBefore).toBe(selected.inputs.minutesBefore);
      expect(option.inputs.hourlyCost).toBe(selected.inputs.hourlyCost);
    }
    for (const option of alternatives) {
      expect(option.inputs.reduction).toBeNull();
      expect(option.inputs.adoption).toBeNull();
      expect(option.costs).toEqual([]);
    }
  });

  it("rejects invalid old records instead of partially migrating them", () => {
    const legacy = seedWorkspace();
    legacy.projects[0]!.tasks = [];
    expect(() => migrateLegacy(JSON.stringify(legacy))).toThrow(
      /missing required evidence, delivery dependencies or controls/i,
    );
  });
});
