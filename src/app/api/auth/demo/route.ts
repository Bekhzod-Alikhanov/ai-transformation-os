import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createDemoSession } from "@/modules/auth/demo-session";

export async function POST(request: Request) {
  if (process.env.DEMO_MODE === "false")
    return NextResponse.json(
      { error: "Demo mode is disabled" },
      { status: 404 },
    );
  const secret = process.env.DEMO_SESSION_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "DEMO_SESSION_SECRET is not configured" },
      { status: 503 },
    );
  const token = createDemoSession(secret);
  const store = await cookies();
  store.set("aster_demo_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return NextResponse.json({
    mode: "synthetic_replay",
    organisation: "Aster Financial Group",
    synthetic: true,
  });
}
