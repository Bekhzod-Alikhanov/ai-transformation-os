"use client";

import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import {
  RunEventController,
  type PersistedRunEvent,
  type RunEventStatus,
  type RunEventSubscription,
} from "./run-event-controller";

type Controller = Pick<RunEventController, "start" | "dispose">;
type ControllerFactory = (input: {
  onEvents: (events: PersistedRunEvent[]) => void;
  onStatus: (status: RunEventStatus) => void;
}) => Controller;

function statusLabel(status: RunEventStatus) {
  switch (status) {
    case "recovering":
      return "Recovering live run events";
    case "degraded":
      return "Live run events degraded; checking persisted updates";
    case "updated":
      return "Run events updated";
    default:
      return "Live run events connected";
  }
}

export function createSupabaseSubscription(
  organisationId: string,
  runId: string,
): RunEventSubscription {
  return {
    subscribe({ onEvent, onStatus }) {
      const client = createSupabaseBrowserClient();
      if (!client) {
        onStatus("CHANNEL_ERROR");
        return () => undefined;
      }
      const channel = client
        .channel(`evidence-run:${organisationId}:${runId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "agent_events",
            filter: `organisation_id=eq.${organisationId},run_id=eq.${runId}`,
          },
          onEvent,
        )
        .subscribe(onStatus);
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}

function defaultFactory(
  organisationId: string,
  runId: string,
): ControllerFactory {
  return ({ onEvents, onStatus }) =>
    new RunEventController({
      organisationId,
      runId,
      subscription: createSupabaseSubscription(organisationId, runId),
      fetchEvents: async (afterSequence) => {
        const response = await fetch(
          `/api/evidence/runs/${runId}/events?after=${afterSequence}`,
          { cache: "no-store", credentials: "same-origin" },
        );
        if (!response.ok) throw new Error("Unable to recover run events");
        const payload = (await response.json()) as {
          events?: PersistedRunEvent[];
        };
        return Array.isArray(payload.events) ? payload.events : [];
      },
      onEvents,
      onStatus,
    });
}

export function RunEventFeed({
  organisationId,
  runId,
  controllerFactory,
}: {
  organisationId: string;
  runId: string;
  controllerFactory?: ControllerFactory;
}) {
  const [status, setStatus] = useState<RunEventStatus>("recovering");
  const [events, setEvents] = useState<PersistedRunEvent[]>([]);

  useEffect(() => {
    const controller = (
      controllerFactory ?? defaultFactory(organisationId, runId)
    )({
      onEvents: setEvents,
      onStatus: setStatus,
    });
    controller.start();
    return () => controller.dispose();
  }, [controllerFactory, organisationId, runId]);

  return (
    <section
      className="border-t border-[#d9d9d1] pt-3"
      aria-label="Run activity"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#66695f]">
          Run activity
        </p>
        <p className="text-[10px] font-medium text-[#3157d5]" role="status">
          {statusLabel(status)}
        </p>
      </div>
      {events.at(-1) ? (
        <p className="mt-2 text-xs leading-5 text-[#454841]">
          {events.at(-1)?.summary}
        </p>
      ) : null}
    </section>
  );
}
