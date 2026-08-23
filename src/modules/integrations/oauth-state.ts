import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const stateSchema = z.object({
  organisationId: z.string().uuid(),
  userId: z.string().min(1),
  connector: z.enum(["gmail", "calendar"]),
  capability: z.enum(["read", "compose", "write"]),
  nonce: z.string().min(16),
  expiresAt: z.number().int(),
});

export type OAuthState = z.infer<typeof stateSchema>;

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createOAuthState(
  input: Omit<OAuthState, "nonce" | "expiresAt">,
  secret: string,
  now = Date.now(),
) {
  if (Buffer.byteLength(secret) < 32)
    throw new Error("OAuth state secret must be at least 32 bytes");
  const payload = Buffer.from(
    JSON.stringify({
      ...input,
      nonce: randomBytes(18).toString("base64url"),
      expiresAt: now + 10 * 60 * 1_000,
    }),
  ).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyOAuthState(
  token: string,
  secret: string,
  now = Date.now(),
): OAuthState {
  const [payload, received] = token.split(".");
  if (!payload || !received) throw new Error("Invalid OAuth state");
  const expected = signature(payload, secret);
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  )
    throw new Error("Invalid OAuth state signature");
  const parsed = stateSchema.parse(
    JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
  );
  if (parsed.expiresAt <= now) throw new Error("OAuth state expired");
  return parsed;
}
