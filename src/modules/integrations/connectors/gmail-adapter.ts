import { randomUUID } from "node:crypto";

import type { gmail_v1 } from "googleapis";
import { z } from "zod";

import type {
  ConnectorAdapter,
  ExternalAction,
  SyncCursor,
} from "@/lib/domain/contracts";
import type { ApprovalRevision } from "@/modules/approvals/approval-service";

import { authenticatedGoogleClients } from "./google-clients";

const messageSchema = z
  .object({
    to: z.array(z.string().email()).min(1),
    cc: z.array(z.string().email()).default([]),
    subject: z.string().min(1).max(998),
    bodyText: z.string().min(1).max(500_000),
    threadId: z.string().optional(),
  })
  .strict();

function decodeBase64Url(data: string) {
  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
}

function plainText(part?: gmail_v1.Schema$MessagePart): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data)
    return decodeBase64Url(part.body.data);
  return (part.parts ?? []).map(plainText).filter(Boolean).join("\n");
}

function header(message: gmail_v1.Schema$Message, name: string) {
  return (
    message.payload?.headers?.find(
      (item) => item.name?.toLowerCase() === name.toLowerCase(),
    )?.value ?? ""
  );
}

function mimeMessage(payload: z.infer<typeof messageSchema>) {
  const lines = [
    `To: ${payload.to.join(", ")}`,
    ...(payload.cc.length ? [`Cc: ${payload.cc.join(", ")}`] : []),
    `Subject: ${payload.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    payload.bodyText,
  ];
  return Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");
}

export class GmailConnectorAdapter implements ConnectorAdapter {
  readonly id = "gmail";
  readonly capabilities = [
    "read_messages",
    "create_draft",
    "send_message",
  ] as const;

  constructor(
    private readonly organisationId: string,
    private readonly refreshToken: string,
  ) {}

  async sync(cursor?: SyncCursor) {
    const { gmail } = authenticatedGoogleClients(this.refreshToken);
    const ids = new Set<string>();
    let nextHistoryId = cursor?.value;
    if (cursor?.value) {
      let pageToken: string | undefined;
      do {
        const response = await gmail.users.history.list({
          userId: "me",
          startHistoryId: cursor.value,
          historyTypes: ["messageAdded"],
          pageToken,
        });
        response.data.history?.forEach((entry) =>
          entry.messagesAdded?.forEach(
            (addition) => addition.message?.id && ids.add(addition.message.id),
          ),
        );
        nextHistoryId = response.data.historyId ?? nextHistoryId;
        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);
    } else {
      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: 100,
        q: "newer_than:90d",
      });
      response.data.messages?.forEach(
        (message) => message.id && ids.add(message.id),
      );
    }
    const messages = await Promise.all(
      [...ids].map((id) =>
        gmail.users.messages.get({ userId: "me", id, format: "full" }),
      ),
    );
    const items = messages.map(({ data }) => ({
      externalId: data.id,
      threadId: data.threadId,
      title: header(data, "subject"),
      content: plainText(data.payload),
      occurredAt: data.internalDate
        ? new Date(Number(data.internalDate)).toISOString()
        : undefined,
      locator: {
        type: "gmail_message",
        messageId: data.id,
        threadId: data.threadId,
      },
    }));
    if (!nextHistoryId) {
      const profile = await gmail.users.getProfile({ userId: "me" });
      nextHistoryId = profile.data.historyId ?? "0";
    }
    return {
      cursor: { value: nextHistoryId, updatedAt: new Date().toISOString() },
      items,
    };
  }

  async propose(action: ExternalAction): Promise<ApprovalRevision> {
    if (action.organisationId !== this.organisationId)
      throw new Error("Connector organisation mismatch");
    if (action.type !== "gmail.create_draft" && action.type !== "gmail.send")
      throw new Error("Unsupported Gmail action");
    const payload = messageSchema.parse(action.payload);
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
    if (action.organisationId !== this.organisationId)
      throw new Error("Connector organisation mismatch");
    const payload = messageSchema.parse(action.payload);
    const { gmail } = authenticatedGoogleClients(this.refreshToken);
    const raw = mimeMessage(payload);
    if (action.type === "gmail.create_draft") {
      const response = await gmail.users.drafts.create({
        userId: "me",
        requestBody: { message: { raw, threadId: payload.threadId } },
      });
      if (!response.data.id) throw new Error("Gmail did not return a draft id");
      return {
        externalId: response.data.id,
        executedAt: new Date().toISOString(),
      };
    }
    if (action.type !== "gmail.send")
      throw new Error("Sending requires a distinct gmail.send approval");
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId: payload.threadId },
    });
    if (!response.data.id) throw new Error("Gmail did not return a message id");
    return {
      externalId: response.data.id,
      executedAt: new Date().toISOString(),
    };
  }

  async renewWatch(topicName: string) {
    const { gmail } = authenticatedGoogleClients(this.refreshToken);
    const response = await gmail.users.watch({
      userId: "me",
      requestBody: { topicName, labelIds: ["INBOX"] },
    });
    return {
      historyId: response.data.historyId,
      expiresAt: response.data.expiration
        ? new Date(Number(response.data.expiration)).toISOString()
        : undefined,
    };
  }
}
