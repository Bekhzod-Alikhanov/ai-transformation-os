import { NextResponse } from "next/server";
import { z } from "zod";

import { inngest } from "@/inngest/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  ApprovalService,
  type ApprovalRevision,
} from "@/modules/approvals/approval-service";
import { getRequestActor } from "@/modules/auth/request-actor";
import { approvals as demoApprovals } from "@/modules/demo/aster-data";

const decisionSchema = z.object({
  revision: z.number().int().positive(),
  decision: z.enum(["approve", "reject"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await getRequestActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const parsed = decisionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid approval decision" },
      { status: 400 },
    );
  const { id } = await params;

  let approval: ApprovalRevision | null = null;
  const supabase = createSupabaseServiceClient();
  if (actor.synthetic) {
    const demo = demoApprovals.find((item) => item.id === id);
    if (demo)
      approval = {
        id,
        organisationId: actor.organisationId,
        revision: 1,
        status: "pending",
        actionType: demo.action,
        payload: demo.payload,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000).toISOString(),
      };
  } else if (supabase) {
    const { data: approvalRow } = await supabase
      .from("approvals")
      .select(
        "id, organisation_id, current_revision, status, action_type, expires_at",
      )
      .eq("id", id)
      .eq("organisation_id", actor.organisationId)
      .maybeSingle();
    if (approvalRow) {
      const { data: revisionRow } = await supabase
        .from("approval_revisions")
        .select("payload")
        .eq("approval_id", id)
        .eq("revision", approvalRow.current_revision)
        .maybeSingle();
      if (revisionRow)
        approval = {
          id: approvalRow.id,
          organisationId: approvalRow.organisation_id,
          revision: approvalRow.current_revision,
          status: approvalRow.status,
          actionType: approvalRow.action_type,
          payload: revisionRow.payload,
          expiresAt: approvalRow.expires_at,
        } as ApprovalRevision;
    }
  }
  if (!approval)
    return NextResponse.json({ error: "Approval not found" }, { status: 404 });
  try {
    const receipt = ApprovalService.decide(approval, {
      actor: {
        id: actor.userId,
        organisationId: actor.organisationId,
        roles: [actor.role],
      },
      revision: parsed.data.revision,
      decision: parsed.data.decision,
      now: new Date(),
    });
    if (!actor.synthetic && supabase) {
      await supabase
        .from("approvals")
        .update({
          status: receipt.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organisation_id", actor.organisationId)
        .eq("current_revision", parsed.data.revision);
      if (receipt.status === "executing")
        await inngest.send({
          name: "approval/action.approved",
          data: {
            organisationId: actor.organisationId,
            approvalId: id,
            payloadHash: receipt.payloadHash,
            idempotencyKey: receipt.idempotencyKey,
          },
        });
    }
    return NextResponse.json({ ...receipt, synthetic: actor.synthetic });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Approval decision failed",
      },
      { status: 409 },
    );
  }
}
