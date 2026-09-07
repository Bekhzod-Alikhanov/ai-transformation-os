import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import type { OrganisationRole } from "@/modules/approvals/approval-service";

export const LIVE_ORGANISATION_NAME = "AI Transformation OS";
export const LIVE_ORGANISATION_SLUG = "ai-transformation-os";

export type AuthenticatedWorkspaceUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export type WorkspaceBootstrapRepository = {
  ensureOrganisation(input: {
    slug: string;
    name: string;
    isDemo: boolean;
  }): Promise<{ id: string; name: string }>;
  ensureProfile(input: {
    userId: string;
    displayName: string;
  }): Promise<{ displayName: string }>;
  findMembership(input: { organisationId: string; userId: string }): Promise<{
    organisationId: string;
    userId: string;
    role: OrganisationRole;
  } | null>;
  createMembership(input: {
    organisationId: string;
    userId: string;
    role: OrganisationRole;
  }): Promise<{
    organisationId: string;
    userId: string;
    role: OrganisationRole;
  }>;
};

function titleCase(value: string) {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function requestedDisplayName(user: AuthenticatedWorkspaceUser) {
  const metadataName = [
    user.user_metadata?.display_name,
    user.user_metadata?.full_name,
    user.user_metadata?.name,
  ].find((value): value is string =>
    Boolean(typeof value === "string" && value.trim()),
  );
  if (metadataName) return metadataName.trim();
  const emailName = user.email?.split("@")[0]?.trim();
  return emailName ? titleCase(emailName) : "Workspace Owner";
}

export async function bootstrapLiveWorkspace(
  repository: WorkspaceBootstrapRepository,
  user: AuthenticatedWorkspaceUser,
) {
  const organisation = await repository.ensureOrganisation({
    slug: LIVE_ORGANISATION_SLUG,
    name: LIVE_ORGANISATION_NAME,
    isDemo: false,
  });
  const profile = await repository.ensureProfile({
    userId: user.id,
    displayName: requestedDisplayName(user),
  });
  const membership =
    (await repository.findMembership({
      organisationId: organisation.id,
      userId: user.id,
    })) ??
    (await repository.createMembership({
      organisationId: organisation.id,
      userId: user.id,
      role: "owner",
    }));

  return {
    organisationId: organisation.id,
    organisationName: organisation.name,
    displayName: profile.displayName,
    role: membership.role,
  };
}

function dataOrThrow<T>(data: T | null, error: { message: string } | null) {
  if (error) throw new Error(`Workspace bootstrap failed: ${error.message}`);
  if (!data) throw new Error("Workspace bootstrap returned no data");
  return data;
}

export function createSupabaseWorkspaceBootstrapRepository(
  client: SupabaseClient<Database>,
): WorkspaceBootstrapRepository {
  return {
    async ensureOrganisation(input) {
      const { data, error } = await client
        .from("organisations")
        .upsert(
          { name: input.name, slug: input.slug, is_demo: input.isDemo },
          { onConflict: "slug" },
        )
        .select("id, name")
        .single();
      return dataOrThrow(data, error);
    },
    async ensureProfile(input) {
      const { error: upsertError } = await client
        .from("profiles")
        .upsert(
          { id: input.userId, display_name: input.displayName },
          { onConflict: "id", ignoreDuplicates: true },
        );
      if (upsertError)
        throw new Error(`Workspace bootstrap failed: ${upsertError.message}`);
      const { data, error } = await client
        .from("profiles")
        .select("display_name")
        .eq("id", input.userId)
        .single();
      const profile = dataOrThrow(data, error);
      return { displayName: profile.display_name ?? input.displayName };
    },
    async findMembership(input) {
      const { data, error } = await client
        .from("organisation_memberships")
        .select("organisation_id, user_id, role")
        .eq("organisation_id", input.organisationId)
        .eq("user_id", input.userId)
        .maybeSingle();
      if (error)
        throw new Error(`Workspace bootstrap failed: ${error.message}`);
      if (!data) return null;
      return {
        organisationId: data.organisation_id,
        userId: data.user_id,
        role: data.role,
      };
    },
    async createMembership(input) {
      const { data, error } = await client
        .from("organisation_memberships")
        .insert({
          organisation_id: input.organisationId,
          user_id: input.userId,
          role: input.role,
        })
        .select("organisation_id, user_id, role")
        .single();
      const membership = dataOrThrow(data, error);
      return {
        organisationId: membership.organisation_id,
        userId: membership.user_id,
        role: membership.role,
      };
    },
  };
}

export function isDesignatedBeckPrincipal(
  user: AuthenticatedWorkspaceUser,
  designated: { userId?: string; email?: string } = {
    userId: process.env.BECK_AUTH_USER_ID,
    email: process.env.BECK_AUTH_EMAIL,
  },
) {
  const designatedId = designated.userId?.trim();
  const designatedEmail = designated.email?.trim().toLowerCase();
  if (!designatedId && !designatedEmail) return false;
  if (designatedId && user.id !== designatedId) return false;
  if (designatedEmail && user.email?.trim().toLowerCase() !== designatedEmail)
    return false;
  return true;
}

export async function resolveExistingWorkspaceMembership(
  client: SupabaseClient<Database>,
  user: AuthenticatedWorkspaceUser,
) {
  const { data: membership, error: membershipError } = await client
    .from("organisation_memberships")
    .select("organisation_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError)
    throw new Error(`Workspace lookup failed: ${membershipError.message}`);
  if (!membership) return null;

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError)
    throw new Error(`Workspace lookup failed: ${profileError.message}`);

  return {
    organisationId: membership.organisation_id,
    displayName: profile?.display_name ?? requestedDisplayName(user),
    role: membership.role,
  };
}
