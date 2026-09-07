import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  getRequestActor,
  type RequestActor,
} from "@/modules/auth/request-actor";

import { createEvidenceReviewApiHandlers } from "./evidence-review-api";
import { EvidenceReviewService } from "./evidence-review-service";
import { createSupabaseEvidenceReviewRepository } from "./supabase-evidence-review-repository";

function serviceForActor(actor: RequestActor) {
  const client = createSupabaseServiceClient();
  if (!client) throw new Error("Evidence persistence is not configured");
  return new EvidenceReviewService({
    organisationId: actor.organisationId,
    actorId: actor.userId,
    repository: createSupabaseEvidenceReviewRepository(
      client as unknown as Parameters<
        typeof createSupabaseEvidenceReviewRepository
      >[0],
      actor.organisationId,
      actor.userId,
    ),
  });
}

export const evidenceReviewApiHandlers = createEvidenceReviewApiHandlers({
  resolveActor: getRequestActor,
  createService: serviceForActor,
});
