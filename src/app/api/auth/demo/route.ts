import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { resumeOrCreateDemoSession } from "@/modules/auth/demo-session";

const maxAge = 24 * 60 * 60;

async function demoToken() {
  const secret = process.env.DEMO_SESSION_SECRET;
  if (!secret) return null;
  const store = await cookies();
  return resumeOrCreateDemoSession(
    store.get("aster_demo_session")?.value,
    secret,
  );
}

function setDemoCookie(
  response: NextResponse,
  token: string,
  request: Request,
) {
  response.cookies.set("aster_demo_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge,
  });
  return response;
}

export async function POST(request: Request) {
  if (process.env.DEMO_MODE === "false")
    return NextResponse.json(
      { error: "Demo mode is disabled" },
      { status: 404 },
    );
  const token = await demoToken();
  if (!token)
    return NextResponse.json(
      { error: "DEMO_SESSION_SECRET is not configured" },
      { status: 503 },
    );
  return setDemoCookie(
    NextResponse.json({
      mode: "synthetic_replay",
      organisation: "Aster Financial Group",
      synthetic: true,
    }),
    token,
    request,
  );
}

export async function GET(request: Request) {
  if (process.env.DEMO_MODE === "false")
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  const token = await demoToken();
  if (!token)
    return NextResponse.redirect(
      new URL("/auth/sign-in?error=demo-unavailable", request.url),
    );
  return setDemoCookie(
    NextResponse.redirect(new URL("/demo", request.url)),
    token,
    request,
  );
}
