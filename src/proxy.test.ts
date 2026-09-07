import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

function request(path: string, cookie?: string) {
  return new NextRequest(`https://example.test${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("workspace route boundary", () => {
  it("redirects a signed-out direct workspace route to sign in", () => {
    const response = proxy(request("/opportunities?view=mine"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://example.test/auth/sign-in?next=%2Fopportunities%3Fview%3Dmine",
    );
  });

  it.each(["/", "/auth/sign-in", "/demo"])(
    "keeps the public route %s reachable while signed out",
    (path) => {
      const response = proxy(request(path));

      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );

  it.each(["/opportunities", "/portfolio", "/integrations"])(
    "redirects a demo-only session from %s to the isolated replay",
    (path) => {
      const response = proxy(request(path, "aster_demo_session=signed-token"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "https://example.test/demo",
      );
    },
  );

  it("does not let a demo cookie override an authenticated session", () => {
    const response = proxy(
      request(
        "/opportunities",
        "aster_demo_session=signed-token; sb-project-auth-token.0=signed-token",
      ),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows a Supabase session to reach a workspace route", () => {
    const response = proxy(
      request("/opportunities", "sb-project-auth-token.0=signed-token"),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
