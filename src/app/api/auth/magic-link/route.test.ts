import { vi } from "vitest";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe("magic-link authorization", () => {
  beforeEach(() => {
    process.env.BECK_AUTH_EMAIL = "beck@example.com";
    vi.mocked(createSupabaseServerClient).mockReset();
  });

  afterEach(() => {
    delete process.env.BECK_AUTH_EMAIL;
  });

  it("rejects an email that is not the designated Beck principal", async () => {
    const response = await POST(
      new Request("https://example.com/api/auth/magic-link", {
        method: "POST",
        body: JSON.stringify({ email: "ordinary@example.com" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  it("sends Beck a magic link without creating a new account", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { signInWithOtp },
    } as never);

    const response = await POST(
      new Request("https://example.com/api/auth/magic-link", {
        method: "POST",
        body: JSON.stringify({ email: "BECK@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "beck@example.com",
      options: {
        emailRedirectTo: "https://example.com/auth/callback",
        shouldCreateUser: false,
      },
    });
  });
});
