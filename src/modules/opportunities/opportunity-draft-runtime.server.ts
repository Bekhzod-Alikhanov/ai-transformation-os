import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  getRequestActor,
  type RequestActor,
} from "@/modules/auth/request-actor";

import { createOpportunityDraftApiHandlers } from "./opportunity-draft-api";
import { OpportunityDraftService } from "./opportunity-draft-service";
import { createSupabaseOpportunityDraftRepository } from "./supabase-opportunity-draft-repository";

function serviceForActor(actor: RequestActor) {
  const client = createSupabaseServiceClient();
  if (!client) throw new Error("Opportunity persistence is not configured");
  return new OpportunityDraftService({
    organisationId: actor.organisationId,
    actorId: actor.userId,
    repository: createSupabaseOpportunityDraftRepository(
      client as unknown as Parameters<
        typeof createSupabaseOpportunityDraftRepository
      >[0],
      actor.organisationId,
      actor.userId,
    ),
  });
}

export const opportunityDraftApiHandlers = createOpportunityDraftApiHandlers({
  resolveActor: getRequestActor,
  createService: serviceForActor,
});
