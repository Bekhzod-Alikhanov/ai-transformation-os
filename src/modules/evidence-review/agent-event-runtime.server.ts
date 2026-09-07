import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getRequestActor } from "@/modules/auth/request-actor";

import { createAgentEventApiHandlers } from "./agent-event-api";
import type { PersistedRunEvent } from "./run-event-controller";

type EventRow = Record<string, unknown>;
type EventQuery = {
  select(columns: string): EventQuery;
  eq(column: string, value: string): EventQuery;
  gt(column: string, value: number): EventQuery;
  order(
    column: string,
    options: { ascending: boolean },
  ): Promise<{
    data: EventRow[] | null;
    error: { message: string } | null;
  }>;
};

function toEvent(row: EventRow): PersistedRunEvent {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    runId: String(row.run_id),
    sequence: Number(row.sequence),
    eventType: String(row.event_type),
    summary: String(row.summary),
    occurredAt: String(row.occurred_at),
  };
}

async function listPersistedEvents(input: {
  organisationId: string;
  runId: string;
  afterSequence: number;
}) {
  const client = createSupabaseServiceClient();
  if (!client) throw new Error("Evidence persistence is not configured");
  const result = await (
    client as unknown as { from(table: "agent_events"): EventQuery }
  )
    .from("agent_events")
    .select("id,organisation_id,run_id,sequence,event_type,summary,occurred_at")
    .eq("organisation_id", input.organisationId)
    .eq("run_id", input.runId)
    .gt("sequence", input.afterSequence)
    .order("sequence", { ascending: true });
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? [])
    .map(toEvent)
    .filter(
      (event) =>
        event.organisationId === input.organisationId &&
        event.runId === input.runId,
    );
}

export const agentEventApiHandlers = createAgentEventApiHandlers({
  resolveActor: getRequestActor,
  listEvents: listPersistedEvents,
});
