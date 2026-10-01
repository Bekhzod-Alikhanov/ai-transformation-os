import { restoreWorkspace, type Project } from "../delivery-workbench/model";
import { createOption, newId } from "./model";
import {
  workspaceSchema,
  type Engagement,
  type LabourInputs,
  type Opportunity,
  type SolutionOption,
  type Workspace,
} from "./types";

const optionKinds: Record<Project["option"], SolutionOption["kind"]> = {
  rules: "rules",
  copilot: "assistance",
  rollout: "automation",
};

function baseline(project: Project): LabourInputs {
  return {
    annualVolume: project.inputs.annualVolume,
    minutesBefore: project.inputs.minutesBefore,
    reduction: null,
    reviewMinutes: null,
    adoption: null,
    hourlyCost: project.inputs.hourlyCost,
    realisation: project.inputs.realisation,
    cashShare: project.inputs.cashShare,
    productiveHours: project.inputs.productiveHours,
    rampMonths: project.inputs.rampMonths,
    discountRate: project.inputs.discountRate,
  };
}

function migrateProject(project: Project, migratedAt: string): Engagement {
  const options = (["bau", "rules", "assistance", "automation"] as const).map(
    createOption,
  );
  const base = baseline(project);
  for (const option of options) option.inputs = { ...base };
  const bau = options.find((option) => option.kind === "bau")!;
  bau.inputs = { ...base, reduction: 0, reviewMinutes: 0, adoption: 1 };

  const selected = options.find(
    (option) => option.kind === optionKinds[project.option],
  )!;
  selected.inputs = {
    annualVolume: project.inputs.annualVolume,
    minutesBefore: project.inputs.minutesBefore,
    reduction: project.inputs.reduction,
    reviewMinutes: project.inputs.reviewMinutes,
    adoption: project.inputs.adoption,
    hourlyCost: project.inputs.hourlyCost,
    realisation: project.inputs.realisation,
    cashShare: project.inputs.cashShare,
    productiveHours: project.inputs.productiveHours,
    rampMonths: project.inputs.rampMonths,
    discountRate: project.inputs.discountRate,
  };
  selected.costs = [
    {
      id: newId(),
      name: "Legacy implementation cost",
      category: "implementation",
      amount: project.inputs.implementationCost,
      frequency: "one_time",
      startMonth: 0,
      endMonth: 0,
      accounting: "unclassified",
    },
    {
      id: newId(),
      name: "Legacy recurring run cost",
      category: "operations",
      amount: project.inputs.annualRunCost / 12,
      frequency: "monthly",
      startMonth: 1,
      endMonth: 36,
      accounting: "opex",
    },
  ];

  const evidence = project.evidence.map((record) => ({
    id: newId(),
    title: record.title,
    excerpt: record.excerpt,
    source: `Legacy delivery workbench (${record.provenance} demo evidence)`,
    locator: record.locator,
    date: "" as const,
    status: record.status,
    reviewRationale: record.note,
    reviewedAt: "" as const,
    version: project.revision,
    internalNote: `Imported from legacy field ${record.field}; provenance: ${record.provenance}.`,
  }));
  const evidenceIdsByField = new Map<string, string[]>();
  project.evidence.forEach((record, index) => {
    const ids = evidenceIdsByField.get(record.field) ?? [];
    ids.push(evidence[index]!.id);
    evidenceIdsByField.set(record.field, ids);
  });
  const assumptions = Object.entries(selected.inputs).map(([field, value]) => ({
    id: newId(),
    optionId: selected.id,
    field,
    value,
    unit: field.toLowerCase().includes("minutes") ? "minutes" : "legacy input",
    provenance: "assumed" as const,
    confidence: "low" as const,
    evidenceIds: evidenceIdsByField.get(field) ?? [],
    owner: project.lead,
    version: project.revision,
    at: migratedAt,
    material: true,
  }));

  const rawLegacyProject = {
    type: "legacy-project-v1-raw",
    project: structuredClone(project),
  };
  const unmapped = {
    type: "legacy-project-v1-unmapped",
    sourceProjectId: project.id,
    revision: project.revision,
    actualSpend: project.actualSpend,
    tasks: structuredClone(project.tasks),
    risks: structuredClone(project.risks),
    measurements: structuredClone(project.measurements),
    evaluationRevision: project.evaluationRevision,
    evaluationInput: project.evaluationInput,
    history: structuredClone(project.history),
  };
  const opportunity: Opportunity = {
    id: newId(),
    name: project.name,
    problem: project.summary,
    revision: project.revision,
    discovery: {
      process: { notes: project.summary },
      workload: {
        notes:
          "Imported legacy workload inputs are retained on the selected option.",
      },
      pain: { notes: project.goal },
      data: {
        notes: "Legacy evidence remains labelled synthetic or user-provided.",
      },
      controls: { notes: project.risks.map((risk) => risk.title).join("; ") },
      adoption: { notes: "Legacy adoption is an unverified planning input." },
      value: { notes: project.goal },
    },
    processSteps: [],
    evidence,
    requests: [],
    options,
    selectedOptionId: selected.id,
    assumptions,
    recommendations: [],
    validation: {
      hypotheses: project.goal,
      baseline: "Imported from the legacy delivery-workbench record.",
      thresholds: "Review legacy goals and evidence before relying on them.",
      method: "Legacy demo migration; no new evidence was manufactured.",
      owner: project.lead,
      budgetCeiling: project.budgetCap,
      controls: project.risks.map((risk) => risk.mitigation).join("; "),
      stopCriteria:
        "Reassess unresolved critical controls and conflicting evidence.",
    },
    legacyDecisions: [
      rawLegacyProject,
      unmapped,
      ...project.decisions.map((decision) => structuredClone(decision)),
    ],
    feasibility: "unknown",
    adoption: "unknown",
    risk: "unknown",
    criticalControlsOpen: project.risks.some(
      (risk) => risk.severity === "critical" && !risk.closed,
    ),
    economicHurdle: 0,
    budgetCeiling: project.budgetCap,
  };

  return {
    id: newId(),
    name: project.name,
    client: project.client,
    sponsor: project.sponsor,
    processOwner: "",
    lead: project.lead,
    problem: project.summary,
    objectives: project.goal,
    constraints: "",
    assessmentDate: "",
    decisionDeadline: "",
    currency: "USD",
    archived: false,
    revision: project.revision,
    opportunities: [opportunity],
    history: [],
  };
}

export function migrateLegacy(text: string): Workspace {
  const legacy = restoreWorkspace(text);
  const migratedAt = new Date().toISOString();
  return workspaceSchema.parse({
    schemaVersion: 2,
    revision: 0,
    engagements: legacy.projects.map((project) =>
      migrateProject(project, migratedAt),
    ),
    brand: { name: "Beck", accent: "#2358d5" },
    migration: { confirmed: false, legacyImported: true },
  });
}
