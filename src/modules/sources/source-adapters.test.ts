import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseSourceObjectStore,
  createSupabaseSourceRepository,
} from "./supabase-source-repository";
const ORG = "10000000-0000-0000-0000-000000000001";
const OTHER_ORG = "10000000-0000-0000-0000-000000000002";
const SOURCE = "20000000-0000-0000-0000-000000000001";

function sourceRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: SOURCE,
    organisation_id: ORG,
    integration_id: null,
    kind: "text",
    name: "baseline.txt",
    synthetic: false,
    storage_path: `${ORG}/${SOURCE}.txt`,
    status: "awaiting_upload",
    expected_sha256: "a".repeat(64),
    expected_size_bytes: 12,
    expected_mime_type: "text/plain",
    actual_sha256: null,
    actual_size_bytes: null,
    actual_mime_type: null,
    acknowledged_internal_non_regulated: true,
    ai_processing_consent: true,
    consented_at: "2026-08-28T12:00:00.000Z",
    completed_at: null,
    failure_code: null,
    metadata: {},
    created_by: "00000000-0000-0000-0000-000000000001",
    created_at: "2026-08-28T12:00:00.000Z",
    ...overrides,
  };
}

describe("Supabase source adapters", () => {
  it("scopes every source read by both organisation and source id", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: sourceRow(),
      error: null,
    });
    const query = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle,
    };
    const client = { from: vi.fn(() => query), rpc: vi.fn() };
    const repository = createSupabaseSourceRepository(client, ORG);

    await expect(repository.get(SOURCE)).resolves.toMatchObject({
      id: SOURCE,
      organisationId: ORG,
    });
    expect(query.eq).toHaveBeenNthCalledWith(1, "organisation_id", ORG);
    expect(query.eq).toHaveBeenNthCalledWith(2, "id", SOURCE);
  });

  it("rejects a service-role response that does not belong to its organisation", async () => {
    const query = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: sourceRow({ organisation_id: OTHER_ORG }),
        error: null,
      }),
    };
    const repository = createSupabaseSourceRepository(
      { from: vi.fn(() => query), rpc: vi.fn() },
      ORG,
    );

    await expect(repository.get(SOURCE)).rejects.toThrow(
      "Source tenant boundary violation",
    );
  });

  it("preserves nullable upload metadata for connector-backed legacy sources", async () => {
    const query = {
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: sourceRow({
          storage_path: null,
          expected_sha256: null,
          expected_size_bytes: null,
          expected_mime_type: null,
          actual_sha256: null,
          actual_size_bytes: null,
          actual_mime_type: null,
          consented_at: null,
          created_by: null,
        }),
        error: null,
      }),
    };
    const repository = createSupabaseSourceRepository(
      { from: vi.fn(() => query), rpc: vi.fn() },
      ORG,
    );

    await expect(repository.get(SOURCE)).resolves.toMatchObject({
      storagePath: null,
      expectedSha256: null,
      expectedSizeBytes: null,
      expectedMimeType: null,
      actualSha256: null,
      actualSizeBytes: null,
      actualMimeType: null,
      consentedAt: null,
      createdBy: null,
    });
  });

  it("passes the organisation to atomic completion and purge RPCs", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: { source: sourceRow({ status: "queued" }), replayed: false },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "receipt-id",
          organisation_id: ORG,
          operation: "source.purged",
          object_type: "source",
          object_id: SOURCE,
          status: "succeeded",
          idempotency_key: `source-purge:${ORG}:${SOURCE}`,
          created_at: "2026-08-28T12:00:00.000Z",
        },
        error: null,
      });
    const repository = createSupabaseSourceRepository(
      { from: vi.fn(), rpc },
      ORG,
    );
    const completion = {
      source: {
        status: "queued" as const,
        actualSha256: "a".repeat(64),
        actualSizeBytes: 12,
        actualMimeType: "text/plain",
        completedAt: "2026-08-28T12:00:00.000Z",
      },
      items: [],
      run: {
        id: "run-id",
        organisationId: ORG,
        sourceId: SOURCE,
        status: "queued" as const,
        parserVersion: "2026.08.1",
        itemCount: 0,
        errorCode: null,
        startedAt: null,
        completedAt: null,
        createdAt: "2026-08-28T12:00:00.000Z",
      },
    };

    await repository.completeUpload(SOURCE, completion);
    await repository.purge(SOURCE, {
      id: "receipt-id",
      organisationId: ORG,
      operation: "source.purged",
      objectType: "source",
      objectId: SOURCE,
      status: "succeeded",
      idempotencyKey: `source-purge:${ORG}:${SOURCE}`,
      createdAt: "2026-08-28T12:00:00.000Z",
    });

    expect(rpc.mock.calls[0]?.[1]).toMatchObject({
      target_organisation_id: ORG,
      target_source_id: SOURCE,
    });
    expect(rpc.mock.calls[1]?.[1]).toMatchObject({
      target_organisation_id: ORG,
      target_source_id: SOURCE,
    });
  });

  it("will not access Storage outside the bound organisation prefix", async () => {
    const bucket = {
      createSignedUploadUrl: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
    };
    const store = createSupabaseSourceObjectStore(
      { storage: { from: vi.fn(() => bucket) } },
      ORG,
    );

    await expect(store.download(`${OTHER_ORG}/${SOURCE}.txt`)).rejects.toThrow(
      "Storage tenant boundary violation",
    );
    expect(bucket.download).not.toHaveBeenCalled();
  });
});
