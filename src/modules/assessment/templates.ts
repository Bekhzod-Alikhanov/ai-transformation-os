import { materialFields } from "./assessment";
import { createEngagement, createOpportunity, newId } from "./model";
import type { Engagement, Evidence } from "./types";

/** Synthetic training examples. No evidence claims measurement or live model calls. */
export function createTemplate(kind: "support" | "reporting"): Engagement {
  const support = kind === "support";
  const engagement = createEngagement(
    support ? "Support operations assessment" : "Monthly reporting assessment",
  );
  Object.assign(engagement, {
    client: "Synthetic example — Beck",
    sponsor: "Example operations sponsor",
    processOwner: "Example process owner",
    lead: "Example consultant",
    problem: support
      ? "Growing case volume consumes support capacity."
      : "Repeated report preparation reduces analysis time.",
    objectives:
      "Test a defensible case for change before committing investment.",
    constraints:
      "Synthetic training assumptions only. Practitioner validation required.",
    assessmentDate: "2026-09-01",
    decisionDeadline: "2026-12-01",
  });
  const o = createOpportunity(
    support
      ? "Triage and response preparation"
      : "Management reporting preparation",
  );
  engagement.opportunities.push(o);
  o.problem = engagement.problem;
  o.selectedOptionId = o.options[2].id;
  o.feasibility = "ready";
  o.risk = "ready";
  o.adoption = "concern";
  o.budgetCeiling = 150000;
  const notes = {
    process:
      "Current: receive, prepare, review, approve. Future: assist preparation with human approval.",
    workload: support
      ? "Assumed 48,000 cases per year at 12 minutes each."
      : "Assumed 2,400 reporting packs per year at 90 minutes each.",
    pain: "Practitioner should validate rework, queues and exceptions.",
    data: "Synthetic case descriptions; no customer or operational records.",
    controls:
      "Human approval, access review, audit trail and rollback required.",
    adoption: "Training and a controlled pilot required.",
    value:
      "Released capacity valued separately from the cash subset; no measured outcomes.",
  };
  for (const key of Object.keys(notes) as (keyof typeof notes)[])
    o.discovery[key].notes = notes[key];
  o.processSteps = [
    {
      id: newId(),
      state: "current",
      name: "Prepare and review",
      actor: "Analyst",
      annualVolume: support ? 48000 : 2400,
      minutes: support ? 12 : 90,
      exceptions: "Unstructured or incomplete requests",
      review: "Supervisor sample review",
    },
    {
      id: newId(),
      state: "future",
      name: "Prepare with assistance and approve",
      actor: "Analyst with human approver",
      annualVolume: support ? 48000 : 2400,
      minutes: null,
      exceptions: "Route uncertain outputs to manual work",
      review: "Human approval before use",
    },
  ];
  const source = (
    title: string,
    status: Evidence["status"],
    excerpt: string,
  ): Evidence => ({
    id: newId(),
    title,
    excerpt,
    source: "Synthetic workshop exercise — not measured evidence",
    locator: "Editable example brief",
    date: "2026-09-01",
    status,
    reviewRationale:
      status === "accepted"
        ? "Accepted as an illustrative assumption source only"
        : "Illustrative disagreement to resolve before investment",
    reviewedAt: "2026-09-01T12:00:00.000Z",
    version: 1,
    internalNote:
      "Replace with practitioner-validated evidence before real use.",
  });
  o.evidence = [
    source("Synthetic baseline sketch", "accepted", notes.workload),
    source(
      "Conflicting reduction estimates",
      "conflicted",
      "Synthetic workshop estimates disagree; no model evaluation was performed.",
    ),
  ];
  o.requests = [
    {
      id: newId(),
      question: "What reduction is supported by a timed, representative trial?",
      owner: "Process owner",
      impact: "Resolve the material reduction assumption",
      status: "open",
    },
  ];
  const reductions = [0, 0.18, 0.48, 0.68],
    setup = [0, 12000, 45000, 90000],
    monthly = [1000, 1100, 2000, 3000];
  o.options.forEach((option, index) => {
    option.inputs = {
      annualVolume: support ? 48000 : 2400,
      minutesBefore: support ? 12 : 90,
      reduction: reductions[index],
      reviewMinutes:
        index === 0
          ? 0
          : support
            ? [0, 0.2, 1.2, 2][index]
            : [0, 2, 8, 14][index],
      adoption: index === 0 ? 1 : 0.8,
      hourlyCost: support ? 38 : 65,
      realisation: 0.8,
      cashShare: support && index > 0 ? 0.25 : 0,
      productiveHours: 1760,
      rampMonths: index === 0 ? 0 : 3,
      discountRate: 0.1,
    };
    option.cashMechanism =
      support && index > 0
        ? "Avoid planned contractor renewal for 25% of realised capacity; validate contract timing before committing."
        : "";
    option.costs = [
      {
        id: newId(),
        name:
          index === 0
            ? "No new implementation"
            : "Discovery, data, implementation and change",
        category: "implementation",
        amount: setup[index],
        frequency: "one_time",
        startMonth: 0,
        endMonth: 0,
        accounting: index === 0 ? "opex" : "unclassified",
      },
      {
        id: newId(),
        name: "Platform and operations",
        category: "operations",
        amount: monthly[index],
        frequency: "monthly",
        startMonth: 1,
        endMonth: 36,
        accounting: "opex",
      },
    ];
    option.scenarios = [
      {
        id: newId(),
        name: "Conservative uptake",
        inputPatch: { adoption: index === 0 ? 1 : 0.55 },
        costMultiplier: 1.2,
        benefitMultiplier: 1,
      },
    ];
    for (const field of materialFields(option))
      o.assumptions.push({
        id: newId(),
        optionId: option.id,
        field: field.field,
        value: field.value,
        unit: field.field === "reduction" ? "fraction" : "model units",
        provenance: "assumed",
        confidence: "low",
        evidenceIds:
          field.field === "reduction" && index === 2 ? [o.evidence[1].id] : [],
        owner: "Example process owner",
        version: 1,
        at: "2026-09-01T12:00:00.000Z",
        material: true,
      });
  });
  o.validation = {
    hypotheses: "Assistance releases usable capacity while preserving quality.",
    baseline: "Collect a representative timed sample with exceptions.",
    thresholds:
      "Meet agreed reduction and quality thresholds with no critical control failures.",
    method:
      "Time-boxed comparison with matched manual cases and independent review.",
    owner: "Process owner",
    budgetCeiling: 15000,
    controls:
      "Human approval; access limits; audit log; no confidential data in this example.",
    stopCriteria:
      "Stop on critical control breach, material quality degradation or budget overrun.",
  };
  return engagement;
}
