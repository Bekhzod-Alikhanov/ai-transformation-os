import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrganisationRole } from "@/modules/approvals/approval-service";

import { verifyDemoSession } from "./demo-session";

export const ASTER_ORGANISATION_ID = "00000000-0000-4000-8000-00000000a571";

export type RequestActor = {
  userId: string;
  organisationId: string;
  role: OrganisationRole;
  synthetic: boolean;
};

export async function getRequestActor(): Promise<RequestActor | null> {
  const store = await cookies();
  const demoToken = store.get("aster_demo_session")?.value;
  const demoSecret = process.env.DEMO_SESSION_SECRET;
  if (demoToken && demoSecret) {
    try {
      const session = verifyDemoSession(demoToken, demoSecret);
      return {
        userId: "aster-demo-owner",
        organisationId: ASTER_ORGANISATION_ID,
        role: session.role,
        synthetic: true,
      };
    } catch {
      return null;
    }
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("organisation_memberships")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    userId: user.id,
    organisationId: String(data.organisation_id),
    role: data.role as OrganisationRole,
    synthetic: false,
  };
}
