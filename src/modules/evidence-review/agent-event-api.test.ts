import { describe, expect, it } from "vitest";

import { createAgentEventApiHandlers } from "./agent-event-api";

describe("agent event API", () => {
  it("binds persisted run-event reads to the request actor organisation and filters malformed cross-tenant results", async () => {
    const reads: unknown[] = [];
    const handlers = createAgentEventApiHandlers({
      resolveActor: async () => ({ organisationId: "organisation-1" }),
      listEvents: async (input) => {
        reads.push(input);
        return [
          {
            id: "event-1",
            organisationId: "organisation-1",
            runId: "run-1",
            sequence: 1,
            eventType: "progress",
            summary: "Extracted source",
            occurredAt: "2026-08-29T12:00:00.000Z",
          },
          {
            id: "event-2",
            organisationId: "other-organisation",
            runId: "run-1",
            sequence: 2,
            eventType: "progress",
            summary: "Must not leak",
            occurredAt: "2026-08-29T12:01:00.000Z",
          },
        ];
      },
    });

    const response = await handlers.list(
      "run-1",
      new Request("http://local/api/evidence/runs/run-1/events?after=4"),
    );

    expect(reads).toEqual([
      { organisationId: "organisation-1", runId: "run-1", afterSequence: 4 },
    ]);
    await expect(response.json()).resolves.toEqual({
      events: [
        expect.objectContaining({
          id: "event-1",
          organisationId: "organisation-1",
        }),
      ],
    });
  });
});
