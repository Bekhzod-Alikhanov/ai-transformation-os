import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";

export async function POST(request: Request) {
  const expected = process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN;
  const received = request.headers.get("x-goog-channel-token");
  if (!expected || received !== expected)
    return NextResponse.json(
      { error: "Invalid channel token" },
      { status: 401 },
    );
  const channelId = request.headers.get("x-goog-channel-id");
  const resourceId = request.headers.get("x-goog-resource-id");
  const resourceState = request.headers.get("x-goog-resource-state");
  if (!channelId || !resourceId || !resourceState)
    return NextResponse.json(
      { error: "Missing Calendar channel headers" },
      { status: 400 },
    );
  await inngest.send({
    name: "connectors/calendar.changed",
    data: { channelId, resourceId, resourceState },
  });
  return new NextResponse(null, { status: 204 });
}
