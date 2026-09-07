import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  getRequestActor,
  type RequestActor,
} from "@/modules/auth/request-actor";

import { createConflictResolutionApiHandlers } from "./conflict-resolution-api";

export const conflictResolutionApiHandlers =
  createConflictResolutionApiHandlers({
    resolveActor: getRequestActor,
    resolve: async (actor: RequestActor, input) => {
      const client = createSupabaseServiceClient();
      if (!client) throw new Error("Evidence persistence is not configured");
      const result = await (
        client as unknown as {
          rpc(
            name: string,
            args: Record<string, unknown>,
          ): Promise<{ data: unknown; error: { message: string } | null }>;
        }
      ).rpc("resolve_claim_conflict", {
        target_organisation_id: actor.organisationId,
        actor_user_id: actor.userId,
        target_claim_key: input.claimKey,
        selected_evidence_id: input.selectedEvidenceId,
        resolution_rationale: input.rationale,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
  });
