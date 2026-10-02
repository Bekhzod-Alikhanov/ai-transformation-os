import { describe, expect, it } from "vitest";
import { createTemplate } from "./templates";
import { createWorkspace, duplicateEngagement } from "./model";
import { serializeBackup, parseBackup } from "./repository";
import { replaySupport } from "./evaluation";
import {
  assessPilot,
  createPilotDraft,
  savePilotRevision,
  applyPilotFindings,
  pilotBasis,
  rebasePilotDraft,
} from "./pilot";

function context() {
  const e = createTemplate("support"),
    o = e.opportunities[0];
  const draft = createPilotDraft(e, o, "target");
  return { e, o, draft };
}
describe("reviewed pilot economics", () => {
  it("calculates observed means, adoption and recorded cost without counting manual comparators as pilot labour", () => {
    const { e, o, draft } = context();
    draft.eligibleCases = 100;
    draft.assistedCases = 80;
    draft.successfulOutcomes = 76;
    draft.nonLabourSpend = 100;
    draft.otherHumanMinutes = 0;
    draft.observations.forEach((r) => {
      r.sampleCount = 10;
      r.manualMinutes = 100;
      r.handlingMinutes = 20;
      r.reviewMinutes = 10;
      r.exceptions = 2;
      r.exceptionMinutes = 8;
    });
    const a = assessPilot(e, o, draft);
    expect(a.metrics.adoption).toBe(0.8);
    expect(a.metrics.successRate).toBe(0.95);
    expect(a.metrics.manualHours).toBe(5);
    expect(a.metrics.futureHours).toBe(1.9);
    expect(a.metrics.hoursReleased).toBe(3.1);
    expect(a.metrics.totalCost).toBe(172.2);
    expect(a.metrics.costPerSuccess).toBe(2.27);
    expect(
      a.changes.find((c) => c.field.endsWith("exceptionRate"))?.after,
    ).toBe(0.2);
  });
  it("retains negative effort and adverse projections", () => {
    const { e, o, draft } = context();
    const a = assessPilot(e, o, createPilotDraft(e, o, "high_review"));
    expect(a.metrics.hoursReleased).toBeLessThan(0);
    expect(a.projected.annualHoursSaved).toBeLessThan(0);
    expect(a.disposition).toBe("Fix");
    expect(assessPilot(e, o, draft).projected.npv).toBeGreaterThan(
      a.projected.npv!,
    );
  });
  it("unsafe releases override missing observations and financial failures", () => {
    const { e, o, draft } = context();
    draft.unsafeReleased = 1;
    draft.observations[0].sampleCount = null;
    expect(assessPilot(e, o, draft).disposition).toBe("Stop");
  });
  it("does not turn zero denominators or unknowns into zero value", () => {
    const { e, o, draft } = context();
    draft.eligibleCases = 0;
    draft.assistedCases = 0;
    draft.successfulOutcomes = 0;
    const a = assessPilot(e, o, draft);
    expect(a.metrics.adoption).toBeNull();
    expect(a.metrics.costPerSuccess).toBeNull();
    expect(a.disposition).toBe("Investigate");
    draft.observations[0].reviewMinutes = null;
    expect(assessPilot(e, o, draft).projected.npv).toBeNull();
  });
  it("never clears required validation, evidence or evaluations", () => {
    const { e, o, draft } = context();
    expect(assessPilot(e, o, draft).disposition).toBe("Extend pilot");
    expect(o.options[2].readiness?.validationRequired).toBe(true);
  });
  it("applies selected fields only, keeps forecast history and links reviewed evidence", () => {
    const { o, draft } = context();
    const saved = savePilotRevision(o, draft);
    const pilot = saved.pilots!.at(-1)!;
    const next = applyPilotFindings(
      saved,
      pilot.id,
      pilotBasis(saved, pilot.optionId),
      {
        owner: "Beck",
        rationale: "Reviewed synthetic timing",
        confidence: "low",
      },
    );
    expect(next.options[2].inputs.adoption).toBe(0.9);
    expect(next.options.filter((x) => x.id !== pilot.optionId)).toEqual(
      o.options.filter((x) => x.id !== pilot.optionId),
    );
    expect(next.options[2].costs).toEqual(o.options[2].costs);
    expect(next.options[2].taskPlan!.rows.map((r) => r.currentMinutes)).toEqual(
      [2, 8, 2],
    );
    expect(next.pilots![0]).toEqual(pilot);
    expect(next.pilotApplications).toHaveLength(1);
    expect(next.assumptions.at(-1)?.evidenceIds).toEqual([
      next.pilotApplications![0].evidenceId,
    ]);
    expect(next.evidence.at(-1)?.status).toBe("accepted");
    expect(() =>
      applyPilotFindings(next, pilot.id, pilotBasis(next, pilot.optionId), {
        owner: "Beck",
        rationale: "Again",
        confidence: "low",
      }),
    ).toThrow(/already applied/i);
  });
  it("rejects stale basis and preserves old records on a new save", () => {
    const { o, draft } = context();
    const first = savePilotRevision(o, draft);
    first.options[2].costs[0].amount = 99999;
    expect(() =>
      applyPilotFindings(
        first,
        first.pilots![0].id,
        pilotBasis(first, draft.optionId),
        { owner: "Beck", rationale: "Reviewed", confidence: "low" },
      ),
    ).toThrow(/changed|stale/i);
    expect(() => savePilotRevision(first, draft)).toThrow(/changed|stale/i);
  });
  it("round trips snapshots and pilot revisions without deleting older backups", () => {
    const { e, o, draft } = context();
    e.opportunities[0] = savePilotRevision(o, draft);
    const w = createWorkspace();
    w.engagements = [e];
    expect(
      parseBackup(serializeBackup(w)).engagements[0].opportunities[0].pilots,
    ).toHaveLength(1);
    const copy = duplicateEngagement(e);
    const restored = createWorkspace();
    restored.engagements = [e, copy];
    expect(() => serializeBackup(restored)).not.toThrow();
    expect(copy.opportunities[0].pilots![0].optionId).toBe(
      copy.opportunities[0].options[2].id,
    );
  });
  it("will not save a forecast that disagrees with its captured basis", () => {
    const { o, draft } = context();
    draft.forecast.option.costs[0].amount = 1;
    expect(() => savePilotRevision(o, draft)).toThrow(/forecast|basis/i);
  });
  it("requires readiness gates even when performance thresholds are satisfied", () => {
    const { e, o, draft } = context();
    const saved = savePilotRevision(o, draft);
    const applied = applyPilotFindings(
      saved,
      saved.pilots![0].id,
      pilotBasis(saved, draft.optionId),
      { owner: "Beck", rationale: "Reviewed timings", confidence: "low" },
    );
    applied.adoption = "ready";
    applied.options[2].readiness!.validationRequired = false;
    applied.questions!.forEach((q) => (q.unresolved = false));
    applied.evaluations = [replaySupport(draft.optionId, applied.revision)];
    applied.evaluations[0].cases.forEach((c) => {
      c.output = c.expected;
      c.correct = true;
      c.supported = true;
    });
    const fresh = createPilotDraft(e, applied, "target");
    const assessment = assessPilot(e, applied, fresh);
    expect(assessment.disposition, JSON.stringify(assessment.reasons)).toBe(
      "Ready for scale review",
    );
    fresh.thresholds.successRate = 1;
    expect(assessPilot(e, applied, fresh).disposition).toBe("Extend pilot");
  });
  it("flags pilot budget excess and refuses invalid sample counts", () => {
    const { e, o, draft } = context();
    draft.budget = 1;
    expect(assessPilot(e, o, draft).disposition).toBe("Fix");
    draft.observations[0].exceptions = 1000;
    expect(() => savePilotRevision(o, draft)).toThrow(/Exceptions/);
    expect(assessPilot(e, o, draft).disposition).toBe("Investigate");
  });
  it("keeps oversized or non-finite draft inputs actionable instead of crashing the editor", () => {
    const { e, o, draft } = context();
    draft.assistedCases = Infinity;
    expect(() => assessPilot(e, o, draft)).not.toThrow();
    expect(assessPilot(e, o, draft).disposition).toBe("Investigate");
    draft.assistedCases = 90;
    draft.observations.forEach((r) => (r.handlingMinutes = 1e308));
    expect(() => assessPilot(e, o, draft)).not.toThrow();
    expect(assessPilot(e, o, draft).disposition).toBe("Investigate");
  });
  it("carries edited applied measurements to a fresh forecast without erasing the entered timings", () => {
    const { e, o, draft } = context();
    const saved = savePilotRevision(o, draft);
    const applied = applyPilotFindings(
      saved,
      saved.pilots![0].id,
      pilotBasis(saved, draft.optionId),
      { owner: "Beck", rationale: "Reviewed", confidence: "low" },
    );
    const edit = structuredClone(applied.pilots![0]);
    edit.observations[1].reviewMinutes = 777;
    const rebased = rebasePilotDraft(e, applied, edit);
    expect(rebased.observations[1].reviewMinutes).toBe(777);
    expect(rebased.forecast.option.inputs.adoption).toBe(0.9);
    expect(savePilotRevision(applied, rebased).pilots).toHaveLength(2);
    expect(applied.pilots![0].observations[1].reviewMinutes).toBe(72);
  });
});
