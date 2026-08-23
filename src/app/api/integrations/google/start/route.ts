import { NextResponse } from "next/server";
import { z } from "zod";

import { getRequestActor } from "@/modules/auth/request-actor";
import { GoogleConnectorContract } from "@/modules/integrations/google-contract";
import { createGoogleOAuthClient } from "@/modules/integrations/google-oauth";
import { createOAuthState } from "@/modules/integrations/oauth-state";

const querySchema = z.discriminatedUnion("connector", [
  z.object({
    connector: z.literal("gmail"),
    capability: z.enum(["read", "compose"]),
  }),
  z.object({
    connector: z.literal("calendar"),
    capability: z.enum(["read", "write"]),
  }),
]);

export async function GET(request: Request) {
  const actor = await getRequestActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  if (actor.synthetic)
    return NextResponse.json(
      { error: "Google OAuth is unavailable in Synthetic Replay" },
      { status: 409 },
    );
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    connector: url.searchParams.get("connector"),
    capability: url.searchParams.get("capability"),
  });
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid connector capability" },
      { status: 400 },
    );
  const oauth = createGoogleOAuthClient();
  const stateSecret = process.env.DEMO_SESSION_SECRET;
  if (!oauth || !stateSecret)
    return NextResponse.json(
      { error: "Google OAuth is not configured" },
      { status: 503 },
    );
  const state = createOAuthState(
    {
      organisationId: actor.organisationId,
      userId: actor.userId,
      connector: parsed.data.connector,
      capability: parsed.data.capability,
    },
    stateSecret,
  );
  const scopes =
    parsed.data.connector === "gmail"
      ? GoogleConnectorContract.scopes("gmail", parsed.data.capability)
      : GoogleConnectorContract.scopes("calendar", parsed.data.capability);
  const redirect = oauth.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: scopes,
    state,
  });
  return NextResponse.redirect(redirect);
}
