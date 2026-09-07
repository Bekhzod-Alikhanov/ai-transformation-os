export type PersistedRunEvent = {
  id: string;
  organisationId: string;
  runId: string;
  sequence: number;
  eventType: string;
  summary: string;
  occurredAt: string;
};

export type RunEventStatus =
  "connected" | "recovering" | "degraded" | "updated";

export interface RunEventSubscription {
  subscribe(input: {
    onEvent: (value: unknown) => void;
    onStatus: (status: string) => void;
  }): () => void;
}

type Dependencies = {
  organisationId: string;
  runId: string;
  subscription: RunEventSubscription;
  fetchEvents: (afterSequence: number) => Promise<PersistedRunEvent[]>;
  onEvents: (events: PersistedRunEvent[]) => void;
  onStatus: (status: RunEventStatus) => void;
  schedule?: (callback: () => void, delayMs: number) => number;
  clearSchedule?: (id: number) => void;
};

const fallbackPollMs = 15_000;
const reconnectMs = 1_000;

function isBoundEvent(
  value: unknown,
  organisationId: string,
  runId: string,
): value is PersistedRunEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<PersistedRunEvent>;
  return (
    typeof event.id === "string" &&
    event.organisationId === organisationId &&
    event.runId === runId &&
    typeof event.sequence === "number" &&
    typeof event.eventType === "string" &&
    typeof event.summary === "string" &&
    typeof event.occurredAt === "string"
  );
}

function hasBoundChannelPayload(
  value: unknown,
  organisationId: string,
  runId: string,
) {
  if (!value || typeof value !== "object") return false;
  const record = value as { new?: Record<string, unknown> };
  return (
    record.new?.organisation_id === organisationId &&
    record.new?.run_id === runId
  );
}

export class RunEventController {
  private readonly schedule: (callback: () => void, delayMs: number) => number;
  private readonly clearSchedule: (id: number) => void;
  private unsubscribe: (() => void) | null = null;
  private reconnectTimer: number | null = null;
  private pollTimer: number | null = null;
  private active = false;
  private degraded = false;
  private requestVersion = 0;
  private latestRequest: Promise<void> = Promise.resolve();
  private events: PersistedRunEvent[] = [];
  private recoveryInFlight = false;
  private recoveryQueued = false;

  constructor(private readonly dependencies: Dependencies) {
    this.schedule =
      dependencies.schedule ??
      ((callback, delayMs) => window.setTimeout(callback, delayMs));
    this.clearSchedule =
      dependencies.clearSchedule ?? ((id) => window.clearTimeout(id));
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.openSubscription();
  }

  dispose() {
    this.active = false;
    this.requestVersion += 1;
    this.recoveryQueued = false;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clearTimer("reconnectTimer");
    this.clearTimer("pollTimer");
  }

  async flush() {
    await this.latestRequest;
  }

  private openSubscription() {
    if (!this.active || this.unsubscribe) return;
    this.unsubscribe = this.dependencies.subscription.subscribe({
      onEvent: (payload) => {
        if (
          hasBoundChannelPayload(
            payload,
            this.dependencies.organisationId,
            this.dependencies.runId,
          )
        ) {
          this.recover();
        }
      },
      onStatus: (status) => this.handleSubscriptionStatus(status),
    });
  }

  private handleSubscriptionStatus(status: string) {
    if (!this.active) return;
    if (status === "SUBSCRIBED") {
      this.degraded = false;
      this.clearTimer("reconnectTimer");
      this.clearTimer("pollTimer");
      this.dependencies.onStatus("connected");
      this.recover();
      return;
    }
    if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
      const enteringDegraded = !this.degraded;
      if (enteringDegraded) {
        this.degraded = true;
        this.dependencies.onStatus("degraded");
      }
      this.unsubscribe?.();
      this.unsubscribe = null;
      if (enteringDegraded) this.recover();
      this.scheduleReconnect();
    }
  }

  private recover() {
    if (!this.active) return;
    if (this.recoveryInFlight) {
      this.recoveryQueued = true;
      return;
    }
    this.recoveryInFlight = true;
    const version = ++this.requestVersion;
    this.dependencies.onStatus("recovering");
    this.latestRequest = this.dependencies
      .fetchEvents(this.events.at(-1)?.sequence ?? 0)
      .then((response) => {
        if (!this.active || version !== this.requestVersion) return;
        const accepted = response.filter((event) =>
          isBoundEvent(
            event,
            this.dependencies.organisationId,
            this.dependencies.runId,
          ),
        );
        if (accepted.length) {
          const known = new Map(this.events.map((event) => [event.id, event]));
          for (const event of accepted) known.set(event.id, event);
          this.events = [...known.values()].sort(
            (left, right) => left.sequence - right.sequence,
          );
          this.dependencies.onEvents(this.events);
          this.dependencies.onStatus("updated");
        } else if (!this.degraded) {
          this.dependencies.onStatus("connected");
        }
      })
      .catch(() => {
        if (this.active && version === this.requestVersion) {
          this.degraded = true;
          this.dependencies.onStatus("degraded");
          this.scheduleReconnect();
        }
      })
      .finally(() => {
        this.recoveryInFlight = false;
        if (!this.active || version !== this.requestVersion) return;
        if (this.recoveryQueued) {
          this.recoveryQueued = false;
          this.recover();
          return;
        }
        if (this.degraded) this.schedulePoll();
      });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer !== null || !this.active) return;
    this.reconnectTimer = this.schedule(() => {
      this.reconnectTimer = null;
      this.openSubscription();
    }, reconnectMs);
  }

  private schedulePoll() {
    if (this.pollTimer !== null || !this.active) return;
    this.pollTimer = this.schedule(() => {
      this.pollTimer = null;
      this.recover();
    }, fallbackPollMs);
  }

  private clearTimer(timer: "reconnectTimer" | "pollTimer") {
    const value = this[timer];
    if (value === null) return;
    this.clearSchedule(value);
    this[timer] = null;
  }
}
