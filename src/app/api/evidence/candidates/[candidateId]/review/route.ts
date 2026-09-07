import { evidenceReviewApiHandlers } from "@/modules/evidence-review/evidence-review-runtime.server";

type Context = { params: Promise<{ candidateId: string }> };

export async function POST(request: Request, context: Context) {
  return evidenceReviewApiHandlers.review(
    (await context.params).candidateId,
    request,
  );
}
