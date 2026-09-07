import { describe, expect, it } from "vitest";

import {
  RunEventController,
  type PersistedRunEvent,
  type RunEventSubscription,
} from "./run-event-controller";

const organisationId = "organisation-1";
const runId = "run-1";
const event = (
  sequence: number,
  overrides: Partial<PersistedRunEvent> = {},
) => ({
  id: `event-${sequence}`,
  organisationId,
  runId,
  sequence,
  eventType: "progress",
  summary: `Step ${sequence}`,
  occurredAt: `2026-08-29T12:0${sequence}:00.000Z`,
  ...overrides,
});

class FakeSubscription implements RunEventSubscription {
  readonly subscriptions: Array<{
    onEvent: (value: unknown) => void;
    onStatus: (status: string) => void;
  }> = [];
  removed = 0;

  subscribe(input: {
    onEvent: (value: unknown) => void;
    onStatus: (status: string) => void;
  }) {
    this.subscriptions.push(input);
    return () => {
      this.removed += 1;
    };
  }
}

describe("RunEventController", () => {
  it("renders only organisation- and run-bound events returned by authoritative recovery", async () => {
    const subscription = new FakeSubscription();
    const rendered: PersistedRunEvent[][] = [];
    const controller = new RunEventController({
      organisationId,
      runId,
      subscription,
      fetchEvents: async () => [
        event(1),
        event(2, { organisationId: "other-organisation" }),
        event(3, { runId: "other-run" }),
      ],
      onEvents: (events) => rendered.push(events),
      onStatus: () => undefined,
    });

    controller.start();
    subscription.subscriptions[0]!.onStatus("SUBSCRIBED");
    await controller.flush();

    expect(rendered.at(-1)).toEqual([event(1)]);
  });

  it("reconnects after a channel failure, recovers immediately, and keeps one bounded fallback poll", async () => {
    const subscription = new FakeSubscription();
    const scheduled: Array<() => void> = [];
    const statuses: string[] = [];
    let fetches = 0;
    const controller = new RunEventController({
      organisationId,
      runId,
      subscription,
      fetchEvents: async () => {
        fetches += 1;
        return [event(fetches)];
      },
      onEvents: () => undefined,
      onStatus: (status) => statuses.push(status),
      schedule: (callback) => {
        scheduled.push(callback);
        return scheduled.length;
      },
      clearSchedule: () => undefined,
    });

    controller.start();
    subscription.subscriptions[0]!.onStatus("CHANNEL_ERROR");
    await controller.flush();
    subscription.subscriptions[0]!.onStatus("CHANNEL_ERROR");

    expect(statuses).toContain("degraded");
    expect(fetches).toBe(1);
    expect(scheduled).toHaveLength(2);

    scheduled[0]!();
    expect(subscription.subscriptions).toHaveLength(2);
    scheduled[1]!();
    await controller.flush();
    expect(fetches).toBe(2);
  });

  it("serializes recovery after a channel event and cleans up subscriptions/timers", async () => {
    const subscription = new FakeSubscription();
    const pending: Array<(events: PersistedRunEvent[]) => void> = [];
    const rendered: PersistedRunEvent[][] = [];
    const controller = new RunEventController({
      organisationId,
      runId,
      subscription,
      fetchEvents: () => new Promise((resolve) => pending.push(resolve)),
      onEvents: (events) => rendered.push(events),
      onStatus: () => undefined,
      schedule: () => 9,
    });

    controller.start();
    subscription.subscriptions[0]!.onStatus("SUBSCRIBED");
    subscription.subscriptions[0]!.onEvent({
      new: { organisation_id: organisationId, run_id: runId, sequence: 2 },
    });
    pending[0]!([event(1)]);
    await controller.flush();
    pending[1]!([event(2)]);
    await controller.flush();
    controller.dispose();

    expect(rendered.at(-1)).toEqual([event(1), event(2)]);
    expect(subscription.removed).toBe(1);
  });

  it("cleans up the degraded reconnect and polling timers on unmount", () => {
    const subscription = new FakeSubscription();
    const cleared: number[] = [];
    let nextTimer = 0;
    const controller = new RunEventController({
      organisationId,
      runId,
      subscription,
      fetchEvents: async () => [],
      onEvents: () => undefined,
      onStatus: () => undefined,
      schedule: () => ++nextTimer,
      clearSchedule: (id) => cleared.push(id),
    });

    controller.start();
    subscription.subscriptions[0]!.onStatus("TIMED_OUT");
    controller.dispose();

    expect(subscription.removed).toBe(1);
    expect(cleared).toEqual([1]);
  });

  it("keeps retrying failed reconnects and waits for a recovery to settle before scheduling another poll", async () => {
    const subscription = new FakeSubscription();
    const scheduled: Array<() => void> = [];
    const pending: Array<(events: PersistedRunEvent[]) => void> = [];
    const controller = new RunEventController({
      organisationId,
      runId,
      subscription,
      fetchEvents: () => new Promise((resolve) => pending.push(resolve)),
      onEvents: () => undefined,
      onStatus: () => undefined,
      schedule: (callback) => {
        scheduled.push(callback);
        return scheduled.length;
      },
      clearSchedule: () => undefined,
    });

    controller.start();
    subscription.subscriptions[0]!.onStatus("CHANNEL_ERROR");
    scheduled[0]!();
    subscription.subscriptions[1]!.onStatus("CHANNEL_ERROR");

    expect(scheduled).toHaveLength(2);
    scheduled[1]!();
    expect(subscription.subscriptions).toHaveLength(3);
    expect(scheduled).toHaveLength(2);

    pending[0]!([]);
    await controller.flush();
    expect(scheduled).toHaveLength(3);
  });
});
