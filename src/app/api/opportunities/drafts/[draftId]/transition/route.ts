import { opportunityDraftApiHandlers } from "@/modules/opportunities/opportunity-draft-runtime.server";

type Context = { params: Promise<{ draftId: string }> };

export async function POST(request: Request, context: Context) {
  return opportunityDraftApiHandlers.transition(
    (await context.params).draftId,
    request,
  );
}
