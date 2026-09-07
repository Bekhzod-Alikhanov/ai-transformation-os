import type {
  CompletionResult,
  CreateSourceRecord,
  PersistedSourceCompletion,
  SourceRepository,
} from "./source-repository";
import type { ExecutionReceipt, Source } from "./source-types";

type QueryResult = { data: unknown; error: { message: string } | null };
type QueryBuilder = {
  insert(value: unknown): QueryBuilder;
  update(value: unknown): QueryBuilder;
  select(value?: string): QueryBuilder;
  eq(column: string, value: string): QueryBuilder;
  single(): Promise<QueryResult>;
  maybeSingle(): Promise<QueryResult>;
};
type SupabaseLike = {
  from(table: string): QueryBuilder;
  rpc(name: string, args: Record<string, unknown>): Promise<QueryResult>;
};

type StorageBucketLike = {
  createSignedUploadUrl(
    path: string,
    options?: { upsert?: boolean },
  ): Promise<{
    data: { signedUrl: string; token: string } | null;
    error: { message: string } | null;
  }>;
  download(path: string): Promise<{
    data: Blob | null;
    error: { message: string } | null;
  }>;
  remove(paths: string[]): Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
};
type StorageClientLike = {
  storage: { from(bucket: string): StorageBucketLike };
};

type SourceRow = Record<string, unknown> & {
  id: string;
  organisation_id: string;
};

function assertNoError(result: QueryResult) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

function toSource(row: SourceRow): Source {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    kind: row.kind as Source["kind"],
    name: String(row.name),
    synthetic: Boolean(row.synthetic),
    storagePath: (row.storage_path as string | null) ?? null,
    status: row.status as Source["status"],
    expectedSha256: (row.expected_sha256 as string | null) ?? null,
    expectedSizeBytes:
      row.expected_size_bytes === null ? null : Number(row.expected_size_bytes),
    expectedMimeType: (row.expected_mime_type as string | null) ?? null,
    actualSha256: (row.actual_sha256 as string | null) ?? null,
    actualSizeBytes:
      row.actual_size_bytes === null ? null : Number(row.actual_size_bytes),
    actualMimeType: (row.actual_mime_type as string | null) ?? null,
    acknowledgedInternalNonRegulated: Boolean(
      row.acknowledged_internal_non_regulated,
    ),
    aiProcessingConsent: Boolean(row.ai_processing_consent),
    consentedAt: (row.consented_at as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: String(row.created_at),
    completedAt: (row.completed_at as string | null) ?? null,
    failureCode: (row.failure_code as string | null) ?? null,
  };
}

function sourceInsert(record: CreateSourceRecord) {
  return {
    id: record.id,
    organisation_id: record.organisationId,
    kind: record.kind,
    name: record.name,
    synthetic: record.synthetic,
    storage_path: record.storagePath,
    status: record.status,
    expected_sha256: record.expectedSha256,
    expected_size_bytes: record.expectedSizeBytes,
    expected_mime_type: record.expectedMimeType,
    actual_sha256: record.actualSha256,
    actual_size_bytes: record.actualSizeBytes,
    actual_mime_type: record.actualMimeType,
    acknowledged_internal_non_regulated:
      record.acknowledgedInternalNonRegulated,
    ai_processing_consent: record.aiProcessingConsent,
    consented_at: record.consentedAt,
    created_by: record.createdBy,
    created_at: record.createdAt,
    completed_at: record.completedAt,
    failure_code: record.failureCode,
    metadata: { version: 1 },
  };
}

function assertSourceTenant(source: Source, organisationId: string) {
  if (source.organisationId !== organisationId) {
    throw new Error("Source tenant boundary violation");
  }
  return source;
}

function toReceipt(row: Record<string, unknown>): ExecutionReceipt {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    operation: String(row.operation),
    objectType: String(row.object_type),
    objectId: String(row.object_id),
    status: row.status as ExecutionReceipt["status"],
    idempotencyKey: String(row.idempotency_key),
    createdAt: String(row.created_at),
  };
}

export function createSupabaseSourceRepository(
  client: SupabaseLike,
  organisationId: string,
): SourceRepository {
  return {
    organisationId,
    async create(record) {
      if (record.organisationId !== organisationId)
        throw new Error("Source tenant boundary violation");
      const result = await client
        .from("sources")
        .insert(sourceInsert(record))
        .select()
        .single();
      return assertSourceTenant(
        toSource(assertNoError(result) as SourceRow),
        organisationId,
      );
    },
    async get(sourceId) {
      const result = await client
        .from("sources")
        .select()
        .eq("organisation_id", organisationId)
        .eq("id", sourceId)
        .maybeSingle();
      const row = assertNoError(result) as SourceRow | null;
      return row ? assertSourceTenant(toSource(row), organisationId) : null;
    },
    async deleteAwaitingUpload(sourceId) {
      const result = await client.rpc("delete_awaiting_source", {
        target_organisation_id: organisationId,
        target_source_id: sourceId,
      });
      return Boolean(assertNoError(result));
    },
    async beginIngestion(sourceId, run) {
      const result = await client.rpc("begin_source_ingestion", {
        target_organisation_id: organisationId,
        target_source_id: sourceId,
        run_payload: ingestionRunPayload(run),
      });
      const row = assertNoError(result) as Record<string, unknown> | null;
      if (!row) return null;
      if (row.organisation_id !== organisationId || row.source_id !== sourceId)
        throw new Error("Ingestion run tenant boundary violation");
      return {
        id: String(row.id),
        organisationId: String(row.organisation_id),
        sourceId: String(row.source_id),
        status: row.status as import("./source-types").IngestionRun["status"],
        parserVersion: String(row.parser_version),
        itemCount: Number(row.item_count),
        errorCode: (row.error_code as string | null) ?? null,
        startedAt: (row.started_at as string | null) ?? null,
        completedAt: (row.completed_at as string | null) ?? null,
        createdAt: String(row.created_at),
      };
    },
    async findPurgeReceipt(sourceId) {
      const result = await client.rpc("find_source_purge_receipt", {
        target_organisation_id: organisationId,
        target_source_id: sourceId,
      });
      const row = assertNoError(result) as Record<string, unknown> | null;
      if (!row) return null;
      const receipt = toReceipt(row);
      if (
        receipt.organisationId !== organisationId ||
        receipt.objectId !== sourceId
      )
        throw new Error("Receipt tenant boundary violation");
      return receipt;
    },
    async transition(sourceId, expected, next) {
      const result = await client
        .from("sources")
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq("organisation_id", organisationId)
        .eq("id", sourceId)
        .eq("status", expected)
        .select()
        .maybeSingle();
      const row = assertNoError(result) as SourceRow | null;
      return row ? assertSourceTenant(toSource(row), organisationId) : null;
    },
    async fail(sourceId, errorCode, runId) {
      const result = await client.rpc("fail_source_ingestion", {
        target_organisation_id: organisationId,
        target_source_id: sourceId,
        target_run_id: runId ?? null,
        failure_code: errorCode,
      });
      const row = assertNoError(result) as SourceRow | null;
      return row ? assertSourceTenant(toSource(row), organisationId) : null;
    },
    async completeUpload(sourceId, completion) {
      const result = await client.rpc("complete_source_upload", {
        target_organisation_id: organisationId,
        target_source_id: sourceId,
        completion_payload: completionPayload(completion),
      });
      const value = assertNoError(result) as {
        source: SourceRow;
        replayed: boolean;
      } | null;
      if (!value) return null;
      return {
        source: assertSourceTenant(toSource(value.source), organisationId),
        replayed: value.replayed,
      } satisfies CompletionResult;
    },
    async purge(sourceId, receipt) {
      if (receipt.organisationId !== organisationId)
        throw new Error("Receipt tenant boundary violation");
      const result = await client.rpc("purge_source", {
        target_organisation_id: organisationId,
        target_source_id: sourceId,
        receipt_id: receipt.id,
        receipt_created_at: receipt.createdAt,
      });
      const row = assertNoError(result) as Record<string, unknown> | null;
      if (!row) return null;
      const persisted = toReceipt(row);
      if (persisted.organisationId !== organisationId)
        throw new Error("Receipt tenant boundary violation");
      return persisted;
    },
  };
}

function completionPayload(completion: PersistedSourceCompletion) {
  return {
    version: 1,
    source: {
      status: completion.source.status,
      actual_sha256: completion.source.actualSha256,
      actual_size_bytes: completion.source.actualSizeBytes,
      actual_mime_type: completion.source.actualMimeType,
      completed_at: completion.source.completedAt,
    },
    items: completion.items.map((item) => ({
      id: item.id,
      organisation_id: item.organisationId,
      source_id: item.sourceId,
      content: item.content,
      content_hash: item.contentHash,
      source_locator: item.locator,
      created_at: item.createdAt,
    })),
    run: ingestionRunPayload(completion.run),
  };
}

function ingestionRunPayload(run: PersistedSourceCompletion["run"]) {
  return {
    id: run.id,
    organisation_id: run.organisationId,
    source_id: run.sourceId,
    status: run.status,
    parser_version: run.parserVersion,
    item_count: run.itemCount,
    error_code: run.errorCode,
    started_at: run.startedAt,
    completed_at: run.completedAt,
    created_at: run.createdAt,
  };
}

export function createSupabaseSourceObjectStore(
  client: StorageClientLike,
  organisationId: string,
) {
  const bucket = client.storage.from("enterprise-sources");
  const assertPath = (path: string) => {
    if (!path.startsWith(`${organisationId}/`) || path.includes("..")) {
      throw new Error("Storage tenant boundary violation");
    }
  };
  return {
    async createSignedUploadUrl(path: string) {
      assertPath(path);
      const result = await bucket.createSignedUploadUrl(path, {
        upsert: false,
      });
      if (result.error || !result.data)
        throw new Error(result.error?.message ?? "Signed upload failed");
      return result.data;
    },
    async download(path: string) {
      assertPath(path);
      const result = await bucket.download(path);
      if (result.error) throw new Error(result.error.message);
      if (!result.data) return null;
      return {
        bytes: Buffer.from(await result.data.arrayBuffer()),
        contentType: result.data.type,
      };
    },
    async remove(path: string) {
      assertPath(path);
      const result = await bucket.remove([path]);
      if (result.error) throw new Error(result.error.message);
    },
  };
}
