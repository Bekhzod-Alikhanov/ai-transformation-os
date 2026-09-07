import { sourceApiHandlers } from "@/modules/sources/source-runtime.server";

export async function POST(request: Request) {
  return sourceApiHandlers.create(request);
}
