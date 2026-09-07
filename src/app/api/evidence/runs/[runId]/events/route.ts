import { agentEventApiHandlers } from "@/modules/evidence-review/agent-event-runtime.server";

type Context = { params: Promise<{ runId: string }> };

export async function GET(request: Request, context: Context) {
  return agentEventApiHandlers.list((await context.params).runId, request);
}
