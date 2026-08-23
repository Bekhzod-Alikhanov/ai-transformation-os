import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";
import { AgentRunner } from "@/modules/agents/agent-runner";
import { agentDefinitions } from "@/modules/agents/definitions";
import { getRequestActor } from "@/modules/auth/request-actor";

export async function POST() {
  const actor = await getRequestActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  if (actor.synthetic) {
    const result = await AgentRunner.run(agentDefinitions.opportunityMiner, {
      organisationId: actor.organisationId,
      subjectId: "aster-evidence-ledger",
      payload: { sourceCount: 18, synthetic: true },
      mode: "synthetic_replay",
    });
    return NextResponse.json({
      mode: "synthetic_replay",
      runId: result.runId,
      status: result.status,
      output: result.output,
    });
  }
  const event = await inngest.send({
    name: "evidence/source.uploaded",
    data: {
      organisationId: actor.organisationId,
      sourceId: "approved-ledger-batch",
    },
  });
  return NextResponse.json(
    { mode: "live", queued: true, eventIds: event.ids },
    { status: 202 },
  );
}
