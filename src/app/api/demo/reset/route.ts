import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createDemoSession } from "@/modules/auth/demo-session";
import { getRequestActor } from "@/modules/auth/request-actor";
import { asterData } from "@/modules/demo/aster-data";

export async function POST() {
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
  store.set("aster_demo_session", createDemoSession(secret), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60,
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
