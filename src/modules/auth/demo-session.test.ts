import {
  createDemoSession,
  resetDemoSession,
  resumeOrCreateDemoSession,
  verifyDemoSession,
} from "./demo-session";

const secret = "a-secure-demo-secret-that-is-long-enough";
const issuedAt = 1_800_000_000_000;
const organisationId = "5f1ffb2a-70c0-47b6-a771-c755c384dc5f";

describe("demo sessions", () => {
  it("creates and verifies an expiring organisation-scoped synthetic session", () => {
    const token = createDemoSession(secret, issuedAt, organisationId);
    const session = verifyDemoSession(token, secret, issuedAt + 1);

    expect(session.organisationId).toBe(organisationId);
    expect(session.role).toBe("owner");
    expect(session.synthetic).toBe(true);
    expect(session.expiresAt - session.issuedAt).toBe(24 * 60 * 60 * 1_000);
  });

  it("is valid immediately before 24 hours and expires at the boundary", () => {
    const token = createDemoSession(secret, issuedAt, organisationId);

    expect(() =>
      verifyDemoSession(token, secret, issuedAt + 24 * 60 * 60 * 1_000 - 1),
    ).not.toThrow();
    expect(() =>
      verifyDemoSession(token, secret, issuedAt + 24 * 60 * 60 * 1_000),
    ).toThrow(/expired/i);
  });

  it("resets only a valid demo while preserving its isolated organisation", () => {
    const token = createDemoSession(secret, issuedAt, organisationId);
    const resetAt = issuedAt + 60_000;

    const reset = verifyDemoSession(
      resetDemoSession(token, secret, resetAt),
      secret,
      resetAt,
    );

    expect(reset.organisationId).toBe(organisationId);
    expect(reset.issuedAt).toBe(resetAt);
    expect(reset.expiresAt).toBe(issuedAt + 24 * 60 * 60 * 1_000);
    expect(() =>
      resetDemoSession(token, secret, issuedAt + 24 * 60 * 60 * 1_000),
    ).toThrow(/expired/i);
  });

  it("can reset immediately before expiry without extending the absolute boundary", () => {
    const token = createDemoSession(secret, issuedAt, organisationId);
    const resetAt = issuedAt + 24 * 60 * 60 * 1_000 - 1;

    const reset = verifyDemoSession(
      resetDemoSession(token, secret, resetAt),
      secret,
      resetAt,
    );

    expect(reset.issuedAt).toBe(resetAt);
    expect(reset.expiresAt).toBe(issuedAt + 24 * 60 * 60 * 1_000);
    expect(() =>
      verifyDemoSession(
        resetDemoSession(token, secret, resetAt),
        secret,
        reset.expiresAt,
      ),
    ).toThrow(/expired/i);
  });

  it("resumes a valid tenant and replaces an expired tenant", () => {
    const token = createDemoSession(secret, issuedAt, organisationId);

    expect(
      resumeOrCreateDemoSession(
        token,
        secret,
        issuedAt + 1,
        () => "unused-organisation",
      ),
    ).toBe(token);

    const replacement = resumeOrCreateDemoSession(
      token,
      secret,
      issuedAt + 24 * 60 * 60 * 1_000,
      () => "replacement-organisation",
    );
    expect(
      verifyDemoSession(replacement, secret, issuedAt + 24 * 60 * 60 * 1_000)
        .organisationId,
    ).toBe("replacement-organisation");
  });

  it("rejects tampering", () => {
    const token = createDemoSession(secret, issuedAt, organisationId);
    expect(() => verifyDemoSession(`${token}x`, secret, issuedAt + 1)).toThrow(
      /signature/i,
    );
  });
});
