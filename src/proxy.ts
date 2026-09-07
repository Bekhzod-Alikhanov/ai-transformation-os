import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/demo"]);

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/");
}

function sessionKinds(request: NextRequest) {
  const names = request.cookies.getAll().map(({ name }) => name);
  return {
    demo: names.includes("aster_demo_session"),
    authenticated: names.some(
      (name) => name.startsWith("sb-") && name.includes("auth-token"),
    ),
  };
}

export function proxy(request: NextRequest) {
  const sessions = sessionKinds(request);
  if (
    sessions.demo &&
    !sessions.authenticated &&
    !isPublicPath(request.nextUrl.pathname)
  ) {
    return NextResponse.redirect(new URL("/demo", request.url));
  }
  if (!isPublicPath(request.nextUrl.pathname) && !sessions.authenticated) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(signInUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
