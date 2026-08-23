import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestActor } from "@/modules/auth/request-actor";
import { ScenarioPatchService } from "@/modules/control-tower/scenario-patch";

const requestSchema = z.object({ command: z.string().min(3).max(2_000) });

export async function POST(request: Request) {
  const actor = await getRequestActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid command" }, { status: 400 });
  try {
    const scenario = ScenarioPatchService.parse(parsed.data.command);
    return NextResponse.json({
      ...scenario,
      organisationId: actor.organisationId,
      engine: "deterministic",
      baseMutated: false,
      approvalCreated: scenario.requiresApproval,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unsupported command" },
      { status: 422 },
    );
  }
}
