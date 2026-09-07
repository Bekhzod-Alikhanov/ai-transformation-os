import { describe, expect, it, vi } from "vitest";

import type { RequestActor } from "@/modules/auth/request-actor";

import { createSourceApiHandlers } from "./source-api";

const actor: RequestActor = {
  userId: "user-1",
  organisationId: "org-1",
  displayName: "Beck",
  role: "owner",
  synthetic: false,
};

function setup(resolvedActor: RequestActor | null = actor) {
  const service = {
    create: vi.fn().mockResolvedValue({
      source: { id: "source-1", status: "awaiting_upload" },
      upload: { signedUrl: "https://storage.test/upload", token: "token" },
    }),
    completeUpload: vi.fn().mockResolvedValue({
      status: "queued",
      replayed: false,
    }),
    get: vi.fn().mockResolvedValue({ id: "source-1", status: "queued" }),
    purge: vi.fn().mockResolvedValue({
      id: "receipt-1",
      operation: "source.purged",
    }),
  };
  return {
    service,
    handlers: createSourceApiHandlers({
      resolveActor: async () => resolvedActor,
      createService: vi.fn(() => service),
    }),
  };
}

describe("source intake API", () => {
  it("rejects unauthenticated source creation", async () => {
    const { handlers } = setup(null);
    const response = await handlers.create(
      new Request("http://local/api/evidence/sources", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("accepts JSON metadata and returns the signed-upload contract", async () => {
    const { handlers, service } = setup();
    const body = {
      fileName: "baseline.txt",
      mimeType: "text/plain",
      sizeBytes: 12,
      sha256: "a".repeat(64),
      acknowledgedInternalNonRegulated: true,
      aiProcessingConsent: true,
    };
    const response = await handlers.create(
      new Request("http://local/api/evidence/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      source: { id: "source-1", status: "awaiting_upload" },
      upload: { signedUrl: "https://storage.test/upload" },
    });
    expect(service.create).toHaveBeenCalledWith(body);
  });

  it("does not parse multipart file bodies on the server", async () => {
    const { handlers, service } = setup();
    const response = await handlers.create(
      new Request("http://local/api/evidence/sources", {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=test" },
        body: "--test--",
      }),
    );

    expect(response.status).toBe(415);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON metadata before it reaches persistence", async () => {
    const { handlers, service } = setup();
    const response = await handlers.create(
      new Request("http://local/api/evidence/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: "baseline.txt" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it("exposes stable completion, get, and owner purge operations", async () => {
    const { handlers, service } = setup();

    const completion = await handlers.complete("source-1");
    const get = await handlers.get("source-1");
    const purge = await handlers.purge("source-1");

    expect(completion.status).toBe(200);
    expect(get.status).toBe(200);
    expect(purge.status).toBe(200);
    expect(service.completeUpload).toHaveBeenCalledWith("source-1");
    expect(service.get).toHaveBeenCalledWith("source-1");
    expect(service.purge).toHaveBeenCalledWith("source-1");
  });
});
