import { expect, it } from "vitest";
import { createTemplate } from "./templates";
import { compareInvestment } from "./decision";
import {
  replaySupport,
  replayReportingNarrative,
  evaluationMetrics,
  runReporting,
} from "./evaluation";
import { generateValidation } from "./validation";
import {
  createWorkspace,
  duplicateEngagement,
  recordRecommendation,
} from "./model";
import { assessOpportunity } from "./assessment";
import { workspaceSchema } from "./types";
it("duplicates connected tasks, questions and evaluation references without corrupting either record", () => {
  const e = createTemplate("support"),
    o = e.opportunities[0];
  o.evaluations = [replaySupport(o.options[2].id, o.revision)];
  const copy = duplicateEngagement(e),
    w = createWorkspace();
  w.engagements = [e, copy];
  expect(workspaceSchema.safeParse(w).success).toBe(true);
  expect(copy.opportunities[0].evaluations?.[0].optionId).toBe(
    copy.opportunities[0].options[2].id,
  );
});
it("prefers an AI pilot for support, but rules when AI adoption falls", () => {
  const e = createTemplate("support"),
    o = e.opportunities[0];
  expect(compareInvestment(e, o).preferredKind).toBe("assistance");
  expect(compareInvestment(e, o).outcome).toBe("Pilot AI");
  o.options
    .filter((x) => x.kind === "assistance" || x.kind === "automation")
    .forEach((x) => {
      x.inputs.adoption = 0.1;
    });
  expect(compareInvestment(e, o).preferredKind).toBe("rules");
});
it("recommends conventional automation for structured reporting", () => {
  const e = createTemplate("reporting"),
    r = compareInvestment(e, e.opportunities[0]);
  expect(r.preferredKind).toBe("rules");
  expect(r.outcome).toBe("Recommend non-AI automation");
});
it("does not invent a preference when material inputs are unknown", () => {
  const e = createTemplate("support"),
    o = e.opportunities[0];
  o.options.forEach((x) => {
    x.inputs.annualVolume = null;
  });
  expect(compareInvestment(e, o).outcome).toBe("Investigate");
});
it("uses measured replay rows, including the blocked unsupported response", () => {
  const e = createTemplate("support"),
    o = e.opportunities[0],
    option = o.options[2];
  const run = replaySupport(option.id, o.revision);
  run.datasetVersion = option.readiness!.evaluationDataset!;
  const m = evaluationMetrics(run);
  expect(m.total).toBe(4);
  expect(m.correct).toBe(3);
  expect(m.unsupported).toBe(1);
  expect(m.unsafeReleased).toBe(0);
  expect(run.cases.find((x) => !x.supported)?.control).toMatch(/human/i);
});
it("calculates reporting variance locally and rejects an invalid baseline", () => {
  expect(
    runReporting("department,actual,budget\nSupport,120,100\nFinance,80,90"),
  ).toMatchObject({ actual: 200, budget: 190, variance: 10 });
  expect(() =>
    runReporting("department,actual,budget\nSupport,unknown,100"),
  ).toThrow(/row 2/i);
});
it("reconciles recorded AI reporting claims against a fixed rules-calculated baseline", () => {
  const run = replayReportingNarrative("option", 1);
  expect(run.mode).toBe("synthetic_replay");
  expect(run.datasetVersion).toBe("reporting-narrative-fixtures-v1");
  expect(evaluationMetrics(run)).toMatchObject({
    total: 3,
    correct: 1,
    unsupported: 2,
    unsafeReleased: 0,
  });
  expect(run.cases[1]).toMatchObject({
    expected: "Under budget",
    output: "Over budget",
    escalated: true,
  });
});
it("generates a handover from actual gaps rather than generic tasks", () => {
  const e = createTemplate("support"),
    o = e.opportunities[0];
  const draft = generateValidation(e, o);
  expect(draft.method).toMatch(/adoption/i);
  expect(draft.controls).toMatch(/human/i);
  expect(draft.baseline).toMatch(/9600/);
});
it("keeps cash returns distinct from capacity value", () => {
  const e = createTemplate("support"),
    o = e.opportunities[0];
  o.decisionPolicy!.objective = "cash";
  expect(compareInvestment(e, o).outcome).toBe(
    "Keep manual / no current investment case",
  );
});
const investment = {
  outcome: "Recommend investment" as const,
  rationale: "A reviewed recommendation",
  conditions: "",
  alternativesRejected: "",
  nextDecisionDate: "2026-12-01",
  strategicException: "",
};
it("prevents recording investment after an unsafe or stale evaluation", () => {
  const e = createTemplate("reporting"),
    o = e.opportunities[0],
    option = o.options[1];
  const run = replaySupport(option.id, o.revision);
  run.cases = [run.cases[2]];
  run.datasetVersion = option.readiness!.evaluationDataset!;
  run.cases[0].escalated = false;
  o.evaluations = [run];
  expect(assessOpportunity(e, o).outcome).toBe("Defer");
  expect(() => recordRecommendation(e, o.id, investment)).toThrow(
    /evaluation|controls/i,
  );
  run.cases[0].escalated = true;
  run.inputRevision = o.revision - 1;
  expect(compareInvestment(e, o).outcome).toBe("Validate non-AI automation");
  expect(() => recordRecommendation(e, o.id, investment)).toThrow(
    /evaluation|validation/i,
  );
});
it("enforces the payback ceiling in the saved recommendation as well as comparison", () => {
  const e = createTemplate("reporting"),
    o = e.opportunities[0];
  o.decisionPolicy!.paybackCeiling = 0;
  expect(assessOpportunity(e, o).outcome).toBe("Reject");
  expect(() => recordRecommendation(e, o.id, investment)).toThrow(
    /strategic exception/i,
  );
});
it("requires investigation for unknown global readiness", () => {
  const e = createTemplate("support"),
    o = e.opportunities[0];
  for (const dimension of ["feasibility", "adoption", "risk"] as const) {
    const draft = structuredClone(o);
    draft[dimension] = "unknown";
    expect(compareInvestment(e, draft).outcome).toBe("Investigate");
  }
});
it("does not let unrelated passing evaluations replace a failed support suite", () => {
  const e = createTemplate("support"),
    o = e.opportunities[0],
    selected = o.options[2];
  o.questions!.forEach((q) => (q.unresolved = false));
  o.adoption = o.feasibility = o.risk = "ready";
  selected.readiness!.validationRequired = false;
  o.evaluations = [
    replaySupport(selected.id, o.revision),
    { ...replayReportingNarrative(selected.id, o.revision), cases: [] },
  ];
  expect(compareInvestment(e, o).outcome).toBe("Pilot AI");
  expect(() => recordRecommendation(e, o.id, investment)).toThrow(
    /evaluation|validation/i,
  );
});
