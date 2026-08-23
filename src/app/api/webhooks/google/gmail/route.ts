import { NextResponse } from "next/server";
import { z } from "zod";

import { inngest } from "@/inngest/client";

const pushSchema = z.object({
  message: z.object({ data: z.string(), messageId: z.string() }),
  subscription: z.string().optional(),
});
const notificationSchema = z.object({
  emailAddress: z.string().email(),
  historyId: z.string().regex(/^\d+$/),
});

export async function POST(request: Request) {
  const expected = process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN;
  const received =
    request.headers.get("x-aster-webhook-token") ??
    new URL(request.url).searchParams.get("token");
  if (!expected || received !== expected)
    return NextResponse.json(
      { error: "Invalid webhook token" },
      { status: 401 },
    );
  const parsed = pushSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid Pub/Sub envelope" },
      { status: 400 },
    );
  const decoded = notificationSchema.safeParse(
    JSON.parse(
      Buffer.from(parsed.data.message.data, "base64").toString("utf8"),
    ),
  );
  if (!decoded.success)
    return NextResponse.json(
      { error: "Invalid Gmail notification" },
      { status: 400 },
    );
  await inngest.send({
    name: "connectors/gmail.history",
    data: {
      messageId: parsed.data.message.messageId,
      historyId: decoded.data.historyId,
      accountHash: Buffer.from(decoded.data.emailAddress).toString("base64url"),
    },
  });
  return new NextResponse(null, { status: 204 });
}
