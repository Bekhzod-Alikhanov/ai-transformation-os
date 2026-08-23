import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1_000;

export type DemoSession = {
  organisationId: "org-aster";
  role: "owner";
  synthetic: true;
  issuedAt: number;
  expiresAt: number;
};

function assertSecret(secret: string) {
  if (Buffer.byteLength(secret) < 32)
    throw new Error("Demo session secret must be at least 32 bytes");
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createDemoSession(secret: string, now = Date.now()) {
  assertSecret(secret);
  const session: DemoSession = {
    organisationId: "org-aster",
    role: "owner",
    synthetic: true,
    issuedAt: now,
    expiresAt: now + SESSION_LIFETIME_MS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyDemoSession(
  token: string,
  secret: string,
  now = Date.now(),
): DemoSession {
  assertSecret(secret);
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Invalid demo session signature");
  const expected = sign(payload, secret);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  )
    throw new Error("Invalid demo session signature");
  const session = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as DemoSession;
  if (
    session.organisationId !== "org-aster" ||
    session.role !== "owner" ||
    session.synthetic !== true
  )
    throw new Error("Invalid demo session claims");
  if (!Number.isFinite(session.expiresAt) || session.expiresAt <= now)
    throw new Error("Demo session expired");
  return session;
}
