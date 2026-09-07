import type { PersistedRunEvent } from "./run-event-controller";

function isBoundEvent(
  event: PersistedRunEvent,
  organisationId: string,
  runId: string,
) {
  return event.organisationId === organisationId && event.runId === runId;
}

export function createAgentEventApiHandlers<
  Actor extends { organisationId: string },
>(dependencies: {
  resolveActor: () => Promise<Actor | null>;
  listEvents: (input: {
    organisationId: string;
    runId: string;
    afterSequence: number;
  }) => Promise<PersistedRunEvent[]>;
}) {
  return {
    async list(runId: string, request: Request) {
      const actor = await dependencies.resolveActor();
      if (!actor)
        return Response.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      const rawAfter = new URL(request.url).searchParams.get("after") ?? "0";
      const afterSequence = Number(rawAfter);
      if (!Number.isSafeInteger(afterSequence) || afterSequence < 0 || !runId) {
        return Response.json(
          { error: "Invalid event cursor" },
          { status: 400 },
        );
      }
      const events = await dependencies.listEvents({
        organisationId: actor.organisationId,
        runId,
        afterSequence,
      });
      return Response.json({
        events: events.filter((event) =>
          isBoundEvent(event, actor.organisationId, runId),
        ),
      });
    },
  };
}
