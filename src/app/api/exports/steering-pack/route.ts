import { NextResponse } from "next/server";

import { getRequestActor } from "@/modules/auth/request-actor";
import { generateSteeringPack } from "@/modules/exports/steering-pack";

export async function GET() {
  const actor = await getRequestActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const bytes = await generateSteeringPack();
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "content-disposition":
        'attachment; filename="aster-ai-steering-pack.pptx"',
      "cache-control": "private, no-store",
    },
  });
}
