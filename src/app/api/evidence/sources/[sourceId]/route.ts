import { sourceApiHandlers } from "@/modules/sources/source-runtime.server";

type Context = { params: Promise<{ sourceId: string }> };

export async function GET(_request: Request, context: Context) {
  return sourceApiHandlers.get((await context.params).sourceId);
}

export async function DELETE(_request: Request, context: Context) {
  return sourceApiHandlers.purge((await context.params).sourceId);
}
