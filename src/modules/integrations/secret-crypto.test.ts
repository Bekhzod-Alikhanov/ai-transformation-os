import { describe, expect, it } from "vitest";

import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "./secret-crypto";

describe("integration secret encryption", () => {
  const key = Buffer.alloc(32, 7).toString("base64");

  it("round-trips OAuth refresh tokens without storing plaintext", () => {
    const encrypted = encryptIntegrationSecret("refresh-token-value", key, 2);

    expect(encrypted.ciphertext).not.toContain("refresh-token-value");
    expect(encrypted.keyVersion).toBe(2);
    expect(decryptIntegrationSecret(encrypted, key)).toBe(
      "refresh-token-value",
    );
  });

  it("refuses to decrypt a tampered authentication tag", () => {
    const encrypted = encryptIntegrationSecret("refresh-token-value", key, 1);
    const tampered = {
      ...encrypted,
      authTag: Buffer.alloc(16, 1).toString("base64"),
    };

    expect(() => decryptIntegrationSecret(tampered, key)).toThrow();
  });
});
