import { describe, expect, it } from "vitest";
import {
  assessProject,
  evaluationKey,
  evaluateExamples,
  optionInputs,
  parseBaselineCsv,
  recordDecision,
  restoreWorkspace,
  reviseProject,
  seedWorkspace,
  type DecisionInput,
} from "./model";
import { calculateEconomics } from "./economics";
import { currency, decisionBrief } from "./exports";

function readyProject() {
  const p = seedWorkspace().projects[0]!;
  p.evidence.forEach((e) => {
    e.status = "accepted";
  });
  p.tasks.forEach((t) => {
    t.done = true;
  });
  p.risks.forEach((r) => {
    r.closed = true;
  });
  p.measurements = {
    adoption: 0.8,
    quality: 0.99,
    minutesAfter: 6,
    sampleSize: 240,
    source: "Fixture",
    period: "Weeks 1–4",
    synthetic: true,
  };
  p.evaluationInput = evaluationKey(p);
  p.evaluationRevision = p.revision;
  return p;
}
const decision: DecisionInput = {
  decision: "Scale",
  rationale: "Pilot evidence supports this bounded workflow",
  conditions: "",
  owner: "Beck",
  followUp: "2026-10-12",
  override: "",
};
describe("two-project engagement model", () => {
  it("rejects structurally incomplete backups before they can break the workspace", () => {
    const empty = seedWorkspace();
    empty.projects[0]!.evidence = [];
    expect(() => restoreWorkspace(JSON.stringify(empty))).toThrow(/missing/);
    const missing = seedWorkspace();
    missing.projects[0]!.risks = [];
    expect(() => restoreWorkspace(JSON.stringify(missing))).toThrow(/missing/);
    const cycle = seedWorkspace();
    cycle.projects[0]!.tasks[0]!.dependency = "task-5";
    expect(() => restoreWorkspace(JSON.stringify(cycle))).toThrow(
      /dependencies/,
    );
  });
  it("seeds exactly two distinct cases and cash treatments", () => {
    const state = seedWorkspace();
    expect(state.projects.map((p) => p.id)).toEqual(["support", "reporting"]);
    expect(state.projects[1]!.inputs.cashShare).toBe(0);
    expect(restoreWorkspace(JSON.stringify(state))).toEqual(state);
    expect(() =>
      restoreWorkspace(
        JSON.stringify({
          ...state,
          projects: [state.projects[0], state.projects[0]],
        }),
      ),
    ).toThrow();
  });
  it("keeps independent deterministic economics for non-AI, assisted and costly options", () => {
    for (const id of ["support", "reporting"] as const) {
      expect(calculateEconomics(optionInputs(id, "rules")).npv).toBeGreaterThan(
        0,
      );
      expect(
        calculateEconomics(optionInputs(id, "copilot")).npv,
      ).toBeGreaterThan(0);
      expect(calculateEconomics(optionInputs(id, "rollout")).npv).toBeLessThan(
        0,
      );
    }
  });
  it("requires reviewed evidence, current evaluation, and observations before scale", () => {
    const p = seedWorkspace().projects[0]!;
    expect(assessProject(p).scaleBlocked).toBe(true);
    p.evidence.forEach((e) => {
      e.status = "accepted";
    });
    expect(assessProject(p).reasons[0]).toMatch(/evaluation/);
    p.evaluationInput = evaluationKey(p);
    expect(assessProject(p).reasons[0]).toMatch(/measured/);
    expect(assessProject(readyProject()).recommendation).toBe("Scale");
  });
  it.each([
    "adoption",
    "quality",
    "control",
    "budget",
    "economics",
    "evaluation",
    "conflict",
    "tasks",
    "measuredEconomics",
    "autonomy",
    "overspend",
  ])("reassesses the %s gate", (kind) => {
    const p = readyProject();
    let expected = "Fix";
    if (kind === "adoption") p.measurements!.adoption = 0.38;
    if (kind === "quality") {
      p.measurements!.quality = 0.7;
      expected = "Pause";
    }
    if (kind === "control") {
      p.risks.find((r) => r.severity === "critical")!.closed = false;
      expected = "Pause";
    }
    if (kind === "budget") p.budgetCap = 100;
    if (kind === "economics") {
      p.inputs.implementationCost = 900000;
      expected = "Stop";
    }
    if (kind === "evaluation") {
      p.inputs.adoption = 0.9;
      expected = "Pilot";
    }
    if (kind === "conflict") {
      p.evidence[0]!.status = "conflicted";
      expected = "Pilot";
    }
    if (kind === "tasks") {
      p.tasks[5]!.done = false;
      expected = "Scale with conditions";
    }
    if (kind === "measuredEconomics") {
      p.measurements!.minutesAfter = 11.9;
      expected = "Stop";
    }
    if (kind === "autonomy") {
      p.option = "rollout";
      p.evaluationInput = evaluationKey(p);
      expected = "Pilot";
    }
    if (kind === "overspend") p.actualSpend = 70000;
    expect(assessProject(p).recommendation).toBe(expected);
  });
  it("keeps immutable snapshots and detects stale decisions after input revision", () => {
    const original = readyProject();
    const recorded = recordDecision(original, decision);
    expect(original.decisions).toHaveLength(0);
    const next = reviseProject(recorded, "Reduce adoption", (p) => {
      p.inputs.adoption = 0.2;
    });
    expect(next.decisions[0]!.snapshot.inputs.adoption).toBe(0.7);
    expect(next.decisions[0]!.revision).toBe(1);
    expect(next.revision).toBe(2);
    expect(next.history.at(-1)!.detail).toBe("Reduce adoption");
    expect(decisionBrief(next)).toContain("stale: reassessment required");
    expect(decisionBrief(next)).toContain(
      currency(calculateEconomics(next.inputs).npv),
    );
  });
  it("blocks invalid decisions, scale overrides, and invalid calendar dates", () => {
    const p = seedWorkspace().projects[0]!;
    expect(() => recordDecision(p, decision)).toThrow(/Scale is blocked/);
    expect(() => recordDecision(p, { ...decision, decision: "Fix" })).toThrow(
      /differs/,
    );
    expect(() => recordDecision(p, { ...decision, decision: "Pilot" })).toThrow(
      /conditions/,
    );
    expect(() =>
      recordDecision(p, { ...decision, followUp: "2026-02-31" }),
    ).toThrow(/valid/);
    expect(() =>
      recordDecision(readyProject(), { ...decision, rationale: " " }),
    ).toThrow();
  });
  it("does not mistake fixture evaluation for perfect model quality", () => {
    for (const id of ["support", "reporting"] as const) {
      const result = evaluateExamples(id);
      expect(result.accuracy).toBeLessThan(1);
      expect(result.citationValidity).toBeLessThan(1);
      expect(result.criticalEscalation).toBe(1);
      expect(result.unsafeAutonomy).toBe(true);
    }
  });
  it("calculates a weighted CSV baseline and rejects invalid rows", () => {
    expect(parseBaselineCsv("volume,minutes\n100,10\n300,20")).toEqual({
      annualVolume: 400,
      minutesBefore: 17.5,
      rows: 2,
    });
    for (const invalid of [
      "",
      "wrong,columns\n1,2",
      "volume,minutes\n-1,5",
      "volume,minutes\n2,Infinity",
      "volume,minutes\n,10",
    ])
      expect(() => parseBaselineCsv(invalid)).toThrow();
  });
});
