import { opportunityDraftApiHandlers } from "@/modules/opportunities/opportunity-draft-runtime.server";

type Context = { params: Promise<{ draftId: string }> };

export async function PATCH(request: Request, context: Context) {
  return opportunityDraftApiHandlers.edit(
    (await context.params).draftId,
    request,
  );
}
