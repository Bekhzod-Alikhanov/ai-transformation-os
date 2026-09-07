"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SignedUploadStorage = {
  uploadToSignedUrl(
    path: string,
    token: string,
    file: File,
    options: { contentType: string; upsert: false },
  ): Promise<{ data: unknown; error: { message: string } | null }>;
};

type UploadDependencies = {
  fetcher?: typeof fetch;
  storage?: SignedUploadStorage;
  acknowledgedInternalNonRegulated: boolean;
  aiProcessingConsent: boolean;
};

async function sha256Hex(file: File) {
  const bytes = await new Response(file).arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function responseJson(response: Response) {
  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      typeof body.error === "string" ? body.error : "Source upload failed",
    );
  }
  return body;
}

export async function uploadSourceFile(
  file: File,
  dependencies: UploadDependencies,
) {
  const fetcher = dependencies.fetcher ?? fetch;
  const createResponse = await fetcher("/api/evidence/sources", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      sha256: await sha256Hex(file),
      acknowledgedInternalNonRegulated:
        dependencies.acknowledgedInternalNonRegulated,
      aiProcessingConsent: dependencies.aiProcessingConsent,
    }),
  });
  const created = await responseJson(createResponse);
  const source = created.source as { id: string; storagePath: string };
  const upload = created.upload as { token: string };
  const storage =
    dependencies.storage ??
    createSupabaseBrowserClient()?.storage.from("enterprise-sources");
  if (!storage) throw new Error("Source Storage is not configured");
  const uploaded = await storage.uploadToSignedUrl(
    source.storagePath,
    upload.token,
    file,
    { contentType: file.type, upsert: false },
  );
  if (uploaded.error) throw new Error(uploaded.error.message);
  return responseJson(
    await fetcher(`/api/evidence/sources/${source.id}/complete`, {
      method: "POST",
    }),
  );
}
