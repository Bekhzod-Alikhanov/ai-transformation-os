import { opportunityDraftApiHandlers } from "@/modules/opportunities/opportunity-draft-runtime.server";

export async function POST() {
  return opportunityDraftApiHandlers.mine();
}
