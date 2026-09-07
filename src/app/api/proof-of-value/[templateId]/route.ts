import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestActor } from "@/modules/auth/request-actor";
import {
  ProofOfValueService,
  proofTemplateIds,
} from "@/modules/proof-of-value/proof-of-value";

const bodySchema = z.object({
  mode: z.enum(["live", "synthetic_replay"]).default("synthetic_replay"),
  input: z.string().min(1).max(50_000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const actor = await getRequestActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  if (!actor.synthetic)
    return NextResponse.json(
      {
        error:
          "Proof-of-value templates are available only in the synthetic demo",
      },
      { status: 403 },
    );
  const { templateId } = await params;
  if (
    !proofTemplateIds.includes(templateId as (typeof proofTemplateIds)[number])
  )
    return NextResponse.json(
      { error: "Unknown proof-of-value template" },
      { status: 404 },
    );
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid proof-of-value input" },
      { status: 400 },
    );
  if (parsed.data.mode === "live" && actor.synthetic)
    return NextResponse.json(
      { error: "Live mode requires an authenticated enterprise tenant" },
      { status: 409 },
    );
  const result = await ProofOfValueService.run({
    templateId: templateId as (typeof proofTemplateIds)[number],
    mode: parsed.data.mode,
    input: parsed.data.input,
  });
  return NextResponse.json(result);
}
