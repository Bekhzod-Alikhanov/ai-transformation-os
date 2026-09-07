import { sourceApiHandlers } from "@/modules/sources/source-runtime.server";

type Context = { params: Promise<{ sourceId: string }> };

export async function POST(_request: Request, context: Context) {
  return sourceApiHandlers.complete((await context.params).sourceId);
}
