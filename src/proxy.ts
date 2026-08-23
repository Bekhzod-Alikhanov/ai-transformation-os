import { NextResponse, type NextRequest } from "next/server";

import { createDemoSession } from "@/modules/auth/demo-session";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const secret = process.env.DEMO_SESSION_SECRET;
  if (
    process.env.DEMO_MODE !== "false" &&
    secret &&
    !request.cookies.has("aster_demo_session")
  ) {
    response.cookies.set("aster_demo_session", createDemoSession(secret), {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
