import { describe, expect, it, vi } from "vitest";

import { uploadSourceFile } from "./source-upload.client";

describe("uploadSourceFile", () => {
  it("creates metadata, uploads directly to signed Storage, then completes", async () => {
    const file = new File(["cycle time: 8 hours"], "baseline.txt", {
      type: "text/plain",
    });
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json(
          {
            source: {
              id: "source-1",
              storagePath: "org-1/source-1.txt",
            },
            upload: { token: "signed-token" },
          },
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ status: "queued", replayed: false }),
      );
    const uploadToSignedUrl = vi.fn().mockResolvedValue({
      data: { path: "org-1/source-1.txt" },
      error: null,
    });

    const result = await uploadSourceFile(file, {
      fetcher,
      storage: {
        uploadToSignedUrl,
      },
      acknowledgedInternalNonRegulated: true,
      aiProcessingConsent: true,
    });

    const createBody = JSON.parse(
      String((fetcher.mock.calls[0]?.[1] as RequestInit).body),
    ) as Record<string, unknown>;
    expect(createBody).toMatchObject({
      fileName: "baseline.txt",
      mimeType: "text/plain",
      sizeBytes: 19,
      acknowledgedInternalNonRegulated: true,
      aiProcessingConsent: true,
    });
    expect(createBody.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      "org-1/source-1.txt",
      "signed-token",
      file,
      { contentType: "text/plain", upsert: false },
    );
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "/api/evidence/sources/source-1/complete",
    );
    expect(result).toEqual({ status: "queued", replayed: false });
  });
});
