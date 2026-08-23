import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedIntegrationSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
};

function decodeKey(encodedKey: string) {
  const key = Buffer.from(encodedKey, "base64");
  if (key.length !== 32)
    throw new Error("Integration encryption key must decode to 32 bytes");
  return key;
}

export function encryptIntegrationSecret(
  plaintext: string,
  encodedKey: string,
  keyVersion: number,
): EncryptedIntegrationSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", decodeKey(encodedKey), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion,
  };
}

export function decryptIntegrationSecret(
  secret: EncryptedIntegrationSecret,
  encodedKey: string,
) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    decodeKey(encodedKey),
    Buffer.from(secret.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
