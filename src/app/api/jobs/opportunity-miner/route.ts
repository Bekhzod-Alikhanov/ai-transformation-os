import { opportunityDraftApiHandlers } from "@/modules/opportunities/opportunity-draft-runtime.server";

// Compatibility endpoint for existing internal callers. It now uses the same
// actor-bound, conflict-safe persisted draft transition as the live UI.
export async function POST() {
  return opportunityDraftApiHandlers.mine();
}
