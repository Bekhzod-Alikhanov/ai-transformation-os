import { describe, expect, it } from "vitest";
import {
  createWorkspace,
  createEngagement,
  createOpportunity,
  duplicateEngagement,
  reviseEngagement,
} from "./model";
import { workspaceSchema } from "./types";
import { createTemplate as template } from "./templates";
const createTemplate = (kind: "support" | "reporting") =>
  template(kind, "legacy_aggregate");
import { simulateOption } from "./economics";
describe("assessment model", () => {
  it("preserves unknown inputs and independent alternatives", () => {
    const o = createOpportunity();
    expect(o.options.map((x) => x.kind)).toEqual([
      "bau",
      "rules",
      "assistance",
      "automation",
    ]);
    expect(o.options[1].inputs.annualVolume).toBeNull();
    o.options[1].inputs.annualVolume = 20;
    expect(o.options[2].inputs.annualVolume).toBeNull();
    expect(createEngagement().opportunities).toEqual([]);
    expect(workspaceSchema.safeParse(createWorkspace()).success).toBe(true);
  });
  it("rejects duplicate IDs and broken selected references", () => {
    const w = createWorkspace(),
      e = createEngagement();
    e.opportunities.push(createOpportunity());
    w.engagements.push(e);
    expect(workspaceSchema.safeParse(w).success).toBe(true);
    e.opportunities[0].selectedOptionId = "absent";
    expect(workspaceSchema.safeParse(w).success).toBe(false);
    e.opportunities[0].selectedOptionId = e.opportunities[0].options[0].id;
    w.engagements.push(structuredClone(e));
    expect(workspaceSchema.safeParse(w).success).toBe(false);
  });
  it("duplicates dependent IDs and tracks changed revisions without mutating source", () => {
    const e = createEngagement("Example");
    e.opportunities.push(createOpportunity());
    const d = duplicateEngagement(e);
    expect(d.id).not.toBe(e.id);
    expect(d.opportunities[0].selectedOptionId).toBe(
      d.opportunities[0].options[0].id,
    );
    expect(d.opportunities[0].options[0].id).not.toBe(
      e.opportunities[0].options[0].id,
    );
    const u = reviseEngagement(e, "Change", (x) => {
      x.opportunities[0].problem = "New";
    });
    expect(u.revision).toBe(1);
    expect(u.opportunities[0].revision).toBe(1);
    expect(e.opportunities[0].problem).toBe("");
  });
  it("preserves narrative and legacy snapshots while remapping active references", () => {
    const e = createEngagement();
    const o = createOpportunity();
    e.opportunities.push(o);
    o.problem = o.options[0].id;
    o.legacyDecisions = [{ id: "legacy", optionId: o.options[0].id }];
    const d = duplicateEngagement(e);
    expect(d.opportunities[0].problem).toBe(o.problem);
    expect(d.opportunities[0].legacyDecisions).toEqual(o.legacyDecisions);
  });
  it("keeps derived simulation storage from changing its source revision", () => {
    const e = createTemplate("support"),
      o = e.opportunities[0];
    const summary = simulateOption(o.options[2], o.options[0], 1, {
      inputRevision: o.revision,
    });
    const saved = reviseEngagement(e, "Store simulation", (draft) => {
      draft.opportunities[0].options[2].simulation = summary;
    });
    expect(saved.revision).toBe(e.revision + 1);
    expect(saved.opportunities[0].revision).toBe(summary.inputRevision);
    const changed = reviseEngagement(saved, "Change input", (draft) => {
      draft.opportunities[0].options[2].inputs.adoption = 0.7;
    });
    expect(changed.opportunities[0].revision).toBe(summary.inputRevision + 1);
  }, 10000);
  it("remaps evidence, option and cost provenance references in copies", () => {
    const e = createTemplate("support"),
      d = duplicateEngagement(e),
      w = createWorkspace();
    w.engagements = [e, d];
    expect(workspaceSchema.safeParse(w).success).toBe(true);
    const o = d.opportunities[0],
      a = o.assumptions.find((x) => x.field.startsWith("costs."))!;
    expect(a.field).toBe(`costs.${o.options[0].costs[0].id}.amount`);
    expect(a.optionId).toBe(o.options[0].id);
    expect(
      o.assumptions.find((x) => x.evidenceIds.length)!.evidenceIds[0],
    ).toBe(o.evidence[1].id);
  });
});
