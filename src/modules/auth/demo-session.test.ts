import { createDemoSession, verifyDemoSession } from "./demo-session";

describe("demo sessions", () => {
  it("creates and verifies an expiring organisation-scoped synthetic session", () => {
    const token = createDemoSession(
      "a-secure-demo-secret-that-is-long-enough",
      1_800_000_000_000,
    );
    const session = verifyDemoSession(
      token,
      "a-secure-demo-secret-that-is-long-enough",
      1_800_000_000_001,
    );

    expect(session.organisationId).toBe("org-aster");
    expect(session.role).toBe("owner");
    expect(session.synthetic).toBe(true);
  });

  it("rejects tampering", () => {
    const token = createDemoSession(
      "a-secure-demo-secret-that-is-long-enough",
      1_800_000_000_000,
    );
    expect(() =>
      verifyDemoSession(
        `${token}x`,
        "a-secure-demo-secret-that-is-long-enough",
        1_800_000_000_001,
      ),
    ).toThrow(/signature/i);
  });
});
