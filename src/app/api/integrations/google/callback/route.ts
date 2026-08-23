import { NextResponse } from "next/server";

import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { encryptIntegrationSecret } from "@/modules/integrations/secret-crypto";
import { createGoogleOAuthClient } from "@/modules/integrations/google-oauth";
import { verifyOAuthState } from "@/modules/integrations/oauth-state";
import { GoogleConnectorContract } from "@/modules/integrations/google-contract";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateToken = url.searchParams.get("state");
  const stateSecret = process.env.DEMO_SESSION_SECRET;
  const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  const oauth = createGoogleOAuthClient();
  const supabase = createSupabaseServiceClient();
  if (
    !code ||
    !stateToken ||
    !stateSecret ||
    !encryptionKey ||
    !oauth ||
    !supabase
  )
    return NextResponse.redirect(
      new URL("/integrations?error=oauth_not_configured", url.origin),
    );
  try {
    const state = verifyOAuthState(stateToken, stateSecret);
    const { tokens } = await oauth.getToken(code);
    if (!tokens.refresh_token)
      throw new Error("Google did not return a refresh token");
    const requestedScopes =
      state.connector === "gmail"
        ? GoogleConnectorContract.scopes(
            "gmail",
            state.capability === "compose" ? "compose" : "read",
          )
        : GoogleConnectorContract.scopes(
            "calendar",
            state.capability === "write" ? "write" : "read",
          );
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .upsert(
        {
          organisation_id: state.organisationId,
          provider: state.connector,
          status: "connected",
          scopes: requestedScopes,
          connected_by: state.userId,
          metadata: { incremental: true },
        },
        { onConflict: "organisation_id,provider" },
      )
      .select("id")
      .single();
    if (integrationError || !integration)
      throw new Error("Integration record could not be stored");
    const encrypted = encryptIntegrationSecret(
      JSON.stringify({
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        expiryDate: tokens.expiry_date,
      }),
      encryptionKey,
      1,
    );
    const { error: secretError } = await supabase
      .from("integration_secrets")
      .upsert({
        integration_id: integration.id,
        organisation_id: state.organisationId,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        auth_tag: encrypted.authTag,
        key_version: encrypted.keyVersion,
      });
    if (secretError)
      throw new Error("Encrypted integration secret could not be stored");
    return NextResponse.redirect(
      new URL(`/integrations?connected=${state.connector}`, url.origin),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/integrations?error=oauth_failed", url.origin),
    );
  }
}
