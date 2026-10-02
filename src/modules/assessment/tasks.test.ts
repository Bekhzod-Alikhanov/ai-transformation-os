import { describe, expect, it } from "vitest";
import { taskEffort } from "./tasks";
import { createOption } from "./model";
import { calculateOption } from "./economics";
import { createTemplate } from "./templates";
import { saveOption } from "./ui/investment-operations";

const row = {
  id: "activity",
  name: "Prepare",
  annualVolume: 6000,
  currentMinutes: 10,
  eligible: 0.8,
  responsibility: "agent" as const,
  remainingMinutes: 2,
  reviewMinutes: 1,
  exceptionRate: 0.1,
  exceptionMinutes: 5,
  evidenceIds: [],
  assumed: true,
};
describe("task-derived investment model", () => {
  it("preserves independent task assumptions through deletion and reordering", () => {
    const o = createTemplate("support").opportunities[0],
      edited = structuredClone(o.options[2]);
    edited.taskPlan!.rows = [
      edited.taskPlan!.rows[2],
      edited.taskPlan!.rows[1],
    ];
    const next = saveOption(
      o,
      edited,
      { owner: "Beck", confidence: "low", evidenceIds: [] },
      o.options[2],
    );
    expect(
      next.options[1].taskPlan!.rows.map((r) => ({
        name: r.name,
        remaining: r.remainingMinutes,
        eligible: r.eligible,
        review: r.reviewMinutes,
      })),
    ).toEqual([
      { name: "Approve response", remaining: 2, eligible: 0, review: 0 },
      { name: "Prepare response", remaining: 6, eligible: 0.2, review: 0.3 },
    ]);
    expect(next.options[2].taskPlan!.rows.map((r) => r.id)).toEqual(
      edited.taskPlan!.rows.map((r) => r.id),
    );
  });
  it("shares task baseline changes while preserving each option's review and adoption", () => {
    const o = createTemplate("support").opportunities[0],
      edit = structuredClone(o.options[2]);
    edit.taskPlan!.rows[0].currentMinutes = 4;
    const next = saveOption(
      o,
      edit,
      { owner: "Beck", confidence: "low", evidenceIds: [] },
      o.options[2],
    );
    expect(next.options.map((x) => x.taskPlan!.rows[0].currentMinutes)).toEqual(
      [4, 4, 4, 4],
    );
    expect(next.options[1].taskPlan!.rows[1].reviewMinutes).toBe(0.3);
    expect(next.options[1].inputs.adoption).toBe(0.85);
    expect(next.options[0].inputs.minutesBefore).toBe(14);
  });
  it("includes unused work, review and exceptions in human hours", () => {
    // 40% unused at 10 min, 60% assisted at 3.5 min = 6.1 min/item.
    const r = taskEffort([row], 0.75);
    expect(r.baselineHours).toBe(1000);
    expect(r.futureHours).toBe(610);
    expect(r.releasedHours).toBe(390);
  });
  it("shows added workload rather than clamping it to savings", () => {
    expect(taskEffort([{ ...row, reviewMinutes: 15 }], 1).releasedHours).toBe(
      -600,
    );
  });
  it("leaves unknown handling time unassessed", () => {
    expect(
      taskEffort([{ ...row, remainingMinutes: null }], 1).releasedHours,
    ).toBeNull();
  });
  it("uses task value once in the canonical monthly engine", () => {
    const bau = createOption("bau");
    bau.inputs = {
      annualVolume: 6000,
      minutesBefore: 10,
      reduction: 0,
      reviewMinutes: 0,
      adoption: 1,
      hourlyCost: 40,
      realisation: 1,
      cashShare: 0,
      productiveHours: 1800,
      rampMonths: 0,
      discountRate: 0,
    };
    bau.taskPlan = {
      rows: [
        {
          ...row,
          responsibility: "human",
          eligible: 0,
          remainingMinutes: 10,
          reviewMinutes: 0,
          exceptionRate: 0,
          exceptionMinutes: 0,
        },
      ],
    };
    const ai = {
      ...createOption("assistance"),
      inputs: { ...bau.inputs, adoption: 0.75, cashShare: 0.25 },
      taskPlan: { rows: [row] },
      cashMechanism: "Avoid contractor renewal",
      costs: [
        {
          id: "build",
          name: "Build",
          category: "implementation" as const,
          amount: 6000,
          frequency: "one_time" as const,
          startMonth: 0,
          endMonth: 0,
          accounting: "unclassified" as const,
        },
        {
          id: "run",
          name: "Run",
          category: "operations" as const,
          amount: 200,
          frequency: "monthly" as const,
          startMonth: 1,
          endMonth: 36,
          accounting: "opex" as const,
        },
      ],
    };
    const f = calculateOption(ai, bau);
    expect(f.status).toBe("complete");
    expect(f.annualHoursSaved).toBe(390);
    expect(f.capacityValue).toBe(15600);
    expect(f.cashSavings).toBe(3900);
    expect(f.firstYearNet).toBe(7200);
    expect(f.npv).toBe(33600);
    expect(f.economicRoi).toBe(1.2);
    expect(f.cashNpv).toBe(-1500);
    expect(f.cashPaybackMonths).toBeNull();
  });
});
