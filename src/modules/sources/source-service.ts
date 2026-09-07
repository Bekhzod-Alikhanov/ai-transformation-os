import { createHash, timingSafeEqual } from "node:crypto";

import type { WorkspaceContext } from "@/modules/auth/workspace-context";
import { parseSourceFile } from "@/modules/ingestion/parser";

import type { SourceRepository } from "./source-repository";
import type {
  ExecutionReceipt,
  IngestionRun,
  Source,
  SourceItem,
} from "./source-types";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const PARSER_VERSION = "2026.08.1";
const SUPPORTED_FILES = {
  ".pdf": { kind: "pdf", mime: "application/pdf" },
  ".docx": {
    kind: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  ".xlsx": {
    kind: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  ".csv": { kind: "csv", mime: "text/csv" },
  ".txt": { kind: "text", mime: "text/plain" },
  ".md": { kind: "markdown", mime: "text/markdown" },
  ".markdown": { kind: "markdown", mime: "text/markdown" },
} as const;

export type SourceObjectStore = {
  createSignedUploadUrl(
    path: string,
  ): Promise<{ signedUrl: string; token: string }>;
  download(
    path: string,
  ): Promise<{ bytes: Buffer; contentType: string } | null>;
  remove(path: string): Promise<void>;
};

export class SourceServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SourceServiceError";
  }
}

type Dependencies = {
  workspace: WorkspaceContext;
  actorId: string;
  repository: SourceRepository;
  storage: SourceObjectStore;
  enqueue: (event: {
    organisationId: string;
    sourceId: string;
    idempotencyKey: string;
  }) => Promise<void>;
  id?: () => string;
  now?: () => string;
};

function normalizedMime(value: string) {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function fileSuffix(fileName: string) {
  const match = /(?:^|[^.])(\.[a-z0-9]+)$/i.exec(fileName);
  return match?.[1]?.toLowerCase() ?? "";
}

function hashesEqual(expected: string, actual: string) {
  const expectedBytes = Buffer.from(expected, "hex");
  const actualBytes = Buffer.from(actual, "hex");
  return (
    expectedBytes.length === actualBytes.length &&
    timingSafeEqual(expectedBytes, actualBytes)
  );
}

export class SourceService {
  private readonly id: () => string;
  private readonly now: () => string;

  constructor(private readonly dependencies: Dependencies) {
    if (
      dependencies.repository.organisationId !==
      dependencies.workspace.organisationId
    ) {
      throw new SourceServiceError(
        "tenant_mismatch",
        "Repository organisation does not match workspace",
      );
    }
    this.id = dependencies.id ?? crypto.randomUUID;
    this.now = dependencies.now ?? (() => new Date().toISOString());
  }

  async create(input: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    acknowledgedInternalNonRegulated: boolean;
    aiProcessingConsent: boolean;
  }) {
    if (!input.acknowledgedInternalNonRegulated || !input.aiProcessingConsent) {
      throw new SourceServiceError(
        "consent_required",
        "Data acknowledgement and AI processing consent are required",
      );
    }
    if (
      !input.fileName ||
      input.fileName.includes("/") ||
      input.fileName.includes("\\") ||
      input.fileName.includes("..")
    ) {
      throw new SourceServiceError("invalid_file_name", "Invalid file name");
    }
    if (
      !Number.isSafeInteger(input.sizeBytes) ||
      input.sizeBytes <= 0 ||
      input.sizeBytes > MAX_UPLOAD_BYTES
    ) {
      throw new SourceServiceError("invalid_size", "Invalid upload size");
    }
    const sha256 = input.sha256.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(sha256)) {
      throw new SourceServiceError("invalid_hash", "Invalid SHA-256 digest");
    }
    const suffix = fileSuffix(input.fileName);
    const supported = SUPPORTED_FILES[suffix as keyof typeof SUPPORTED_FILES];
    if (!supported || normalizedMime(input.mimeType) !== supported.mime) {
      throw new SourceServiceError("unsupported_file", "Unsupported file type");
    }

    const sourceId = this.id();
    const timestamp = this.now();
    const storagePath = `${this.dependencies.workspace.organisationId}/${sourceId}${suffix}`;
    const source: Source = {
      id: sourceId,
      organisationId: this.dependencies.workspace.organisationId,
      kind: supported.kind,
      name: input.fileName,
      synthetic: this.dependencies.workspace.mode === "synthetic_replay",
      storagePath,
      status: "awaiting_upload",
      expectedSha256: sha256,
      expectedSizeBytes: input.sizeBytes,
      expectedMimeType: supported.mime,
      actualSha256: null,
      actualSizeBytes: null,
      actualMimeType: null,
      acknowledgedInternalNonRegulated: true,
      aiProcessingConsent: true,
      consentedAt: timestamp,
      createdBy: this.dependencies.actorId,
      createdAt: timestamp,
      completedAt: null,
      failureCode: null,
    };
    const created = await this.dependencies.repository.create(source);
    let upload: { signedUrl: string; token: string };
    try {
      upload =
        await this.dependencies.storage.createSignedUploadUrl(storagePath);
    } catch (error) {
      await this.dependencies.repository.deleteAwaitingUpload(sourceId);
      throw error;
    }
    return { source: created, upload };
  }

  async completeUpload(sourceId: string) {
    const source = await this.requireSource(sourceId);
    if (source.status === "queued") {
      await this.enqueueSource(source);
      return { status: source.status, replayed: true };
    }
    if (
      source.status !== "awaiting_upload" &&
      source.status !== "validating" &&
      source.status !== "parsing"
    ) {
      return { status: source.status, replayed: true };
    }
    if (
      !source.storagePath ||
      !source.expectedSha256 ||
      source.expectedSizeBytes === null ||
      !source.expectedMimeType
    ) {
      throw new SourceServiceError(
        "invalid_source_contract",
        "Source upload contract is incomplete",
      );
    }
    const timestamp = this.now();
    const run: IngestionRun = {
      id: this.id(),
      organisationId: source.organisationId,
      sourceId: source.id,
      status: "running",
      parserVersion: PARSER_VERSION,
      itemCount: 0,
      errorCode: null,
      startedAt: timestamp,
      completedAt: null,
      createdAt: timestamp,
    };
    const persistedRun = await this.dependencies.repository.beginIngestion(
      source.id,
      run,
    );
    if (!persistedRun)
      throw new SourceServiceError("source_not_found", "Source not found");
    let lifecycleStatus = source.status;
    if (lifecycleStatus === "awaiting_upload") {
      const validating = await this.dependencies.repository.transition(
        source.id,
        "awaiting_upload",
        "validating",
      );
      if (!validating) {
        const current = await this.requireSource(source.id);
        if (current.status !== "validating" && current.status !== "parsing") {
          return { status: current.status, replayed: true };
        }
        lifecycleStatus = current.status;
      } else {
        lifecycleStatus = "validating";
      }
    }

    let object: { bytes: Buffer; contentType: string };
    let contentType: string;
    let actualSha256: string;
    let parsed: Awaited<ReturnType<typeof parseSourceFile>>;
    try {
      const stored = await this.dependencies.storage.download(
        source.storagePath,
      );
      if (!stored)
        throw new SourceServiceError("upload_not_found", "Upload not found");
      object = stored;
      if (object.bytes.length !== source.expectedSizeBytes) {
        throw new SourceServiceError("size_mismatch", "Upload size mismatch");
      }
      contentType = normalizedMime(object.contentType);
      if (contentType !== source.expectedMimeType) {
        throw new SourceServiceError("mime_mismatch", "Upload MIME mismatch");
      }
      actualSha256 = createHash("sha256").update(object.bytes).digest("hex");
      if (!hashesEqual(source.expectedSha256, actualSha256)) {
        throw new SourceServiceError("hash_mismatch", "Upload hash mismatch");
      }
      if (lifecycleStatus !== "parsing") {
        const parsing = await this.dependencies.repository.transition(
          source.id,
          "validating",
          "parsing",
        );
        if (!parsing) {
          const current = await this.requireSource(source.id);
          if (current.status !== "parsing") {
            return { status: current.status, replayed: true };
          }
        }
      }
      parsed = await parseSourceFile({
        name: source.name,
        bytes: object.bytes,
      });
    } catch (error) {
      const failure =
        error instanceof SourceServiceError
          ? error
          : new SourceServiceError("parsing_failed", "Source parsing failed");
      await this.dependencies.repository.fail(
        source.id,
        failure.code,
        persistedRun.id,
      );
      throw failure;
    }

    const status = parsed.requiresOcr ? "requires_ocr" : "queued";
    const items: SourceItem[] = parsed.items.map((item) => ({
      id: this.id(),
      organisationId: source.organisationId,
      sourceId: source.id,
      content: item.content,
      contentHash: createHash("sha256").update(item.content).digest("hex"),
      locator: item.locator,
      createdAt: timestamp,
    }));
    const completedRun: IngestionRun = {
      ...persistedRun,
      status,
      itemCount: items.length,
      completedAt: timestamp,
    };
    const completion = await this.dependencies.repository.completeUpload(
      source.id,
      {
        source: {
          status,
          actualSha256,
          actualSizeBytes: object.bytes.length,
          actualMimeType: contentType,
          completedAt: timestamp,
        },
        items,
        run: completedRun,
      },
    );
    if (!completion)
      throw new SourceServiceError("source_not_found", "Source not found");
    if (status === "queued") {
      try {
        await this.enqueueSource(source);
      } catch {
        const failure = new SourceServiceError(
          "enqueue_failed",
          "Source enqueue failed",
        );
        await this.dependencies.repository.fail(
          source.id,
          failure.code,
          persistedRun.id,
        );
        throw failure;
      }
    }
    return { status: completion.source.status, replayed: completion.replayed };
  }

  async get(sourceId: string) {
    return this.requireSource(sourceId);
  }

  async purge(sourceId: string): Promise<ExecutionReceipt> {
    if (this.dependencies.workspace.role !== "owner") {
      throw new SourceServiceError("owner_required", "Owner role required");
    }
    const prior = await this.dependencies.repository.findPurgeReceipt(sourceId);
    if (prior) return prior;
    const source = await this.requireSource(sourceId);
    if (source.storagePath)
      await this.dependencies.storage.remove(source.storagePath);
    const receipt: ExecutionReceipt = {
      id: this.id(),
      organisationId: source.organisationId,
      operation: "source.purged",
      objectType: "source",
      objectId: source.id,
      status: "succeeded",
      idempotencyKey: `source-purge:${source.organisationId}:${source.id}`,
      createdAt: this.now(),
    };
    const persisted = await this.dependencies.repository.purge(
      source.id,
      receipt,
    );
    if (!persisted)
      throw new SourceServiceError("source_not_found", "Source not found");
    return persisted;
  }

  private async requireSource(sourceId: string) {
    const source = await this.dependencies.repository.get(sourceId);
    if (
      !source ||
      source.status === "purged" ||
      source.organisationId !== this.dependencies.workspace.organisationId
    ) {
      throw new SourceServiceError("source_not_found", "Source not found");
    }
    return source;
  }

  private enqueueSource(source: Source) {
    return this.dependencies.enqueue({
      organisationId: source.organisationId,
      sourceId: source.id,
      idempotencyKey: `source-upload:${source.id}`,
    });
  }
}
