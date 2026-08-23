import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";
import { getRequestActor } from "@/modules/auth/request-actor";
import { parseSourceFile } from "@/modules/ingestion/parser";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const actor = await getRequestActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES)
    return NextResponse.json(
      { error: "File exceeds the 25 MB limit" },
      { status: 413 },
    );
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    const parsed = await parseSourceFile({ name: file.name, bytes });
    const sourceId = createHash("sha256")
      .update(bytes)
      .digest("hex")
      .slice(0, 24);
    if (!actor.synthetic)
      await inngest.send({
        name: "evidence/source.uploaded",
        data: { organisationId: actor.organisationId, sourceId },
      });
    return NextResponse.json({
      sourceId,
      synthetic: actor.synthetic,
      requiresOcr: parsed.requiresOcr,
      warnings: parsed.warnings,
      itemCount: parsed.items.length,
      preview: parsed.items.slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "File parsing failed" },
      { status: 422 },
    );
  }
}
