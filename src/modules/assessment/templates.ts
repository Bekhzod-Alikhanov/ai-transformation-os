import { materialFields } from "./assessment";
import { createEngagement, createOpportunity, newId } from "./model";
import type { Engagement, Evidence, TaskRow } from "./types";
import { taskEffort } from "./tasks";
import { reportingEvaluation, reportingFixture } from "./evaluation";

/** Synthetic training examples. No evidence claims measurement or live model calls. */
export function createTemplate(
  kind: "support" | "reporting",
  model: "connected" | "legacy_aggregate" = "connected",
): Engagement {
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
  if (model === "legacy_aggregate") return engagement;
  // Both examples use the same task and option services as a blank assessment.
  engagement.name = support
    ? "Support Operations Copilot"
    : "Executive Reporting Automation";
  engagement.client = "Aster Financial Group · synthetic";
  engagement.lead = "Beck";
  engagement.sponsor = support
    ? "Operations sponsor (synthetic)"
    : "Finance sponsor (synthetic)";
  o.name = support
    ? "Support triage & response preparation"
    : "Reporting reconciliation & pack preparation";
  o.evidence[1].title = "Pilot validation still required";
  o.evidence[1].status = "pending";
  o.evidence[1].excerpt =
    "Synthetic projections are illustrative. Adoption, human review time and real-world quality still need validation.";
  o.selectedOptionId = o.options[support ? 2 : 1].id;
  o.adoption = "ready";
  o.decisionPolicy = {
    objective: "economic",
    paybackCeiling: 24,
    npvHurdle: 0,
  };
  o.questions = [
    [
      "workload",
      "What volume and handling time were measured?",
      notes.workload,
    ],
    [
      "variation",
      "Which tasks need judgment rather than rules?",
      support
        ? "Response preparation varies by ticket; routing has deterministic rules."
        : "Structured consolidation and reconciliation can use rules.",
    ],
    [
      "data",
      "Which sources can support an answer?",
      "Synthetic source policies and workload sketch; no client data.",
    ],
    [
      "quality",
      "What happens when a proposed output is wrong?",
      "Human reviewer corrects or escalates before use.",
    ],
    [
      "controls",
      "Who approves outputs and exceptions?",
      "Process owner; approval remains human.",
    ],
    [
      "adoption",
      "How much review time will users actually need?",
      support
        ? "Timed pilot needed before investment."
        : "Structured rules outputs use a reconciliation checklist.",
    ],
    [
      "value",
      "How will released hours become useful work or cash?",
      support
        ? "Validate contractor renewal avoidance; remaining capacity is not cash."
        : "Capacity redirected to analysis; no cash saving claimed.",
    ],
  ].map(([area, question, answer]) => ({
    id: newId(),
    area: area as NonNullable<typeof o.questions>[number]["area"],
    question,
    answer,
    owner: "Process owner",
    evidenceIds: [o.evidence[0].id],
    unresolved: support && area === "adoption",
  }));
  const activities = support
    ? ["Triage", "Prepare response", "Approve response"]
    : ["Collect and reconcile", "Prepare narrative", "Approve pack"];
  const current = support ? [2, 8, 2] : [60, 20, 10];
  const taskKeys = activities.map(() => newId());
  o.assumptions = [];
  o.options.forEach((option, index) => {
    option.name = [
      "Manual / business as usual",
      "Rules-based automation",
      "Human-reviewed AI",
      "Broader AI automation",
    ][index];
    option.inputs.adoption = index === 0 ? 1 : 0.85;
    option.inputs.reduction = index === 0 ? 0 : 0.5;
    option.inputs.reviewMinutes = 0; // Review is captured at task level, not counted twice.
    option.readiness = {
      data: "ready",
      technical: "ready",
      controlsOpen: false,
      validationRequired: support && index >= 2,
      ...(index === 0 || (support && index === 1)
        ? {}
        : {
            evaluationDataset: support
              ? ("support-fixtures-v1" as const)
              : index === 1
                ? ("reporting-rules-v1" as const)
                : ("reporting-narrative-fixtures-v1" as const),
          }),
    };
    const remaining = support
      ? [
          [2, 8, 2],
          [0.3, 6, 2],
          [0.2, 1.5, 1.5],
          [0.2, 1.2, 1],
        ]
      : [
          [60, 20, 10],
          [5, 20, 10],
          [8, 5, 10],
          [5, 4, 10],
        ];
    const eligible = support
      ? [
          [0, 0, 0],
          [0.9, 0.2, 0],
          [0.95, 0.85, 1],
          [0.98, 0.9, 1],
        ]
      : [
          [0, 0, 0],
          [1, 0, 0],
          [1, 0.8, 0],
          [1, 0.9, 0],
        ];
    const review = support
      ? [
          [0, 0, 0],
          [0.1, 0.3, 0],
          [0.1, 0.8, 0.5],
          [0.5, 2, 1.5],
        ]
      : [
          [0, 0, 0],
          [3, 0, 0],
          [12, 8, 0],
          [18, 10, 0],
        ];
    const rows: TaskRow[] = activities.map((name, k) => ({
      id: newId(),
      name,
      baselineKey: taskKeys[k],
      annualVolume: option.inputs.annualVolume,
      currentMinutes: current[k],
      eligible: eligible[index][k],
      responsibility:
        index === 0 || eligible[index][k] === 0
          ? "human"
          : index === 1
            ? "automation"
            : "agent",
      remainingMinutes: remaining[index][k],
      reviewMinutes: review[index][k],
      exceptionRate: index === 0 ? 0 : 0.1,
      exceptionMinutes: eligible[index][k] ? (support ? 4 : 5) : 0,
      evidenceIds: [o.evidence[0].id],
      assumed: true,
    }));
    option.taskPlan = { rows, referenceReduction: index === 0 ? 0 : 0.5 };
    const implementation = support
      ? [0, 12000, 45000, 100000]
      : [0, 15000, 70000, 110000];
    const run = support ? [1000, 1600, 3000, 4500] : [1000, 1500, 3800, 5000];
    const setup = option.costs[0],
      recurring = option.costs[1];
    option.costs = [
      ...(
        [
          ["Discovery and design", "discovery", 0.2],
          ["Data preparation and integration", "data", 0.2],
          ["Implementation and testing", "implementation", 0.5],
          ["Training and change management", "change", 0.1],
        ] as const
      ).map(([name, category, share], i) => ({
        ...setup,
        id: i === 0 ? setup.id : newId(),
        name,
        category,
        amount: implementation[index] * share,
      })),
      ...(
        [
          ["Infrastructure and software", "technology", 0.35],
          [
            index > 1 ? "Model usage allowance" : "Rules runtime and tooling",
            "technology",
            0.2,
          ],
          ["Monitoring and support", "operations", 0.35],
          ["Ongoing training", "change", 0.1],
        ] as const
      ).map(([name, category, share], i) => ({
        ...recurring,
        id: i === 0 ? recurring.id : newId(),
        name,
        category,
        amount: run[index] * share,
      })),
    ];
    option.scenarios = [
      {
        id: newId(),
        name: "Conservative",
        inputPatch: { adoption: index === 0 ? 1 : 0.45 },
        costMultiplier: 1.2,
        benefitMultiplier: 1,
      },
      {
        id: newId(),
        name: "Base",
        inputPatch: {},
        costMultiplier: 1,
        benefitMultiplier: 1,
      },
      {
        id: newId(),
        name: "Upside",
        inputPatch: { adoption: index === 0 ? 1 : 0.95 },
        costMultiplier: 0.9,
        benefitMultiplier: 1,
      },
    ];
    for (const field of materialFields(option))
      o.assumptions.push({
        id: newId(),
        optionId: option.id,
        field: field.field,
        value: field.value,
        unit: "model units",
        provenance: "assumed",
        confidence: "medium",
        evidenceIds: [o.evidence[0].id],
        owner: "Process owner",
        version: 1,
        at: "2026-10-01T12:00:00.000Z",
        material: true,
      });
  });
  const baseline = taskEffort(o.options[0].taskPlan!.rows, 1).baselineHours!;
  if (!support)
    o.evaluations = [
      reportingEvaluation(o.options[1].id, o.revision, reportingFixture),
    ];
  o.evidence[0].excerpt = `Synthetic baseline: ${o.options[0].inputs.annualVolume} items/year; activities ${activities.map((x, i) => `${x}: ${current[i]} minutes`).join(", ")}; ${baseline} annual human hours. Loaded cost ${o.options[0].inputs.hourlyCost}/hour. Synthetic scenario/cost assumptions accepted only for demonstration, not measured client evidence.`;
  o.validation.baseline = `${baseline} annual human hours; validate with a representative timed sample.`;
  o.requests.push(
    {
      id: newId(),
      question:
        "How much human review and exception handling is needed per task?",
      owner: "Process owner",
      impact: "Extra human effort reduces released hours and NPV",
      status: "open",
    },
    {
      id: newId(),
      question: support
        ? "Can contractor renewal actually be avoided?"
        : "Where will released capacity be redeployed?",
      owner: "Finance sponsor",
      impact: support
        ? "Cash-only returns may differ materially from economic value"
        : "Capacity value is useful work, not cash savings",
      status: "open",
    },
  );
  return engagement;
}
