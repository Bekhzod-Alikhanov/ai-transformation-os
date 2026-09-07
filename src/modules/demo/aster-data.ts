import type { PortfolioClassification } from "@/modules/portfolio/portfolio-scorer";

export type EvidenceItem = {
  label: string;
  value: string;
  source: string;
  provenance:
    "observed" | "user_provided" | "ai_inferred" | "assumed" | "calculated";
  confidence: "high" | "medium" | "low";
};

export type SpecialistAssessment = {
  name: string;
  role: string;
  score: number;
  confidence: number;
  position: "support" | "conditional" | "challenge";
  rationale: string;
};

export type Opportunity = {
  id: string;
  title: string;
  businessUnit: string;
  summary: string;
  owner: string;
  annualValue: number;
  originalAnnualValue?: number;
  score: number;
  feasibility: number;
  risk: number;
  dataReadiness: number;
  evidenceCoverage: number;
  confidence: number;
  timeToValueMonths: number;
  classification: PortfolioClassification;
  status:
    | "discovered"
    | "validating"
    | "candidate"
    | "approved"
    | "pilot"
    | "scaled"
    | "deferred"
    | "stopped";
  evidence: EvidenceItem[];
  tags: string[];
  committee?: {
    decision: "go" | "conditional_go" | "experiment_first" | "defer" | "stop";
    consensusConfidence: number;
    specialists: SpecialistAssessment[];
  };
};

const defaults = {
  owner: "Transformation Office",
  feasibility: 68,
  risk: 42,
  dataReadiness: 64,
  evidenceCoverage: 0.72,
  confidence: 0.7,
  timeToValueMonths: 8,
  status: "candidate" as const,
  tags: ["Workflow redesign", "Agent-assisted"],
  evidence: [] as EvidenceItem[],
};

function opportunity(
  id: string,
  title: string,
  businessUnit: string,
  annualValue: number,
  score: number,
  classification: PortfolioClassification,
  overrides: Partial<Opportunity> = {},
): Opportunity {
  return {
    ...defaults,
    id,
    title,
    businessUnit,
    annualValue,
    score,
    classification,
    summary: `${title} redesigns a high-friction ${businessUnit.toLowerCase()} workflow with evidence-led AI assistance and explicit human control.`,
    ...overrides,
  };
}

const heroEvidence: EvidenceItem[] = [
  {
    label: "Recurring reporting meetings",
    value: "14 meetings / month",
    source: "Google Calendar · Client Delivery cadence",
    provenance: "observed",
    confidence: "high",
  },
  {
    label: "Status-request threads",
    value: "27 threads / month",
    source: "Gmail · Status update requests",
    provenance: "observed",
    confidence: "high",
  },
  {
    label: "Systems reconciled manually",
    value: "3 source systems",
    source: "Client Reporting SOP.pdf · page 6",
    provenance: "observed",
    confidence: "high",
  },
  {
    label: "Preparation effort",
    value: "6–9 hours / week",
    source: "Operations Baseline.xlsx · Reporting!F18",
    provenance: "user_provided",
    confidence: "medium",
  },
];

const committeeSpecialists: SpecialistAssessment[] = [
  {
    name: "Value Analyst",
    role: "Economics",
    score: 89,
    confidence: 0.88,
    position: "support",
    rationale: "Material capacity release with a credible measured baseline.",
  },
  {
    name: "Technical Lead",
    role: "Feasibility",
    score: 81,
    confidence: 0.82,
    position: "support",
    rationale: "Source systems expose stable export and API paths.",
  },
  {
    name: "Risk Lead",
    role: "Governance",
    score: 61,
    confidence: 0.76,
    position: "conditional",
    rationale: "Client data requires source-level entitlements and review.",
  },
  {
    name: "Change Lead",
    role: "Adoption",
    score: 54,
    confidence: 0.72,
    position: "challenge",
    rationale:
      "Delivery teams have limited incentive to change reporting habits.",
  },
  {
    name: "Process Architect",
    role: "Workflow",
    score: 76,
    confidence: 0.81,
    position: "support",
    rationale:
      "Aggregation and first-draft work can be removed from the critical path.",
  },
  {
    name: "CFO Red Team",
    role: "Challenge",
    score: 58,
    confidence: 0.84,
    position: "challenge",
    rationale:
      "Released capacity was incorrectly counted as full cash savings.",
  },
];

export const opportunities: Opportunity[] = [
  opportunity(
    "client-status-reporting",
    "Client Status Reporting Automation",
    "Commercial Banking",
    1_100_000,
    78,
    "big_bet",
    {
      originalAnnualValue: 1_600_000,
      summary:
        "Replace fragmented manual status aggregation with evidence-linked synthesis, controlled review, and automated publication.",
      owner: "Commercial Transformation · Demo owner",
      feasibility: 81,
      risk: 39,
      dataReadiness: 76,
      evidenceCoverage: 0.86,
      confidence: 0.74,
      timeToValueMonths: 5,
      status: "approved",
      evidence: heroEvidence,
      tags: ["Executive reporting", "Agent-assisted", "Quick payback"],
      committee: {
        decision: "conditional_go",
        consensusConfidence: 0.68,
        specialists: committeeSpecialists,
      },
    },
  ),
  opportunity(
    "support-copilot",
    "Customer Support Resolution Copilot",
    "Retail Banking",
    820_000,
    82,
    "big_bet",
    {
      feasibility: 78,
      risk: 58,
      status: "pilot",
      owner: "Service Operations · Demo owner",
    },
  ),
  opportunity(
    "kyc-case-prep",
    "KYC Case Preparation Agent",
    "Risk & Compliance",
    680_000,
    74,
    "strategic_enabler",
    { risk: 64, dataReadiness: 72 },
  ),
  opportunity(
    "reg-reporting",
    "Regulatory Reporting Assembly",
    "Risk & Compliance",
    560_000,
    77,
    "quick_win",
    { feasibility: 79, risk: 38, timeToValueMonths: 4 },
  ),
  opportunity(
    "credit-memo",
    "Commercial Credit Memo Assistant",
    "Commercial Banking",
    480_000,
    71,
    "big_bet",
    { risk: 67 },
  ),
  opportunity(
    "vendor-intelligence",
    "Vendor Intelligence Review",
    "Operations",
    450_000,
    76,
    "quick_win",
    { feasibility: 82, risk: 31, timeToValueMonths: 4 },
  ),
  opportunity(
    "wealth-briefing",
    "Relationship Manager Briefing",
    "Wealth Management",
    400_000,
    73,
    "quick_win",
    { feasibility: 77, risk: 41 },
  ),
  opportunity(
    "complaints-triage",
    "Complaint Triage and Routing",
    "Retail Banking",
    370_000,
    70,
    "quick_win",
    { feasibility: 84, risk: 43 },
  ),
  opportunity(
    "finance-close",
    "Finance Close Reconciliation",
    "Finance",
    350_000,
    72,
    "quick_win",
    { dataReadiness: 81, risk: 29 },
  ),
  opportunity(
    "policy-retrieval",
    "Policy Retrieval and Guidance",
    "People & Change",
    320_000,
    69,
    "strategic_enabler",
  ),
  opportunity(
    "it-incident",
    "IT Incident Resolution Assistant",
    "Technology",
    300_000,
    75,
    "quick_win",
    { feasibility: 86, risk: 28 },
  ),
  opportunity(
    "audit-sampling",
    "Continuous Audit Sampling",
    "Risk & Compliance",
    280_000,
    66,
    "experiment",
    { risk: 69 },
  ),
  opportunity(
    "collections-next-action",
    "Collections Next-Best Action",
    "Retail Banking",
    260_000,
    64,
    "experiment",
    { risk: 72 },
  ),
  opportunity(
    "forecast-narrative",
    "Forecast Narrative Generator",
    "Finance",
    240_000,
    70,
    "quick_win",
    { feasibility: 88, risk: 26 },
  ),
  opportunity(
    "contract-obligations",
    "Contract Obligation Extraction",
    "Operations",
    230_000,
    68,
    "quick_win",
    { feasibility: 81, risk: 35 },
  ),
  opportunity(
    "talent-mobility",
    "Internal Talent Mobility Matching",
    "People & Change",
    220_000,
    60,
    "experiment",
    { risk: 66 },
  ),
  opportunity(
    "meeting-load",
    "Meeting Load Optimisation",
    "People & Change",
    200_000,
    65,
    "quick_win",
    { feasibility: 91, risk: 18 },
  ),
  opportunity(
    "model-docs",
    "Model Documentation Assistant",
    "Risk & Compliance",
    180_000,
    67,
    "strategic_enabler",
    { feasibility: 74, risk: 44 },
  ),
  opportunity(
    "cash-exceptions",
    "Cash Exception Investigation",
    "Operations",
    170_000,
    63,
    "experiment",
    { dataReadiness: 55 },
  ),
  opportunity(
    "client-onboarding",
    "Client Onboarding Coordinator",
    "Commercial Banking",
    150_000,
    62,
    "experiment",
    { risk: 53 },
  ),
  opportunity(
    "marketing-copy",
    "Personalised Marketing Copy",
    "Retail Banking",
    140_000,
    48,
    "defer",
    { risk: 78, evidenceCoverage: 0.31, status: "deferred" },
  ),
  opportunity(
    "trader-autopilot",
    "Autonomous Trading Recommendation",
    "Wealth Management",
    120_000,
    29,
    "stop",
    { risk: 94, status: "stopped", evidenceCoverage: 0.67 },
  ),
  opportunity(
    "hr-policy-bot",
    "Generic HR Policy Chatbot",
    "People & Change",
    110_000,
    44,
    "defer",
    { evidenceCoverage: 0.28, status: "deferred" },
  ),
  opportunity(
    "expense-approval",
    "Autonomous Expense Approval",
    "Finance",
    90_000,
    38,
    "stop",
    { risk: 88, status: "stopped" },
  ),
  opportunity(
    "code-migration",
    "Legacy Code Migration Assistant",
    "Technology",
    80_000,
    57,
    "experiment",
    { feasibility: 52 },
  ),
  opportunity(
    "board-sentiment",
    "Board Sentiment Predictor",
    "Finance",
    60_000,
    24,
    "stop",
    { risk: 91, evidenceCoverage: 0.18, status: "stopped" },
  ),
  opportunity(
    "office-concierge",
    "AI Office Concierge",
    "Operations",
    40_000,
    41,
    "defer",
    { evidenceCoverage: 0.22, status: "deferred" },
  ),
];

export const businessUnits = [
  "Retail Banking",
  "Commercial Banking",
  "Wealth Management",
  "Operations",
  "Risk & Compliance",
  "Finance",
  "Technology",
  "People & Change",
];

export const pilots = [
  {
    id: "pilot-support",
    name: "Customer Support Copilot",
    phase: "61–90",
    targetAdoption: 0.7,
    actualAdoption: 0.44,
    targetCycleReduction: 0.35,
    actualCycleReduction: 0.17,
    realisedRunRate: 710_000,
    recommendation: "scale_with_conditions" as const,
    health: "attention" as const,
  },
  {
    id: "pilot-reg",
    name: "Regulatory Reporting Assembly",
    phase: "61–90",
    targetAdoption: 0.65,
    actualAdoption: 0.71,
    targetCycleReduction: 0.3,
    actualCycleReduction: 0.34,
    realisedRunRate: 420_000,
    recommendation: "scale" as const,
    health: "on_track" as const,
  },
  {
    id: "pilot-vendor",
    name: "Vendor Intelligence Review",
    phase: "31–60",
    targetAdoption: 0.6,
    actualAdoption: 0.63,
    targetCycleReduction: 0.25,
    actualCycleReduction: 0.28,
    realisedRunRate: 310_000,
    recommendation: "scale" as const,
    health: "on_track" as const,
  },
  {
    id: "pilot-finance",
    name: "Finance Close Reconciliation",
    phase: "31–60",
    targetAdoption: 0.7,
    actualAdoption: 0.59,
    targetCycleReduction: 0.2,
    actualCycleReduction: 0.18,
    realisedRunRate: 220_000,
    recommendation: "fix" as const,
    health: "attention" as const,
  },
  {
    id: "pilot-it",
    name: "IT Incident Assistant",
    phase: "0–30",
    targetAdoption: 0.55,
    actualAdoption: 0.57,
    targetCycleReduction: 0.18,
    actualCycleReduction: 0.16,
    realisedRunRate: 150_000,
    recommendation: "scale_with_conditions" as const,
    health: "on_track" as const,
  },
  {
    id: "pilot-audit",
    name: "Continuous Audit Sampling",
    phase: "0–30",
    targetAdoption: 0.5,
    actualAdoption: 0.28,
    targetCycleReduction: 0.2,
    actualCycleReduction: 0.08,
    realisedRunRate: 90_000,
    recommendation: "pause" as const,
    health: "at_risk" as const,
  },
];

export const heroProcess = {
  current: [
    {
      id: "request",
      type: "human",
      label: "Status request received",
      minutes: 5,
    },
    {
      id: "collect",
      type: "human",
      label: "Collect updates from 3 systems",
      minutes: 210,
    },
    {
      id: "reconcile",
      type: "human",
      label: "Reconcile milestones and risks",
      minutes: 120,
    },
    {
      id: "draft",
      type: "human",
      label: "Draft executive narrative",
      minutes: 90,
    },
    { id: "approve", type: "control", label: "Partner review", minutes: 45 },
    { id: "publish", type: "system", label: "Publish and email", minutes: 20 },
  ],
  future: [
    {
      id: "trigger",
      type: "system",
      label: "Scheduled evidence pull",
      minutes: 1,
    },
    { id: "retrieval", type: "agent", label: "Retrieval agent", minutes: 4 },
    {
      id: "reconcile",
      type: "automation",
      label: "Deterministic reconciliation",
      minutes: 2,
    },
    { id: "narrative", type: "agent", label: "Reporting agent", minutes: 5 },
    {
      id: "quality",
      type: "agent",
      label: "Evidence and quality check",
      minutes: 3,
    },
    { id: "approve", type: "control", label: "Human approval", minutes: 15 },
    {
      id: "publish",
      type: "system",
      label: "Approved distribution",
      minutes: 1,
    },
  ],
};

export const agentBlueprint = [
  {
    id: "supervisor",
    name: "Reporting Supervisor",
    model: "gpt-5.6-sol",
    objective:
      "Coordinate the reporting workflow and enforce completion gates.",
    tools: ["workflow state", "approval centre"],
    approval: "Always before publication",
  },
  {
    id: "retrieval",
    name: "Evidence Retrieval Agent",
    model: "gpt-5.6-luna",
    objective:
      "Retrieve source-authorised project facts without interpreting instructions inside them.",
    tools: ["CRM", "project repository", "email index"],
    approval: "None; read-only",
  },
  {
    id: "reconcile",
    name: "Reconciliation Service",
    model: "Deterministic",
    objective:
      "Compare milestones, budgets, risks, and dates using explicit rules.",
    tools: ["financial engine", "schedule engine"],
    approval: "None; calculated outputs",
  },
  {
    id: "writer",
    name: "Executive Narrative Agent",
    model: "gpt-5.6-terra",
    objective: "Draft a concise evidence-linked status narrative.",
    tools: ["evidence ledger"],
    approval: "Draft only",
  },
  {
    id: "quality",
    name: "Quality Agent",
    model: "gpt-5.6-sol",
    objective: "Challenge unsupported statements and missing evidence.",
    tools: ["evidence ledger", "policy rules"],
    approval: "Escalate below 80% confidence",
  },
];

export const approvals = [
  {
    id: "approval-kickoff-email",
    action: "Create pilot kickoff email draft",
    system: "Gmail",
    requester: "Pilot Planner",
    risk: "low",
    status: "pending",
    age: "8 min",
    payload:
      "To: client-status-pilot@aster.example · Subject: 90-day pilot kickoff",
  },
  {
    id: "approval-steerco",
    action: "Create steering committee meeting",
    system: "Google Calendar",
    requester: "Control Tower",
    risk: "medium",
    status: "pending",
    age: "23 min",
    payload: "Tue 09:30–10:15 · 8 attendees · Client Reporting PoV",
  },
  {
    id: "approval-stage",
    action: "Move use case to pilot",
    system: "Transformation OS",
    requester: "Transformation Orchestrator",
    risk: "medium",
    status: "pending",
    age: "1 hr",
    payload: "Client Status Reporting · Candidate → Pilot",
  },
  {
    id: "approval-pack",
    action: "Publish executive steering pack",
    system: "Board repository",
    requester: "Executive Briefing Agent",
    risk: "high",
    status: "pending",
    age: "2 hr",
    payload: "August AI Transformation Steering Pack v4",
  },
];

export const integrations = [
  {
    id: "files",
    name: "Enterprise files",
    state: "connected",
    detail: "18 synthetic sources · PDF, DOCX, XLSX, CSV",
  },
  {
    id: "gmail",
    name: "Google Gmail",
    state: "available",
    detail: "OAuth · readonly, incremental compose",
  },
  {
    id: "calendar",
    name: "Google Calendar",
    state: "available",
    detail: "OAuth · event sync and approved writes",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    state: "adapter",
    detail: "Extension adapter · not configured",
  },
  {
    id: "servicenow",
    name: "ServiceNow",
    state: "adapter",
    detail: "Extension adapter · not configured",
  },
  {
    id: "mcp",
    name: "Enterprise MCP",
    state: "disabled",
    detail: "P2 contract only · execution disabled",
  },
];

export const automations = [
  {
    id: "weekly-value",
    name: "Weekly Value Review",
    trigger: "Every Friday at 08:00",
    condition: "Any active pilot",
    action: "Evaluate KPIs and draft steering summary",
    approval: "Required before publishing",
    lastRun: "16 Aug · Success",
  },
  {
    id: "new-signal",
    name: "New Signal Detection",
    trigger: "New approved source item",
    condition: "Material confidence delta ≥ 10%",
    action: "Update opportunity confidence",
    approval: "Notify only",
    lastRun: "21 Aug · 3 updates",
  },
  {
    id: "pilot-health",
    name: "Pilot Health Monitor",
    trigger: "Daily at 07:00",
    condition: "Adoption, quality, cost, or risk outside gate",
    action: "Create exception and owner task",
    approval: "Task approval required",
    lastRun: "22 Aug · 1 exception",
  },
  {
    id: "steerco-prep",
    name: "Steering Committee Prep",
    trigger: "48 hours before meeting",
    condition: "Scheduled steering review",
    action: "Update ROI and generate decision pack",
    approval: "Required before distribution",
    lastRun: "14 Aug · Success",
  },
];

export const agentActivity = [
  {
    agent: "Opportunity Miner",
    task: "Analysed reporting signals",
    model: "gpt-5.6-luna",
    status: "complete",
    latency: "8.2s",
    cost: "$0.18",
    time: "4 min ago",
  },
  {
    agent: "CFO Red Team",
    task: "Challenged Client Reporting case",
    model: "gpt-5.6-sol",
    status: "complete",
    latency: "21.6s",
    cost: "$1.42",
    time: "18 min ago",
  },
  {
    agent: "Pilot Health Monitor",
    task: "Detected adoption miss",
    model: "Rules + Terra",
    status: "attention",
    latency: "5.8s",
    cost: "$0.11",
    time: "36 min ago",
  },
  {
    agent: "Evidence Retrieval",
    task: "Indexed Operations Baseline.xlsx",
    model: "gpt-5.6-luna",
    status: "complete",
    latency: "4.1s",
    cost: "$0.06",
    time: "1 hr ago",
  },
];

export const modelEvaluations = [
  {
    model: "GPT-5.6 Sol",
    quality: 94,
    groundedness: 92,
    latency: 18.4,
    cost: 2.84,
    consistency: 91,
    failures: 1,
  },
  {
    model: "GPT-5.6 Terra",
    quality: 87,
    groundedness: 89,
    latency: 8.2,
    cost: 0.96,
    consistency: 90,
    failures: 2,
  },
  {
    model: "GPT-5.6 Luna",
    quality: 76,
    groundedness: 84,
    latency: 3.1,
    cost: 0.18,
    consistency: 86,
    failures: 4,
  },
];

export const proofOfValueTemplates = [
  {
    id: "support-triage",
    name: "Support triage + response recommendation",
    baseline: "12m 40s",
    assisted: "4m 18s",
    quality: 0.93,
    cost: "$0.14 / case",
  },
  {
    id: "executive-reporting",
    name: "Executive reporting synthesis",
    baseline: "7h 20m",
    assisted: "42m",
    quality: 0.91,
    cost: "$4.70 / report",
  },
  {
    id: "procurement-analysis",
    name: "Procurement vendor analysis",
    baseline: "3h 10m",
    assisted: "28m",
    quality: 0.89,
    cost: "$1.86 / review",
  },
];

export const asterData = {
  organisation: {
    id: "org-aster",
    name: "Aster Financial Group",
    synthetic: true,
  },
  summary: {
    valueAtStake: opportunities.reduce(
      (sum, item) => sum + item.annualValue,
      0,
    ),
    realisedRunRate: pilots.reduce(
      (sum, pilot) => sum + pilot.realisedRunRate,
      0,
    ),
    activeInitiatives: 12,
    decisionsRequired: approvals.filter(
      (approval) => approval.status === "pending",
    ).length,
  },
  businessUnits,
  opportunities,
  pilots,
  approvals,
  integrations,
  automations,
  agentActivity,
  modelEvaluations,
  proofOfValueTemplates,
  heroProcess,
  agentBlueprint,
};
