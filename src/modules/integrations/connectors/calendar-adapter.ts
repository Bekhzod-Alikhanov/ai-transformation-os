import { randomUUID } from "node:crypto";

import { z } from "zod";

import type {
  ConnectorAdapter,
  ExternalAction,
  SyncCursor,
} from "@/lib/domain/contracts";
import type { ApprovalRevision } from "@/modules/approvals/approval-service";

import { authenticatedGoogleClients } from "./google-clients";

const eventDateSchema = z
  .object({ dateTime: z.string().datetime(), timeZone: z.string().min(1) })
  .strict();
const eventSchema = z
  .object({
    calendarId: z.string().default("primary"),
    summary: z.string().min(1).max(1_024),
    description: z.string().max(8_192).optional(),
    location: z.string().max(1_024).optional(),
    start: eventDateSchema,
    end: eventDateSchema,
    attendees: z
      .array(z.object({ email: z.string().email() }).strict())
      .default([]),
  })
  .strict()
  .refine(
    (value) => new Date(value.end.dateTime) > new Date(value.start.dateTime),
    "Event must end after it starts",
  );

export class CalendarConnectorAdapter implements ConnectorAdapter {
  readonly id = "calendar";
  readonly capabilities = ["read_events", "create_event"] as const;

  constructor(
    private readonly organisationId: string,
    private readonly refreshToken: string,
  ) {}

  async sync(cursor?: SyncCursor) {
    const { calendar } = authenticatedGoogleClients(this.refreshToken);
    const items = [];
    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;
    do {
      const response = await calendar.events.list({
        calendarId: "primary",
        syncToken: cursor?.value,
        timeMin: cursor
          ? undefined
          : new Date(Date.now() - 90 * 24 * 60 * 60 * 1_000).toISOString(),
        singleEvents: true,
        showDeleted: true,
        pageToken,
      });
      for (const event of response.data.items ?? []) {
        items.push({
          externalId: event.id,
          title: event.summary,
          content: event.description ?? "",
          occurredAt: event.start?.dateTime ?? event.start?.date,
          status: event.status,
          attendees: event.attendees
            ?.map((attendee) => attendee.email)
            .filter(Boolean),
          locator: {
            type: "calendar_event",
            calendarId: "primary",
            eventId: event.id,
          },
        });
      }
      pageToken = response.data.nextPageToken ?? undefined;
      nextSyncToken = response.data.nextSyncToken ?? nextSyncToken;
    } while (pageToken);
    if (!nextSyncToken)
      throw new Error("Calendar did not return an incremental sync token");
    return {
      cursor: { value: nextSyncToken, updatedAt: new Date().toISOString() },
      items,
    };
  }

  async propose(action: ExternalAction): Promise<ApprovalRevision> {
    if (action.organisationId !== this.organisationId)
      throw new Error("Connector organisation mismatch");
    if (action.type !== "calendar.create_event")
      throw new Error("Unsupported Calendar action");
    const payload = eventSchema.parse(action.payload);
    return {
      id: randomUUID(),
      organisationId: action.organisationId,
      revision: 1,
      status: "pending",
      actionType: action.type,
      payload,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
    };
  }

  async execute(
    action: ExternalAction & { approvalId: string; payloadHash: string },
  ) {
    if (
      action.organisationId !== this.organisationId ||
      action.type !== "calendar.create_event"
    )
      throw new Error(
        "Calendar action is not authorised for this organisation",
      );
    const payload = eventSchema.parse(action.payload);
    const { calendar } = authenticatedGoogleClients(this.refreshToken);
    const response = await calendar.events.insert({
      calendarId: payload.calendarId,
      sendUpdates: "all",
      requestBody: {
        summary: payload.summary,
        description: payload.description,
        location: payload.location,
        start: payload.start,
        end: payload.end,
        attendees: payload.attendees,
      },
    });
    if (!response.data.id)
      throw new Error("Calendar did not return an event id");
    return {
      externalId: response.data.id,
      executedAt: new Date().toISOString(),
    };
  }

  async createWatch(callbackUrl: string, channelToken: string) {
    const { calendar } = authenticatedGoogleClients(this.refreshToken);
    const channelId = randomUUID();
    const response = await calendar.events.watch({
      calendarId: "primary",
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: callbackUrl,
        token: channelToken,
        expiration: String(Date.now() + 6 * 24 * 60 * 60 * 1_000),
      },
    });
    return {
      channelId,
      resourceId: response.data.resourceId,
      expiresAt: response.data.expiration
        ? new Date(Number(response.data.expiration)).toISOString()
        : undefined,
    };
  }
}
