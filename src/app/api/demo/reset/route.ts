import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  resetDemoSession,
  verifyDemoSession,
} from "@/modules/auth/demo-session";
import { getRequestActor } from "@/modules/auth/request-actor";
import { asterData } from "@/modules/demo/aster-data";

export async function POST(request: Request) {
  const actor = await getRequestActor();
  if (!actor || !actor.synthetic || !["owner", "admin"].includes(actor.role))
    return NextResponse.json(
      { error: "An authorised demo owner is required" },
      { status: 403 },
    );
  const secret = process.env.DEMO_SESSION_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Demo signing is not configured" },
      { status: 503 },
    );
  const store = await cookies();
  const token = store.get("aster_demo_session")?.value;
  if (!token)
    return NextResponse.json(
      { error: "An active demo session is required" },
      { status: 403 },
    );
  const now = Date.now();
  const resetToken = resetDemoSession(token, secret, now);
  const session = verifyDemoSession(resetToken, secret, now);
  const remainingSeconds = Math.max(
    0,
    Math.floor((session.expiresAt - now) / 1_000),
  );
  store.set("aster_demo_session", resetToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: remainingSeconds,
  });
  return NextResponse.json({
    reset: true,
    synthetic: true,
    stableIds: true,
    counts: {
      businessUnits: asterData.businessUnits.length,
      opportunities: asterData.opportunities.length,
      pilots: asterData.pilots.length,
      approvals: asterData.approvals.length,
    },
  });
}
