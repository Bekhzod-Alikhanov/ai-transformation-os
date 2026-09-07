import type { RequestActor } from "@/modules/auth/request-actor";
import { z } from "zod";

import { SourceServiceError } from "./source-service";

type SourceOperations = {
  create(input: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    acknowledgedInternalNonRegulated: boolean;
    aiProcessingConsent: boolean;
  }): Promise<unknown>;
  completeUpload(sourceId: string): Promise<unknown>;
  get(sourceId: string): Promise<unknown>;
  purge(sourceId: string): Promise<unknown>;
};

type Dependencies = {
  resolveActor: () => Promise<RequestActor | null>;
  createService: (actor: RequestActor) => SourceOperations;
};

const sourceCreateInputSchema = z
  .object({
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
    sha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
    acknowledgedInternalNonRegulated: z.boolean(),
    aiProcessingConsent: z.boolean(),
  })
  .strict();

const errorStatuses: Record<string, number> = {
  consent_required: 422,
  invalid_file_name: 400,
  invalid_size: 400,
  invalid_hash: 400,
  unsupported_file: 415,
  upload_not_found: 404,
  source_not_found: 404,
  size_mismatch: 422,
  mime_mismatch: 422,
  hash_mismatch: 422,
  owner_required: 403,
};

function json(value: unknown, status = 200) {
  return Response.json(value, { status });
}

function errorResponse(error: unknown) {
  if (error instanceof SourceServiceError) {
    return json(
      { error: error.message, code: error.code },
      errorStatuses[error.code] ?? 400,
    );
  }
  return json({ error: "Source operation failed" }, 500);
}

async function withService(
  dependencies: Dependencies,
  operation: (service: SourceOperations) => Promise<Response>,
) {
  const actor = await dependencies.resolveActor();
  if (!actor) return json({ error: "Authentication required" }, 401);
  try {
    return await operation(dependencies.createService(actor));
  } catch (error) {
    return errorResponse(error);
  }
}

export function createSourceApiHandlers(dependencies: Dependencies) {
  return {
    async create(request: Request) {
      return withService(dependencies, async (service) => {
        if (
          request.headers.get("content-type")?.split(";", 1)[0] !==
          "application/json"
        ) {
          return json({ error: "JSON source metadata required" }, 415);
        }
        let input: unknown;
        try {
          input = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const parsed = sourceCreateInputSchema.safeParse(input);
        if (!parsed.success)
          return json(
            { error: "Invalid source metadata", code: "invalid_request" },
            400,
          );
        return json(await service.create(parsed.data), 201);
      });
    },
    complete(sourceId: string) {
      return withService(dependencies, async (service) =>
        json(await service.completeUpload(sourceId)),
      );
    },
    get(sourceId: string) {
      return withService(dependencies, async (service) =>
        json(await service.get(sourceId)),
      );
    },
    purge(sourceId: string) {
      return withService(dependencies, async (service) =>
        json(await service.purge(sourceId)),
      );
    },
  };
}
