import {
  FinancialEngine,
  type FinancialInput,
  type FinancialResult,
} from "@/modules/economics/financial-engine";
import { SimulationEngine } from "@/modules/simulation/simulation-engine";

export const DEMO_WORKSPACE_VERSION = 3;
const PREFIX = "sia-synthetic-replay:";

export type DemoPersistence = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
};
type AssumptionKey = "adoption" | "timeReduction" | "loadedHourlyCost";
export type Assumption = {
  value: number;
  revision: number;
  provenance: "observed" | "assumed" | "calculated";
  confidence: "high" | "medium" | "low";
  evidenceId: string;
  revisedBy: string;
};
export type AssumptionRevision = {
  id: string;
  assumptionKey: AssumptionKey;
  oldValue: number;
  newValue: number;
  provenance: Assumption["provenance"];
  confidence: Assumption["confidence"];
  evidenceId: string;
  owner: string;
  at: string;
  version: number;
};
export type DemoEvidence = {
  id: string;
  excerpt: string;
  source: string;
  accepted: boolean;
  confidence: "high" | "medium" | "low";
};
export type HistogramBucket = { from: number; to: number; count: number };
export type SimulationSummary = {
  scenario: "conservative" | "base" | "upside" | "custom";
  seed: number;
  iterations: 10000;
  p10: number;
  p50: number;
  p90: number;
  confidenceInterval: [number, number];
  paybackWithinTwelveMonthsProbability: number;
  histogram: HistogramBucket[];
};
export type CommitteeEvent = {
  specialist: string;
  status: "complete" | "failed";
  rationale: string;
  citations: string[];
  invalidCitations?: string[];
  simulatedTokenCost: number;
};
export type CommitteeFixture = Pick<
  CommitteeEvent,
  "specialist" | "rationale" | "citations"
>;
export type CommitteeReplay = {
  attempt: number;
  status: "idle" | "failed" | "complete";
  progress: number;
  events: CommitteeEvent[];
  simulatedCost: number;
};
export type ObjectionAction = {
  id: string;
  status: "resolved" | "accepted" | "request_evidence";
  actor: string;
  rationale: string;
  at: string;
  assumptionRevision: number;
};
export type Objection = {
  id: string;
  assumptionKey: AssumptionKey;
  question: string;
  actions: ObjectionAction[];
};
export type Decision = {
  id: string;
  caseId: string;
  recommendation: "conditional_go" | "defer" | "stop";
  beckDecision: "approved" | "deferred" | "declined";
  rationale: string;
  conditions: string[];
  evidenceSnapshot: string[];
  followUp: string;
  override: string;
  at: string;
};
export type DemoCase = {
  id: string;
  name: "Support Triage" | "Executive Reporting" | "Procurement Analysis";
  summary: string;
  useCaseTitle: string;
  useCaseSummary: string;
  stage: "evidence" | "economics" | "committee" | "challenge" | "decision";
  evidence: DemoEvidence[];
  assumptions: Record<AssumptionKey, Assumption>;
  assumptionRevisions: AssumptionRevision[];
  economics: FinancialResult;
  score: number;
  simulations: Partial<
    Record<SimulationSummary["scenario"], SimulationSummary>
  >;
  committee: CommitteeReplay;
  objections: Objection[];
  milestones: string[];
};
export type WorkspaceEvent = {
  id: string;
  type:
    | "seeded"
    | "assumption_revised"
    | "simulation_run"
    | "committee_replayed"
    | "objection_actioned"
    | "decision_appended"
    | "reset";
  caseId?: string;
  detail: string;
  at: string;
};
export type DemoWorkspaceState = {
  version: number;
  organisationId: string;
  cases: DemoCase[];
  decisions: Decision[];
  activity: WorkspaceEvent[];
  myWork: { caseId: string; label: string }[];
  exports: { label: string; caseId: string }[];
};
export type DemoSearchResult = {
  id: string;
  kind:
    | "case"
    | "source"
    | "accepted_evidence"
    | "use_case"
    | "decision"
    | "activity";
  caseId: string;
  label: string;
  detail: string;
};

function now() {
  return "2026-08-30T09:00:00.000Z";
}
function financial(overrides: Partial<Record<AssumptionKey, number>> = {}) {
  const adoption = overrides.adoption ?? 0.62;
  return FinancialEngine.calculate({
    labour: {
      employees: 34,
      tasksPerEmployeePerWeek: 22,
      minutesPerTask: 12,
      loadedHourlyCost: overrides.loadedHourlyCost ?? 68,
      expectedTimeReduction: overrides.timeReduction ?? 0.34,
      adoption,
      utilisation: 0.9,
      redeployability: 0.58,
    },
    quality: {
      annualErrorFrequency: 430,
      costPerError: 310,
      expectedReduction: 0.26,
    },
    implementationCosts: {
      engineering: 155000,
      consulting: 65000,
      integration: 70000,
      changeManagement: 30000,
      training: 15000,
      model: 0,
      licensing: 0,
    },
    annualOperatingCosts: {
      model: 0,
      software: 42000,
      monitoring: 18000,
      support: 32000,
      humanReview: 26000,
    },
    discountRate: 0.1,
  } satisfies FinancialInput);
}
function assumptions(
  overrides: Partial<Record<AssumptionKey, number>> = {},
): Record<AssumptionKey, Assumption> {
  return {
    adoption: {
      value: overrides.adoption ?? 0.62,
      revision: 1,
      provenance: "assumed",
      confidence: "medium",
      evidenceId: "ev-1",
      revisedBy: "Seeded scenario",
    },
    timeReduction: {
      value: overrides.timeReduction ?? 0.34,
      revision: 1,
      provenance: "observed",
      confidence: "high",
      evidenceId: "ev-2",
      revisedBy: "Seeded scenario",
    },
    loadedHourlyCost: {
      value: overrides.loadedHourlyCost ?? 68,
      revision: 1,
      provenance: "observed",
      confidence: "high",
      evidenceId: "ev-3",
      revisedBy: "Seeded scenario",
    },
  };
}
function makeCase(
  id: DemoCase["id"],
  name: DemoCase["name"],
  summary: string,
  useCaseTitle: string,
  useCaseSummary: string,
  changes: Partial<Record<AssumptionKey, number>> = {},
): DemoCase {
  const evidenceTopic =
    id === "support-triage"
      ? "Support"
      : id === "executive-reporting"
        ? "Executive reporting"
        : "Procurement analysis";
  const evidence = [
    {
      id: "ev-1",
      excerpt: `18% of ${evidenceTopic} queues breach the current first-response target during peak windows.`,
      source: `Synthetic ${evidenceTopic} service baseline · weekly queue extract`,
      accepted: true,
      confidence: "high" as const,
    },
    {
      id: "ev-2",
      excerpt:
        "Agents spend 12 minutes per request locating policy and prior-case context.",
      source: "Synthetic time study · sample n=34",
      accepted: true,
      confidence: "high" as const,
    },
    {
      id: "ev-3",
      excerpt:
        "Loaded hourly cost is a planning rate, not a realised cash saving.",
      source: "Synthetic finance assumption register",
      accepted: true,
      confidence: "medium" as const,
    },
    {
      id: "ev-4",
      excerpt:
        "A small outlier sample suggests adoption could stall below plan.",
      source: "Synthetic change-readiness interviews",
      accepted: false,
      confidence: "low" as const,
    },
  ];
  const seededAssumptions = assumptions(changes);
  const economics = financial(changes);
  return {
    id,
    name,
    summary,
    useCaseTitle,
    useCaseSummary,
    stage: "evidence",
    evidence,
    assumptions: seededAssumptions,
    economics,
    score: Math.round(
      Math.min(
        100,
        42 +
          economics.firstYearRoi! * 22 +
          seededAssumptions.adoption.value * 18,
      ),
    ),
    simulations: {},
    committee: {
      attempt: 0,
      status: "idle",
      progress: 0,
      events: [],
      simulatedCost: 0,
    },
    objections: [
      {
        id: "capacity-cash",
        assumptionKey: "adoption",
        question: "Why is released capacity not represented as a cash saving?",
        actions: [],
      },
    ],
    assumptionRevisions: [],
    milestones: [
      "Evidence accepted",
      "Assumptions registered",
      "Synthetic pilot gate drafted",
    ],
  };
}
function seed(organisationId: string): DemoWorkspaceState {
  return {
    version: DEMO_WORKSPACE_VERSION,
    organisationId,
    cases: [
      makeCase(
        "support-triage",
        "Support Triage",
        "Route and prepare support work with evidence-linked human review.",
        "Support Queue Copilot",
        "Local use case for queue preparation with analyst-controlled escalation.",
      ),
      makeCase(
        "executive-reporting",
        "Executive Reporting",
        "Prepare governed executive status narratives from accepted delivery evidence.",
        "Executive Narrative Copilot",
        "Local use case for leadership-ready reporting drafts with reviewer checkpoints.",
        { adoption: 0.57, timeReduction: 0.29 },
      ),
      makeCase(
        "procurement-analysis",
        "Procurement Analysis",
        "Identify contract and spend review effort while retaining analyst decision authority.",
        "Procurement Review Copilot",
        "Local use case for sourcing analysis with explicit analyst sign-off before action.",
        { adoption: 0.53, timeReduction: 0.25, loadedHourlyCost: 75 },
      ),
    ],
    decisions: [],
    activity: [
      {
        id: "seed",
        type: "seeded",
        detail: "Synthetic Replay seed loaded locally",
        at: now(),
      },
    ],
    myWork: [
      {
        caseId: "support-triage",
        label: "Review Support Triage CFO challenge",
      },
    ],
    exports: [
      {
        caseId: "support-triage",
        label: "Synthetic Support Triage decision pack",
      },
    ],
  };
}
function key(organisationId: string) {
  return `${PREFIX}${organisationId}`;
}
function clone<T>(item: T): T {
  return JSON.parse(JSON.stringify(item)) as T;
}
function storage(): DemoPersistence | undefined {
  if (typeof window === "undefined") return undefined;
  return {
    get: (itemKey) => window.localStorage.getItem(itemKey) ?? undefined,
    set: (itemKey, value) => window.localStorage.setItem(itemKey, value),
    delete: (itemKey) => window.localStorage.removeItem(itemKey),
  };
}
function isCurrent(
  value: unknown,
  organisationId: string,
): value is DemoWorkspaceState {
  return (
    !!value &&
    typeof value === "object" &&
    (value as DemoWorkspaceState).version === DEMO_WORKSPACE_VERSION &&
    (value as DemoWorkspaceState).organisationId === organisationId &&
    Array.isArray((value as DemoWorkspaceState).cases) &&
    (value as DemoWorkspaceState).cases.length === 3
  );
}
function migrate(value: unknown, organisationId: string) {
  if (isCurrent(value, organisationId)) return value;
  return seed(organisationId);
}
function histogram(summary: { p10: number; p50: number; p90: number }) {
  const start = summary.p10 - Math.abs(summary.p90 - summary.p10) * 0.35;
  const width = (summary.p90 - start) / 8 || 1;
  return Array.from({ length: 8 }, (_, index) => ({
    from: Math.round(start + index * width),
    to: Math.round(start + (index + 1) * width),
    count: Math.round(600 + (index < 4 ? index * 410 : (7 - index) * 410)),
  }));
}

export function objectionStatus(objection: Objection) {
  return objection.actions.at(-1)?.status ?? "open";
}

export function searchDemoWorkspace(
  state: DemoWorkspaceState,
  query: string,
): DemoSearchResult[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  const includes = (...values: string[]) =>
    values.join(" ").toLocaleLowerCase().includes(needle);
  const results: DemoSearchResult[] = [];
  for (const useCase of state.cases) {
    if (includes(useCase.name, useCase.summary)) {
      results.push({
        id: `case-${useCase.id}`,
        kind: "case",
        caseId: useCase.id,
        label: useCase.name,
        detail: useCase.summary,
      });
    }
    if (includes(useCase.useCaseTitle, useCase.useCaseSummary)) {
      results.push({
        id: `use-case-${useCase.id}`,
        kind: "use_case",
        caseId: useCase.id,
        label: useCase.useCaseTitle,
        detail: useCase.useCaseSummary,
      });
    }
    for (const evidence of useCase.evidence) {
      if (includes(evidence.source))
        results.push({
          id: `source-${useCase.id}-${evidence.id}`,
          kind: "source",
          caseId: useCase.id,
          label: evidence.source,
          detail: "Synthetic local source",
        });
      if (evidence.accepted && includes(evidence.excerpt, evidence.source))
        results.push({
          id: `evidence-${useCase.id}-${evidence.id}`,
          kind: "accepted_evidence",
          caseId: useCase.id,
          label: evidence.excerpt,
          detail: "Accepted synthetic evidence",
        });
    }
  }
  for (const decision of state.decisions) {
    if (
      includes(
        decision.rationale,
        decision.followUp,
        decision.beckDecision,
        decision.recommendation,
      )
    )
      results.push({
        id: decision.id,
        kind: "decision",
        caseId: decision.caseId,
        label: `${decision.beckDecision} ${decision.recommendation}`,
        detail: decision.rationale,
      });
  }
  for (const activity of state.activity) {
    if (activity.caseId && includes(activity.detail, activity.type))
      results.push({
        id: `activity-${activity.id}`,
        kind: "activity",
        caseId: activity.caseId,
        label: activity.type.replaceAll("_", " "),
        detail: activity.detail,
      });
  }
  return results;
}

export function invalidCommitteeCitations(
  evidence: DemoEvidence[],
  citations: string[],
) {
  const accepted = new Set(
    evidence.filter((item) => item.accepted).map((item) => item.id),
  );
  return citations.filter((citation) => !accepted.has(citation));
}

function validateCustomScenario(custom: {
  adoption?: number;
  benefit?: number;
}) {
  if (
    custom.adoption === undefined ||
    custom.adoption < 0.2 ||
    custom.adoption > 0.95
  )
    throw new RangeError("Custom adoption must be between 0.2 and 0.95");
  if (
    custom.benefit === undefined ||
    custom.benefit < 0.5 ||
    custom.benefit > 1.5
  )
    throw new RangeError("Custom benefit factor must be between 0.5 and 1.5");
}

function makeCommitteeEvent(
  target: DemoCase,
  fixture: CommitteeFixture,
  simulatedTokenCost: number,
): CommitteeEvent {
  const invalidCitations = invalidCommitteeCitations(
    target.evidence,
    fixture.citations,
  );
  return {
    ...fixture,
    status: invalidCitations.length ? "failed" : "complete",
    ...(invalidCitations.length ? { invalidCitations } : {}),
    simulatedTokenCost,
  };
}

export function createDemoWorkspaceStore(
  organisationId: string,
  supplied?: DemoPersistence,
) {
  const persistence = supplied ?? storage();
  let state = seed(organisationId);
  try {
    const saved = persistence?.get(key(organisationId));
    if (saved) state = migrate(JSON.parse(saved), organisationId);
  } catch {
    state = seed(organisationId);
  }
  const subscribers = new Set<() => void>();
  function save() {
    persistence?.set(key(organisationId), JSON.stringify(state));
    subscribers.forEach((listener) => listener());
  }
  function item(caseId: string) {
    const value = state.cases.find((candidate) => candidate.id === caseId);
    if (!value) throw new Error(`Unknown Synthetic Replay case: ${caseId}`);
    return value;
  }
  function event(
    type: WorkspaceEvent["type"],
    detail: string,
    caseId?: string,
  ) {
    state.activity.push({
      id: `${type}-${state.activity.length + 1}`,
      type,
      caseId,
      detail,
      at: now(),
    });
  }
  let disposed = false;
  const onStorage = (change: StorageEvent) => {
    if (disposed || change.key !== key(organisationId) || !change.newValue)
      return;
    try {
      state = migrate(JSON.parse(change.newValue), organisationId);
      subscribers.forEach((listener) => listener());
    } catch {
      /* recover next interaction */
    }
  };
  const api = {
    getState: () => clone(state),
    getCase: (caseId: string) => clone(item(caseId)),
    subscribe(listener: () => void) {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },
    dispose() {
      disposed = true;
      subscribers.clear();
      if (typeof window !== "undefined")
        window.removeEventListener("storage", onStorage);
    },
    reviseAssumption(
      caseId: string,
      assumptionKey: AssumptionKey,
      value: number,
      revisedBy: string,
    ) {
      const target = item(caseId);
      const assumption = target.assumptions[assumptionKey];
      const revision: AssumptionRevision = {
        id: `assumption-${target.assumptionRevisions.length + 1}`,
        assumptionKey,
        oldValue: assumption.value,
        newValue: value,
        provenance: "assumed",
        confidence: "medium",
        evidenceId: assumption.evidenceId,
        owner: revisedBy,
        at: now(),
        version: assumption.revision + 1,
      };
      target.assumptionRevisions.push(revision);
      target.assumptions[assumptionKey] = {
        ...assumption,
        value: revision.newValue,
        revision: revision.version,
        provenance: revision.provenance,
        confidence: revision.confidence,
        evidenceId: revision.evidenceId,
        revisedBy: revision.owner,
      };
      target.economics = financial({
        adoption: target.assumptions.adoption.value,
        timeReduction: target.assumptions.timeReduction.value,
        loadedHourlyCost: target.assumptions.loadedHourlyCost.value,
      });
      target.score = Math.round(
        Math.min(
          100,
          42 +
            target.economics.firstYearRoi! * 22 +
            target.assumptions.adoption.value * 18,
        ),
      );
      target.stage = "economics";
      event(
        "assumption_revised",
        `${assumptionKey} revision ${assumption.revision} saved`,
        caseId,
      );
      save();
    },
    runSimulation(
      caseId: string,
      scenario: SimulationSummary["scenario"],
      custom?: { adoption?: number; benefit?: number },
    ) {
      const target = item(caseId);
      if (scenario === "custom") validateCustomScenario(custom ?? {});
      const factor =
        scenario === "conservative"
          ? 0.86
          : scenario === "upside"
            ? 1.12
            : scenario === "custom"
              ? (custom?.benefit ?? 1)
              : 1;
      const adoption =
        scenario === "custom"
          ? (custom?.adoption ?? target.assumptions.adoption.value)
          : target.assumptions.adoption.value;
      const distribution = SimulationEngine.run({
        baseAnnualBenefit: target.economics.grossAnnualBenefit * factor,
        annualOperatingCost: target.economics.annualOperatingCost,
        implementationCost: target.economics.implementationCost,
        benefitRange: { minimum: 0.75, mode: 1, maximum: 1.18 },
        adoptionRange: {
          minimum: Math.max(0.2, adoption - 0.16),
          mode: adoption,
          maximum: Math.min(0.95, adoption + 0.12),
        },
        failureRange: { minimum: 0.02, mode: 0.07, maximum: 0.2 },
        iterations: 10000,
        seed: 20260830 + scenario.length + target.id.length,
      });
      const result: SimulationSummary = {
        scenario,
        seed: distribution.seed,
        iterations: 10000,
        p10: distribution.annualValue.p10,
        p50: distribution.annualValue.p50,
        p90: distribution.annualValue.p90,
        confidenceInterval: [
          distribution.annualValue.p10,
          distribution.annualValue.p90,
        ],
        paybackWithinTwelveMonthsProbability:
          distribution.paybackWithinTwelveMonthsProbability,
        histogram: histogram(distribution.annualValue),
      };
      target.simulations[scenario] = result;
      event(
        "simulation_run",
        `${scenario} 10,000-sample Synthetic Replay completed`,
        caseId,
      );
      save();
      return clone(result);
    },
    runCommittee(caseId: string, fixtures?: CommitteeFixture[]) {
      const target = item(caseId);
      const defaultFixtures: CommitteeFixture[] = [
        {
          specialist: "Value Analyst",
          rationale:
            "Returns are credible once capacity is treated conservatively.",
          citations: ["ev-1", "ev-3"],
        },
        {
          specialist: "Risk Lead",
          rationale:
            "Human approval and sampling controls remain conditions of scale.",
          citations: ["ev-1", "ev-2"],
        },
        {
          specialist: "CFO Red Team",
          rationale:
            "Scripted partial failure: refresh the replay to complete the finance challenge.",
          citations: ["ev-3"],
        },
      ];
      const events = (fixtures ?? defaultFixtures).map((fixture, index) =>
        makeCommitteeEvent(target, fixture, [0.08, 0.06, 0.03][index] ?? 0.04),
      );
      if (!fixtures && events[2]) {
        events[2] = { ...events[2], status: "failed" };
      }
      const hasFailure = events.some((item) => item.status === "failed");
      target.committee = {
        attempt: 1,
        status: hasFailure ? "failed" : "complete",
        progress: hasFailure ? 67 : 100,
        events,
        simulatedCost: events.reduce(
          (total, event) => total + event.simulatedTokenCost,
          0,
        ),
      };
      target.stage = "committee";
      event(
        "committee_replayed",
        "Synthetic Committee Replay stopped at scripted finance challenge",
        caseId,
      );
      save();
      return clone(target.committee);
    },
    retryCommittee(caseId: string, fixtures?: CommitteeFixture[]) {
      const target = item(caseId);
      if (target.committee.status !== "failed") return clone(target.committee);
      const defaultFixtures: CommitteeFixture[] = [
        {
          specialist: "Value Analyst",
          rationale:
            "Returns are credible once capacity is treated conservatively.",
          citations: ["ev-1", "ev-3"],
        },
        {
          specialist: "Risk Lead",
          rationale:
            "Human approval and sampling controls remain conditions of scale.",
          citations: ["ev-1", "ev-2"],
        },
        {
          specialist: "CFO Red Team",
          rationale:
            "Capacity is constrained to redeployable value; pilot measurement is required.",
          citations: ["ev-2", "ev-3"],
        },
      ];
      const events = (fixtures ?? defaultFixtures).map((fixture, index) =>
        makeCommitteeEvent(target, fixture, [0.08, 0.06, 0.1][index] ?? 0.04),
      );
      const hasFailure = events.some((item) => item.status === "failed");
      target.committee = {
        attempt: 2,
        status: hasFailure ? "failed" : "complete",
        progress: hasFailure ? 67 : 100,
        simulatedCost: events.reduce(
          (total, event) => total + event.simulatedTokenCost,
          0,
        ),
        events,
      };
      if (!hasFailure) target.stage = "challenge";
      event(
        "committee_replayed",
        "Synthetic Committee Replay retry completed",
        caseId,
      );
      save();
      return clone(target.committee);
    },
    resolveObjection(
      caseId: string,
      objectionId: string,
      action: Omit<ObjectionAction, "id" | "at" | "assumptionRevision">,
    ) {
      const objection = item(caseId).objections.find(
        (candidate) => candidate.id === objectionId,
      );
      if (!objection) throw new Error(`Unknown objection: ${objectionId}`);
      objection.actions.push({
        id: `objection-${objection.actions.length + 1}`,
        ...action,
        at: now(),
        assumptionRevision:
          item(caseId).assumptions[objection.assumptionKey].revision,
      });
      event(
        "objection_actioned",
        `CFO objection marked ${action.status}`,
        caseId,
      );
      save();
    },
    appendDecision(
      caseId: string,
      input: Omit<Decision, "id" | "caseId" | "evidenceSnapshot" | "at">,
    ) {
      const target = item(caseId);
      const decision: Decision = {
        id: `decision-${state.decisions.length + 1}`,
        caseId,
        ...input,
        evidenceSnapshot: target.evidence
          .filter((evidence) => evidence.accepted)
          .map((evidence) => evidence.id),
        at: now(),
      };
      state.decisions.push(decision);
      target.stage = "decision";
      state.myWork.unshift({ caseId, label: input.followUp });
      state.exports.unshift({
        caseId,
        label: `${target.name} governed decision export`,
      });
      event(
        "decision_appended",
        `${target.name}: Beck ${input.beckDecision} ${input.recommendation}`,
        caseId,
      );
      save();
      return clone(decision);
    },
    reset() {
      state = seed(organisationId);
      save();
    },
  };
  if (typeof window !== "undefined")
    window.addEventListener("storage", onStorage);
  return api;
}
