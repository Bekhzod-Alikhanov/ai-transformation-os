import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import type {
  CreateSourceRecord,
  PersistedSourceCompletion,
  SourceRepository,
} from "./source-repository";
import {
  SourceService,
  SourceServiceError,
  type SourceObjectStore,
} from "./source-service";
import type {
  ExecutionReceipt,
  IngestionRun,
  Source,
  SourceItem,
} from "./source-types";

const ORGANISATION_ID = "10000000-0000-0000-0000-000000000001";
const SOURCE_ID = "20000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000001";
const NOW = "2026-08-28T12:00:00.000Z";

class InMemorySourceRepository implements SourceRepository {
  source: Source | null = null;
  items: SourceItem[] = [];
  run: IngestionRun | null = null;
  receipt: ExecutionReceipt | null = null;
  transitions: string[] = [];

  constructor(readonly organisationId: string) {}

  async create(record: CreateSourceRecord) {
    this.source = record;
    return record;
  }

  async deleteAwaitingUpload(sourceId: string) {
    if (
      this.source?.id === sourceId &&
      this.source.status === "awaiting_upload"
    ) {
      this.source = null;
      return true;
    }
    return false;
  }

  async beginIngestion(sourceId: string, run: IngestionRun) {
    if (this.source?.id !== sourceId) return null;
    this.run ??= run;
    return this.run;
  }

  async findPurgeReceipt(sourceId: string) {
    return this.receipt?.objectId === sourceId ? this.receipt : null;
  }

  async get(sourceId: string) {
    return this.source?.id === sourceId ? this.source : null;
  }

  async transition(
    sourceId: string,
    expected: Source["status"],
    next: Source["status"],
  ) {
    if (
      !this.source ||
      this.source.id !== sourceId ||
      this.source.status !== expected
    )
      return null;
    this.transitions.push(`${expected}->${next}`);
    this.source = { ...this.source, status: next };
    return this.source;
  }

  async fail(sourceId: string, errorCode: string, runId?: string) {
    if (!this.source || this.source.id !== sourceId) return null;
    this.transitions.push(`${this.source.status}->failed`);
    this.source = { ...this.source, status: "failed", failureCode: errorCode };
    if (this.run && (!runId || this.run.id === runId)) {
      this.run = { ...this.run, status: "failed", errorCode, completedAt: NOW };
    }
    return this.source;
  }

  async completeUpload(
    sourceId: string,
    completion: PersistedSourceCompletion,
  ) {
    if (!this.source || this.source.id !== sourceId) return null;
    if (this.source.status !== "parsing") {
      return { source: this.source, replayed: true };
    }
    this.source = { ...this.source, ...completion.source };
    this.items = completion.items;
    this.run = completion.run;
    return { source: this.source, replayed: false };
  }

  async purge(sourceId: string, receipt: ExecutionReceipt) {
    if (!this.source || this.source.id !== sourceId) return null;
    this.source = null;
    this.items = [];
    this.run = null;
    this.receipt = receipt;
    return receipt;
  }
}

class InMemoryObjectStore implements SourceObjectStore {
  objects = new Map<string, { bytes: Buffer; contentType: string }>();
  removed: string[] = [];

  async createSignedUploadUrl(path: string) {
    return { signedUrl: `https://storage.test/upload/${path}`, token: "token" };
  }

  async download(path: string) {
    return this.objects.get(path) ?? null;
  }

  async remove(path: string) {
    this.removed.push(path);
    this.objects.delete(path);
  }
}

function makeService(input?: {
  organisationId?: string;
  role?: "owner" | "analyst";
  signedUrlFails?: boolean;
  enqueueFails?: boolean;
}) {
  const repository = new InMemorySourceRepository(
    input?.organisationId ?? ORGANISATION_ID,
  );
  const storage = new InMemoryObjectStore();
  if (input?.signedUrlFails) {
    storage.createSignedUploadUrl = async () => {
      throw new Error("signing unavailable");
    };
  }
  const enqueued: Array<{
    organisationId: string;
    sourceId: string;
    idempotencyKey: string;
  }> = [];
  let enqueueAttempts = 0;
  const service = new SourceService({
    workspace: {
      organisationId: input?.organisationId ?? ORGANISATION_ID,
      role: input?.role ?? "owner",
      mode: "live",
      displayName: "Beck",
      capabilities: ["integrations"],
    },
    actorId: USER_ID,
    repository,
    storage,
    enqueue: async (event) => {
      enqueueAttempts += 1;
      if (input?.enqueueFails) throw new Error("queue unavailable");
      const idempotencyKey =
        "idempotencyKey" in event && typeof event.idempotencyKey === "string"
          ? event.idempotencyKey
          : event.sourceId;
      if (!enqueued.some((item) => item.idempotencyKey === idempotencyKey))
        enqueued.push({ ...event, idempotencyKey });
    },
    id: (() => {
      let index = 0;
      return () =>
        [
          SOURCE_ID,
          "30000000-0000-0000-0000-000000000001",
          "40000000-0000-0000-0000-000000000001",
        ][index++] ?? "50000000-0000-0000-0000-000000000001";
    })(),
    now: () => NOW,
  });
  return {
    service,
    repository,
    storage,
    enqueued,
    enqueueAttempts: () => enqueueAttempts,
  };
}

const textBytes = Buffer.from(
  "Observed cycle time: 8 hours\nOwner: Operations",
);
const textHash = createHash("sha256").update(textBytes).digest("hex");

async function createValidSource(service: SourceService) {
  return service.create({
    fileName: "baseline.txt",
    mimeType: "text/plain",
    sizeBytes: textBytes.length,
    sha256: textHash,
    acknowledgedInternalNonRegulated: true,
    aiProcessingConsent: true,
  });
}

describe("SourceService", () => {
  it("creates an organisation-scoped awaiting-upload source and signed URL", async () => {
    const { service, repository } = makeService();

    const result = await createValidSource(service);

    expect(result.source).toMatchObject({
      id: SOURCE_ID,
      organisationId: ORGANISATION_ID,
      status: "awaiting_upload",
      expectedMimeType: "text/plain",
      expectedSizeBytes: textBytes.length,
      expectedSha256: textHash,
      acknowledgedInternalNonRegulated: true,
      aiProcessingConsent: true,
    });
    expect(result.source.storagePath).toBe(
      `${ORGANISATION_ID}/${SOURCE_ID}.txt`,
    );
    expect(result.upload.signedUrl).toContain(
      `${ORGANISATION_ID}/${SOURCE_ID}.txt`,
    );
    expect(repository.organisationId).toBe(ORGANISATION_ID);
  });

  it("compensates a signed upload URL failure without an orphan source", async () => {
    const { service, repository } = makeService({ signedUrlFails: true });
    await expect(createValidSource(service)).rejects.toThrow(
      "signing unavailable",
    );
    expect(repository.source).toBeNull();
  });

  it.each([
    [false, true],
    [true, false],
  ])(
    "rejects extraction intake without both data acknowledgement and AI consent",
    async (acknowledgedInternalNonRegulated, aiProcessingConsent) => {
      const { service } = makeService();
      await expect(
        service.create({
          fileName: "baseline.txt",
          mimeType: "text/plain",
          sizeBytes: textBytes.length,
          sha256: textHash,
          acknowledgedInternalNonRegulated,
          aiProcessingConsent,
        }),
      ).rejects.toMatchObject({ code: "consent_required" });
    },
  );

  it.each([
    ["archive.zip", "application/zip", 12, textHash, "unsupported_file"],
    ["../baseline.txt", "text/plain", 12, textHash, "invalid_file_name"],
    ["baseline.txt", "text/plain", 0, textHash, "invalid_size"],
    ["baseline.txt", "text/plain", 12, "not-a-hash", "invalid_hash"],
  ])(
    "rejects unsupported or malformed create input",
    async (fileName, mimeType, sizeBytes, sha256, code) => {
      const { service } = makeService();
      await expect(
        service.create({
          fileName,
          mimeType,
          sizeBytes,
          sha256,
          acknowledgedInternalNonRegulated: true,
          aiProcessingConsent: true,
        }),
      ).rejects.toMatchObject({ code });
    },
  );

  it("validates uploaded bytes and persists parsed locators before enqueueing", async () => {
    const { service, repository, storage, enqueued } = makeService();
    const created = await createValidSource(service);
    storage.objects.set(created.source.storagePath!, {
      bytes: textBytes,
      contentType: "text/plain",
    });

    const result = await service.completeUpload(SOURCE_ID);

    expect(result).toMatchObject({ status: "queued", replayed: false });
    expect(repository.items).toHaveLength(1);
    expect(repository.items[0]).toMatchObject({
      organisationId: ORGANISATION_ID,
      sourceId: SOURCE_ID,
      contentHash: textHash,
      locator: { type: "text_line", startLine: 1, endLine: 2 },
    });
    expect(repository.run).toMatchObject({
      organisationId: ORGANISATION_ID,
      sourceId: SOURCE_ID,
      status: "queued",
    });
    expect(repository.transitions).toEqual([
      "awaiting_upload->validating",
      "validating->parsing",
    ]);
    expect(enqueued).toEqual([
      {
        organisationId: ORGANISATION_ID,
        sourceId: SOURCE_ID,
        idempotencyKey: `source-upload:${SOURCE_ID}`,
      },
    ]);
  });

  it.each([
    [Buffer.from("wrong"), "text/plain", "size_mismatch"],
    [textBytes, "text/markdown", "mime_mismatch"],
    [
      Buffer.from("Observed cycle time: 9 hours\nOwner: Operations"),
      "text/plain",
      "hash_mismatch",
    ],
  ])(
    "rejects a completed upload when storage metadata or bytes differ",
    async (bytes, contentType, code) => {
      const { service, repository, storage, enqueued } = makeService();
      const created = await createValidSource(service);
      storage.objects.set(created.source.storagePath!, { bytes, contentType });

      await expect(service.completeUpload(SOURCE_ID)).rejects.toMatchObject({
        code,
      });
      expect(repository.items).toEqual([]);
      expect(repository.source).toMatchObject({
        status: "failed",
        failureCode: code,
      });
      expect(repository.run).toMatchObject({
        status: "failed",
        errorCode: code,
      });
      expect(enqueued).toEqual([]);
    },
  );

  it("persists a failed run when parsing fails", async () => {
    const { service, repository, storage } = makeService();
    const bytes = Buffer.from("not a real pdf");
    const created = await service.create({
      fileName: "broken.pdf",
      mimeType: "application/pdf",
      sizeBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      acknowledgedInternalNonRegulated: true,
      aiProcessingConsent: true,
    });
    storage.objects.set(created.source.storagePath!, {
      bytes,
      contentType: "application/pdf",
    });
    await expect(service.completeUpload(SOURCE_ID)).rejects.toMatchObject({
      code: "parsing_failed",
    });
    expect(repository.run).toMatchObject({
      status: "failed",
      errorCode: "parsing_failed",
    });
  });

  it("persists enqueue failure on both the source and ingestion run", async () => {
    const { service, repository, storage } = makeService({
      enqueueFails: true,
    });
    const created = await createValidSource(service);
    storage.objects.set(created.source.storagePath!, {
      bytes: textBytes,
      contentType: "text/plain",
    });
    await expect(service.completeUpload(SOURCE_ID)).rejects.toMatchObject({
      code: "enqueue_failed",
    });
    expect(repository.source).toMatchObject({
      status: "failed",
      failureCode: "enqueue_failed",
    });
    expect(repository.run).toMatchObject({
      status: "failed",
      errorCode: "enqueue_failed",
    });
  });

  it("makes duplicate completion replay-safe and enqueues exactly once", async () => {
    const { service, storage, enqueued, enqueueAttempts } = makeService();
    const created = await createValidSource(service);
    storage.objects.set(created.source.storagePath!, {
      bytes: textBytes,
      contentType: "text/plain",
    });

    const first = await service.completeUpload(SOURCE_ID);
    const replay = await service.completeUpload(SOURCE_ID);

    expect(first.replayed).toBe(false);
    expect(replay).toMatchObject({ status: "queued", replayed: true });
    expect(enqueued).toHaveLength(1);
    expect(enqueueAttempts()).toBe(2);
  });

  it("resumes an interrupted validating lifecycle without creating duplicate records", async () => {
    const { service, repository, storage, enqueued } = makeService();
    const created = await createValidSource(service);
    repository.source = { ...created.source, status: "validating" };
    storage.objects.set(created.source.storagePath!, {
      bytes: textBytes,
      contentType: "text/plain",
    });

    await expect(service.completeUpload(SOURCE_ID)).resolves.toEqual({
      status: "queued",
      replayed: false,
    });
    expect(repository.transitions).toEqual(["validating->parsing"]);
    expect(repository.items).toHaveLength(1);
    expect(enqueued).toHaveLength(1);
  });

  it("returns only a source owned by the bound organisation", async () => {
    const { service } = makeService();
    await createValidSource(service);

    await expect(service.get(SOURCE_ID)).resolves.toMatchObject({
      organisationId: ORGANISATION_ID,
    });
    await expect(service.get("other-source")).rejects.toMatchObject({
      code: "source_not_found",
    });
  });

  it("allows only owners to purge source content and returns a content-free receipt", async () => {
    const owner = makeService();
    const created = await createValidSource(owner.service);
    owner.storage.objects.set(created.source.storagePath!, {
      bytes: textBytes,
      contentType: "text/plain",
    });
    await owner.service.completeUpload(SOURCE_ID);

    const receipt = await owner.service.purge(SOURCE_ID);

    expect(owner.storage.removed).toEqual([created.source.storagePath]);
    expect(owner.repository.source).toBeNull();
    expect(receipt).toEqual({
      id: "50000000-0000-0000-0000-000000000001",
      organisationId: ORGANISATION_ID,
      operation: "source.purged",
      objectType: "source",
      objectId: SOURCE_ID,
      status: "succeeded",
      createdAt: NOW,
      idempotencyKey: `source-purge:${ORGANISATION_ID}:${SOURCE_ID}`,
    });
    expect(JSON.stringify(receipt)).not.toContain("baseline");
    expect(JSON.stringify(receipt)).not.toContain(textHash);

    await expect(owner.service.purge(SOURCE_ID)).resolves.toEqual(receipt);
    expect(owner.storage.removed).toHaveLength(1);

    const analyst = makeService({ role: "analyst" });
    await createValidSource(analyst.service);
    await expect(analyst.service.purge(SOURCE_ID)).rejects.toEqual(
      new SourceServiceError("owner_required", "Owner role required"),
    );
  });
});
