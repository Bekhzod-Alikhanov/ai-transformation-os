import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";
import {
  getRequestActor,
  type RequestActor,
} from "@/modules/auth/request-actor";
import { workspaceContextForActor } from "@/modules/auth/workspace-context";

import { createSourceApiHandlers } from "./source-api";
import { SourceService } from "./source-service";
import {
  createSupabaseSourceObjectStore,
  createSupabaseSourceRepository,
} from "./supabase-source-repository";

function sourceServiceForActor(actor: RequestActor) {
  const client = createSupabaseServiceClient();
  if (!client) throw new Error("Source persistence is not configured");
  return new SourceService({
    workspace: workspaceContextForActor(actor),
    actorId: actor.userId,
    repository: createSupabaseSourceRepository(
      client as unknown as Parameters<typeof createSupabaseSourceRepository>[0],
      actor.organisationId,
    ),
    storage: createSupabaseSourceObjectStore(
      client as unknown as Parameters<
        typeof createSupabaseSourceObjectStore
      >[0],
      actor.organisationId,
    ),
    enqueue: async (event) => {
      await inngest.send({
        id: event.idempotencyKey,
        name: "evidence/source.uploaded",
        data: {
          organisationId: event.organisationId,
          sourceId: event.sourceId,
        },
      });
    },
  });
}

export const sourceApiHandlers = createSourceApiHandlers({
  resolveActor: getRequestActor,
  createService: sourceServiceForActor,
});
