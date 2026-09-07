import { cookies } from "next/headers";
import { vi } from "vitest";

import { createDemoSession } from "@/modules/auth/demo-session";
import { getRequestActor } from "@/modules/auth/request-actor";

import { POST } from "./route";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/modules/auth/request-actor", () => ({
  getRequestActor: vi.fn(),
}));

const secret = "a-secure-demo-secret-that-is-long-enough";
const issuedAt = 1_800_000_000_000;

describe("demo reset route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env.DEMO_SESSION_SECRET = secret;
    vi.mocked(getRequestActor).mockResolvedValue({
      userId: "demo:demo-organisation",
      organisationId: "demo-organisation",
      displayName: "Demo Owner",
      role: "owner",
      synthetic: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.DEMO_SESSION_SECRET;
  });

  it("sets an HTTPS reset cookie to only the remaining absolute TTL", async () => {
    const expiresAt = issuedAt + 24 * 60 * 60 * 1_000;
    vi.setSystemTime(expiresAt - 1_000);
    const set = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: () => ({
        value: createDemoSession(secret, issuedAt, "demo-organisation"),
      }),
      set,
    } as never);

    const response = await POST(
      new Request("https://example.com/api/demo/reset", { method: "POST" }),
    );

    expect(response.status).toBe(200);
    expect(set).toHaveBeenCalledWith(
      "aster_demo_session",
      expect.any(String),
      expect.objectContaining({ secure: true, maxAge: 1 }),
    );
  });
});
