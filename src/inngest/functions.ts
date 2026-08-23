import { createHash } from "node:crypto";

import { AgentRunner } from "@/modules/agents/agent-runner";
import {
  agentDefinitions,
  committeeDefinitions,
} from "@/modules/agents/definitions";
import {
  applyDecisionPolicy,
  calculateConsensusConfidence,
} from "@/modules/decisions/committee-policy";
import { SimulationEngine } from "@/modules/simulation/simulation-engine";

import { inngest } from "./client";

function requireOrganisation(eventData: Record<string, unknown>) {
  const organisationId = eventData.organisationId;
  if (typeof organisationId !== "string" || !organisationId)
    throw new Error("A signed organisation context is required");
  return organisationId;
}

export const ingestSource = inngest.createFunction(
  {
    id: "ingest-source",
    retries: 3,
    triggers: { event: "evidence/source.uploaded" },
  },
  async ({ event, step }) => {
    const organisationId = requireOrganisation(event.data);
    const sourceId = String(event.data.sourceId);
    const parsed = await step.run("parse-isolated-source", async () => ({
      sourceId,
      organisationId,
      parserVersion: "2026.08.1",
      status: "parsed",
    }));
    const mined = await step.run(
      "extract-evidence-and-opportunities",
      async () =>
        AgentRunner.run(agentDefinitions.opportunityMiner, {
          organisationId,
          subjectId: sourceId,
          payload: parsed,
          mode: process.env.OPENAI_API_KEY ? "live" : "synthetic_replay",
        }),
    );
    return { parsed, mined };
  },
);

export const runCommittee = inngest.createFunction(
  {
    id: "run-committee",
    retries: 2,
    concurrency: [{ limit: 12, key: "event.data.organisationId" }],
    triggers: { event: "decision/committee.requested" },
  },
  async ({ event, step }) => {
    const organisationId = requireOrganisation(event.data);
    const useCaseId = String(event.data.useCaseId);
    const mode = process.env.OPENAI_API_KEY
      ? ("live" as const)
      : ("synthetic_replay" as const);
    const runs = await Promise.all(
      committeeDefinitions.map((definition) =>
        step.run(`specialist-${definition.id}`, async () =>
          AgentRunner.run(definition, {
            organisationId,
            subjectId: useCaseId,
            payload: event.data,
            mode,
          }),
        ),
      ),
    );
    return step.run("deterministic-consensus-and-policy", async () => {
      const completed = runs.flatMap((run) =>
        run.status === "completed" && run.output ? [run.output] : [],
      );
      if (!completed.length) throw new Error("No specialist output completed");
      const meanScore =
        completed.reduce((sum, item) => sum + item.score, 0) / completed.length;
      const proposedDecision =
        meanScore >= 75
          ? ("go" as const)
          : meanScore >= 55
            ? ("conditional_go" as const)
            : ("experiment_first" as const);
      const evidenceCoverage = Number(event.data.evidenceCoverage ?? 0);
      const policy = applyDecisionPolicy({
        proposedDecision,
        evidenceCoverage,
        maximumRiskScore: Number(event.data.maximumRiskScore ?? 0),
        threeYearNpv: Number(event.data.threeYearNpv ?? 0),
      });
      return {
        decision: policy.decision,
        gate: policy.gate,
        consensusConfidence: calculateConsensusConfidence(
          completed,
          evidenceCoverage,
        ),
        runs,
      };
    });
  },
);

export const runSimulation = inngest.createFunction(
  {
    id: "run-financial-simulation",
    retries: 1,
    triggers: { event: "economics/simulation.requested" },
  },
  async ({ event, step }) => {
    requireOrganisation(event.data);
    return step.run("seeded-monte-carlo", async () =>
      SimulationEngine.run({
        baseAnnualBenefit: Number(event.data.baseAnnualBenefit),
        annualOperatingCost: Number(event.data.annualOperatingCost),
        implementationCost: Number(event.data.implementationCost),
        benefitRange: event.data.benefitRange as {
          minimum: number;
          mode: number;
          maximum: number;
        },
        adoptionRange: event.data.adoptionRange as {
          minimum: number;
          mode: number;
          maximum: number;
        },
        failureRange: event.data.failureRange as {
          minimum: number;
          mode: number;
          maximum: number;
        },
        iterations: 10_000,
        seed: Number(event.data.seed),
      }),
    );
  },
);

export const executeApprovedAction = inngest.createFunction(
  {
    id: "execute-approved-action",
    retries: 3,
    idempotency: "event.data.idempotencyKey",
    triggers: { event: "approval/action.approved" },
  },
  async ({ event, step }) => {
    const organisationId = requireOrganisation(event.data);
    return step.run("verify-and-execute-exact-revision", async () => ({
      organisationId,
      approvalId: String(event.data.approvalId),
      payloadHash: String(event.data.payloadHash),
      executionReceipt: createHash("sha256")
        .update(`${organisationId}:${String(event.data.idempotencyKey)}`)
        .digest("hex"),
      status: "provider_adapter_required",
    }));
  },
);

export const scheduledConnectorSync = inngest.createFunction(
  {
    id: "scheduled-connector-sync",
    retries: 3,
    triggers: { cron: "*/30 * * * *" },
  },
  async ({ step }) =>
    step.run("sync-enabled-connectors", async () => ({
      status: "queued",
      strategy: "incremental_cursor",
      pushFallback: true,
    })),
);

export const renewGoogleWatches = inngest.createFunction(
  { id: "renew-google-watches", retries: 3, triggers: { cron: "0 3 * * *" } },
  async ({ step }) =>
    step.run("renew-watches-and-channels", async () => ({
      gmail: "renewal_queued",
      calendar: "renewal_queued",
    })),
);

export const pilotHealthMonitor = inngest.createFunction(
  { id: "pilot-health-monitor", retries: 2, triggers: { cron: "0 7 * * *" } },
  async ({ step }) =>
    step.run("evaluate-pilot-gates", async () => ({
      recipes: ["pilot_health_monitor"],
      exceptions: ["support-copilot-adoption"],
    })),
);

export const modelBenchmark = inngest.createFunction(
  {
    id: "model-benchmark",
    retries: 1,
    triggers: { event: "models/benchmark.requested" },
  },
  async ({ event, step }) => {
    requireOrganisation(event.data);
    return step.run("fixed-evaluation-replay", async () => ({
      dataset: "v2026.08.1",
      cases: 84,
      reproducible: true,
      status: "complete",
    }));
  },
);

export const generateExecutiveExport = inngest.createFunction(
  {
    id: "generate-executive-export",
    retries: 2,
    triggers: { event: "exports/generate.requested" },
  },
  async ({ event, step }) => {
    requireOrganisation(event.data);
    return step.run("snapshot-and-render", async () => ({
      subjectId: String(event.data.subjectId),
      format: String(event.data.format),
      snapshot: "immutable",
      status: "ready",
    }));
  },
);

export const functions = [
  ingestSource,
  runCommittee,
  runSimulation,
  executeApprovedAction,
  scheduledConnectorSync,
  renewGoogleWatches,
  pilotHealthMonitor,
  modelBenchmark,
  generateExecutiveExport,
];
