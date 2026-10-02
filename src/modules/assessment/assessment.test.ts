import { describe, expect, it } from "vitest";
import { assessOpportunity, materialFields } from "./assessment";
import {
  createEngagement,
  createOpportunity,
  newId,
  recordRecommendation,
  reviseEngagement,
  isRecommendationStale,
} from "./model";
import { calculateOption } from "./economics";
import { createTemplate as template } from "./templates";
const createTemplate = (kind: "support" | "reporting") =>
  template(kind, "legacy_aggregate");
import { workspaceSchema, type RecommendationInput } from "./types";
import { createWorkspace } from "./model";

function ready() {
  const e = createEngagement("Example"),
    o = createOpportunity("Process");
  e.opportunities.push(o);
  const bau = o.options[0],
    option = o.options[1];
  o.selectedOptionId = option.id;
  for (const x of [bau, option])
    x.inputs = {
      annualVolume: 12000,
      minutesBefore: 10,
      hourlyCost: 60,
      productiveHours: 1800,
      discountRate: 0,
      reduction: x.kind === "bau" ? 0 : 0.5,
      reviewMinutes: 0,
      adoption: 1,
      realisation: 1,
      cashShare: 0,
      rampMonths: 0,
    };
  o.feasibility = o.adoption = "ready";
  o.risk = "ready";
  o.evidence.push({
    id: newId(),
    title: "Accepted fixture evidence",
    excerpt: "Synthetic test evidence",
    source: "Test fixture",
    locator: "Baseline",
    date: "",
    status: "accepted",
    reviewRationale: "Accepted for policy test",
    reviewedAt: "",
    version: 1,
    internalNote: "",
  });
  for (const x of [bau, option])
    for (const field of materialFields(x))
      o.assumptions.push({
        id: newId(),
        optionId: x.id,
        field: field.field,
        value: field.value,
        unit: "",
        provenance: "assumed",
        confidence: "medium",
        evidenceIds: [o.evidence[0].id],
        owner: "Process owner",
        version: 1,
        at: new Date().toISOString(),
        material: true,
      });
  return { e, o, option, bau };
}
const input: RecommendationInput = {
  outcome: "Recommend investment",
  rationale: "Approved business case",
  conditions: "Validate before scaling",
  alternativesRejected: "Lower benefit",
  nextDecisionDate: "2026-12-01",
  strategicException: "",
};
describe("assessment policy and snapshots", () => {
  it("permits calculations but blocks investment based only on owned assumptions", () => {
    const { e, o, option, bau } = ready();
    o.assumptions.forEach((a) => {
      a.evidenceIds = [];
    });
    expect(calculateOption(option, bau).status).toBe("complete");
    expect(assessOpportunity(e, o).outcome).toBe("Investigate");
    expect(() => recordRecommendation(e, o.id, input)).toThrow();
  });
  it("requires explicit risk assessment even with no known critical control failures", () => {
    const { e, o } = ready();
    o.risk = "unknown";
    expect(assessOpportunity(e, o).outcome).toBe("Investigate");
    expect(assessOpportunity(e, o).dimensions.risk).toBe("unknown");
    expect(() => recordRecommendation(e, o.id, input)).toThrow();
    o.risk = "concern";
    expect(assessOpportunity(e, o).outcome).toBe("Validate through pilot");
    expect(() => recordRecommendation(e, o.id, input)).toThrow();
  });
  it("requires provenance for cost timing as well as the cost amount", () => {
    const { e, o, option } = ready();
    option.costs.push({
      id: newId(),
      name: "Implementation",
      category: "implementation",
      amount: 1000,
      frequency: "one_time",
      startMonth: 0,
      endMonth: 0,
      accounting: "capex",
    });
    for (const field of materialFields(option).filter((x) =>
      x.field.startsWith("costs."),
    ))
      o.assumptions.push({
        id: newId(),
        optionId: option.id,
        field: field.field,
        value: field.value,
        unit: "",
        provenance: "assumed",
        confidence: "medium",
        evidenceIds: [o.evidence[0].id],
        owner: "Owner",
        version: 1,
        at: new Date().toISOString(),
        material: true,
      });
    expect(assessOpportunity(e, o).outcome).toBe("Recommend investment");
    option.costs[0].startMonth = 3;
    option.costs[0].endMonth = 3;
    expect(assessOpportunity(e, o).outcome).toBe("Investigate");
  });
  it("distinguishes unknown from adverse readiness with explainable gates", () => {
    const { e, o } = ready();
    expect(assessOpportunity(e, o).outcome).toBe("Recommend investment");
    o.feasibility = "unknown";
    expect(assessOpportunity(e, o).outcome).toBe("Investigate");
    o.feasibility = "concern";
    expect(assessOpportunity(e, o).outcome).toBe("Validate through pilot");
    o.criticalControlsOpen = true;
    expect(assessOpportunity(e, o).outcome).toBe("Defer");
    expect(() => recordRecommendation(e, o.id, input)).toThrow();
  });
  it("requires matching material provenance and blocks conflicted sources even with an owned assumption", () => {
    const { e, o, option } = ready();
    const a = o.assumptions.find(
      (x) => x.optionId === option.id && x.field === "reduction",
    )!;
    a.owner = "";
    a.evidenceIds = [];
    expect(assessOpportunity(e, o).outcome).toBe("Investigate");
    const evidence = {
      id: newId(),
      title: "Sample",
      excerpt: "Synthetic",
      source: "Exercise",
      locator: "1",
      date: "",
      status: "accepted" as const,
      reviewRationale: "Reviewed",
      reviewedAt: "",
      version: 1,
      internalNote: "",
    };
    o.evidence.push(evidence);
    a.evidenceIds = [evidence.id];
    a.provenance = "user_provided";
    expect(assessOpportunity(e, o).outcome).toBe("Recommend investment");
    const before = structuredClone(option.inputs);
    o.evidence[0].status = "conflicted";
    a.owner = "Owner";
    a.provenance = "assumed";
    expect(assessOpportunity(e, o).outcome).toBe("Investigate");
    expect(option.inputs).toEqual(before);
    expect(() => recordRecommendation(e, o.id, input)).toThrow();
    o.evidence[0].status = "accepted";
    option.inputs.reduction = 0.4;
    expect(assessOpportunity(e, o).outcome).toBe("Investigate");
  });
  it("flags strategic exceptions without changing negative computed value", () => {
    const { e, o, option, bau } = ready();
    o.economicHurdle = 999999;
    expect(assessOpportunity(e, o).outcome).toBe("Reject");
    expect(() => recordRecommendation(e, o.id, input)).toThrow();
    const npv = calculateOption(option, bau).npv;
    const saved = recordRecommendation(e, o.id, {
      ...input,
      strategicException:
        "Mandatory service continuity despite hurdle shortfall",
    });
    const snapshot = saved.opportunities[0].recommendations[0];
    expect(snapshot.assessment.outcome).toBe("Reject");
    expect(snapshot.strategicException).not.toBe("");
    expect(
      calculateOption(
        snapshot.opportunity.options[1],
        snapshot.opportunity.options[0],
      ).npv,
    ).toBe(npv);
  });
  it("keeps genuinely negative NPV adverse despite a lower configured hurdle", () => {
    const { e, o, option, bau } = ready();
    option.costs.push({
      id: newId(),
      name: "Implementation",
      category: "implementation",
      amount: 1000000,
      frequency: "one_time",
      startMonth: 0,
      endMonth: 0,
      accounting: "capex",
    });
    for (const field of materialFields(option).filter((x) =>
      x.field.startsWith("costs."),
    ))
      o.assumptions.push({
        id: newId(),
        optionId: option.id,
        field: field.field,
        value: field.value,
        unit: "",
        provenance: "user_provided",
        confidence: "high",
        evidenceIds: [o.evidence[0].id],
        owner: "Owner",
        version: 1,
        at: new Date().toISOString(),
        material: true,
      });
    // Annual benefit is 60,000, so three-year NPV is 180,000 - 1,000,000.
    expect(calculateOption(option, bau).npv).toBe(-820000);
    o.economicHurdle = -1000000;
    const assessment = assessOpportunity(e, o);
    expect(assessment.dimensions.value).toBe("concern");
    expect(assessment.outcome).toBe("Reject");
    expect(
      assessment.reasons.some((reason) => reason.includes("negative")),
    ).toBe(true);
    expect(() => recordRecommendation(e, o.id, input)).toThrow(
      /strategic exception/i,
    );
    const saved = recordRecommendation(e, o.id, {
      ...input,
      strategicException:
        "Mandatory continuity investment despite negative NPV",
    });
    const snapshot = saved.opportunities[0].recommendations[0];
    expect(snapshot.assessment.outcome).toBe("Reject");
    expect(snapshot.assessment.dimensions.value).toBe("concern");
    expect(
      calculateOption(
        snapshot.opportunity.options[1],
        snapshot.opportunity.options[0],
      ).npv,
    ).toBe(-820000);
  });
  it("freezes nonrecursive snapshots, validates rationale/date, and detects subsequent source changes", () => {
    const { e, o } = ready();
    expect(() =>
      recordRecommendation(e, o.id, { ...input, rationale: "" }),
    ).toThrow();
    expect(() =>
      recordRecommendation(e, o.id, {
        ...input,
        nextDecisionDate: "2026-02-31",
      }),
    ).toThrow();
    const saved = recordRecommendation(e, o.id, input),
      snapshot = saved.opportunities[0].recommendations[0];
    expect(e.opportunities[0].recommendations).toHaveLength(0);
    expect(isRecommendationStale(saved.opportunities[0], snapshot)).toBe(false);
    expect(snapshot.opportunity).not.toHaveProperty("recommendations");
    const changed = reviseEngagement(saved, "New evidence", (draft) => {
      draft.opportunities[0].problem = "Different";
    });
    expect(isRecommendationStale(changed.opportunities[0], snapshot)).toBe(
      true,
    );
    expect(snapshot.opportunity.problem).toBe("");
    const second = recordRecommendation(saved, o.id, input);
    expect(second.opportunities[0].recommendations).toHaveLength(2);
    const w = createWorkspace();
    w.engagements = [second];
    expect(workspaceSchema.safeParse(w).success).toBe(true);
  });
  it("provides two synthetic, baseline-consistent examples with costed alternatives and a visible conflict", () => {
    for (const key of ["support", "reporting"] as const) {
      const e = createTemplate(key),
        o = e.opportunities[0];
      const w = createWorkspace();
      w.engagements = [e];
      expect(workspaceSchema.safeParse(w).success).toBe(true);
      expect(o.evidence.some((x) => x.status === "conflicted")).toBe(true);
      expect(o.options).toHaveLength(4);
      expect(o.options.every((x) => x.costs.length > 0)).toBe(true);
      for (const option of o.options)
        expect(calculateOption(option, o.options[0]).status).toBe("complete");
      expect(assessOpportunity(e, o).outcome).toBe("Investigate");
      if (key === "reporting")
        expect(o.options.every((x) => x.inputs.cashShare === 0)).toBe(true);
    }
  });
});
