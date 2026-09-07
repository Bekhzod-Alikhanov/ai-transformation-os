import { conflictResolutionApiHandlers } from "@/modules/evidence-review/conflict-resolution-runtime.server";

export async function POST(request: Request) {
  return conflictResolutionApiHandlers.resolve(request);
}
