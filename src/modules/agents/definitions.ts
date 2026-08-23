import type { z } from "zod";

import type { AgentDefinition } from "@/lib/domain/contracts";
import { routeModel, type ModelTask } from "@/config/models";

import {
  businessCaseChallengeSchema,
  executiveBriefingOutputSchema,
  opportunityMinerOutputSchema,
  orchestratorOutputSchema,
  pilotPlanOutputSchema,
  specialistOutputSchema,
  workflowOutputSchema,
} from "./schemas";
import { cfoRedTeamPrompt } from "./prompts/cfo-red-team";
import { changeLeadPrompt } from "./prompts/change-lead";
import { executiveBriefingPrompt } from "./prompts/executive-briefing";
import { opportunityMinerPrompt } from "./prompts/opportunity-miner";
import { orchestratorPrompt } from "./prompts/orchestrator";
import { pilotPlannerPrompt } from "./prompts/pilot-planner";
import { processArchitectPrompt } from "./prompts/process-architect";
import { riskLeadPrompt } from "./prompts/risk-lead";
import { technicalLeadPrompt } from "./prompts/technical-lead";
import { valueAnalystPrompt } from "./prompts/value-analyst";

function definition<TOutput>(input: {
  id: string;
  name: string;
  prompt: string;
  task: ModelTask;
  schema: z.ZodType<TOutput>;
  tools?: string[];
}): AgentDefinition<TOutput> {
  const model = routeModel(input.task);
  return {
    id: input.id,
    name: input.name,
    instructions: input.prompt,
    model: model.id,
    reasoningEffort: model.effort,
    tools: input.tools ?? [],
    outputSchema: input.schema,
  };
}

export const agentDefinitions = {
  opportunityMiner: definition({
    id: "opportunity-miner",
    name: "Opportunity Miner",
    prompt: opportunityMinerPrompt,
    task: "extraction",
    schema: opportunityMinerOutputSchema,
  }),
  processArchitect: definition({
    id: "process-architect",
    name: "Process Architect",
    prompt: processArchitectPrompt,
    task: "workflow_redesign",
    schema: workflowOutputSchema,
    tools: ["evidence_read"],
  }),
  valueAnalyst: definition({
    id: "value-analyst",
    name: "Value Analyst",
    prompt: valueAnalystPrompt,
    task: "structured_analysis",
    schema: specialistOutputSchema,
    tools: ["evidence_read", "financial_result_read"],
  }),
  technicalLead: definition({
    id: "technical-lead",
    name: "Technical Lead",
    prompt: technicalLeadPrompt,
    task: "structured_analysis",
    schema: specialistOutputSchema,
    tools: ["evidence_read", "connector_metadata_read"],
  }),
  riskLead: definition({
    id: "risk-lead",
    name: "Risk Lead",
    prompt: riskLeadPrompt,
    task: "structured_analysis",
    schema: specialistOutputSchema,
    tools: ["evidence_read", "policy_read"],
  }),
  changeLead: definition({
    id: "change-lead",
    name: "Change Lead",
    prompt: changeLeadPrompt,
    task: "structured_analysis",
    schema: specialistOutputSchema,
    tools: ["evidence_read"],
  }),
  cfoRedTeam: definition({
    id: "cfo-red-team",
    name: "CFO Red Team",
    prompt: cfoRedTeamPrompt,
    task: "red_team",
    schema: specialistOutputSchema,
    tools: ["evidence_read", "financial_result_read"],
  }),
  businessCaseChallenge: definition({
    id: "business-case-challenge",
    name: "Business Case Challenge",
    prompt: cfoRedTeamPrompt,
    task: "red_team",
    schema: businessCaseChallengeSchema,
    tools: ["evidence_read", "financial_result_read"],
  }),
  pilotPlanner: definition({
    id: "pilot-planner",
    name: "Pilot Planner",
    prompt: pilotPlannerPrompt,
    task: "structured_analysis",
    schema: pilotPlanOutputSchema,
    tools: ["evidence_read", "policy_read"],
  }),
  executiveBriefing: definition({
    id: "executive-briefing",
    name: "Executive Briefing",
    prompt: executiveBriefingPrompt,
    task: "committee_synthesis",
    schema: executiveBriefingOutputSchema,
    tools: ["evidence_read", "portfolio_read"],
  }),
  orchestrator: definition({
    id: "orchestrator",
    name: "Transformation Orchestrator",
    prompt: orchestratorPrompt,
    task: "committee_synthesis",
    schema: orchestratorOutputSchema,
    tools: ["specialist_outputs_read", "policy_read"],
  }),
};

export const committeeDefinitions = [
  agentDefinitions.valueAnalyst,
  agentDefinitions.technicalLead,
  agentDefinitions.riskLead,
  agentDefinitions.changeLead,
  agentDefinitions.cfoRedTeam,
] as const;
