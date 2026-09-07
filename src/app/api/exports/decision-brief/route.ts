import { NextResponse } from "next/server";

import { getRequestActor } from "@/modules/auth/request-actor";
import { generateDecisionBrief } from "@/modules/exports/brief-document";

export async function GET() {
  const actor = await getRequestActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  if (!actor.synthetic)
    return NextResponse.json(
      { error: "This export is available only in the synthetic demo" },
      { status: 403 },
    );
  const bytes = await generateDecisionBrief();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition":
        'attachment; filename="aster-ai-decision-brief.pdf"',
      "cache-control": "private, no-store",
    },
  });
}
