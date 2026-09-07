import { cookies } from "next/headers";

import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import type { OrganisationRole } from "@/modules/approvals/approval-service";

import { verifyDemoSession } from "./demo-session";
import {
  bootstrapLiveWorkspace,
  createSupabaseWorkspaceBootstrapRepository,
  isDesignatedBeckPrincipal,
  resolveExistingWorkspaceMembership,
  type AuthenticatedWorkspaceUser,
} from "./workspace-bootstrap";

export type RequestActor = {
  userId: string;
  organisationId: string;
  displayName: string;
  role: OrganisationRole;
  synthetic: boolean;
};

export async function resolveRequestActor(input: {
  authenticatedUser: AuthenticatedWorkspaceUser | null;
  demoToken?: string;
  demoSecret?: string;
  now?: number;
  isDesignatedPrincipal: (user: AuthenticatedWorkspaceUser) => boolean;
  resolveExistingMembership: (user: AuthenticatedWorkspaceUser) => Promise<{
    organisationId: string;
    displayName: string;
    role: OrganisationRole;
  } | null>;
  bootstrap: (user: AuthenticatedWorkspaceUser) => Promise<{
    organisationId: string;
    displayName: string;
    role: OrganisationRole;
  }>;
}): Promise<RequestActor | null> {
  if (input.authenticatedUser) {
    const workspace = input.isDesignatedPrincipal(input.authenticatedUser)
      ? await input.bootstrap(input.authenticatedUser)
      : await input.resolveExistingMembership(input.authenticatedUser);
    if (!workspace) return null;
    return {
      userId: input.authenticatedUser.id,
      organisationId: workspace.organisationId,
      displayName: workspace.displayName,
      role: workspace.role,
      synthetic: false,
    };
  }

  if (!input.demoToken || !input.demoSecret) return null;
  try {
    const session = verifyDemoSession(
      input.demoToken,
      input.demoSecret,
      input.now,
    );
    return {
      userId: `demo:${session.organisationId}`,
      organisationId: session.organisationId,
      displayName: "Demo Owner",
      role: session.role,
      synthetic: true,
    };
  } catch {
    return null;
  }
}

export async function getRequestActor(): Promise<RequestActor | null> {
  const store = await cookies();
  const demoToken = store.get("aster_demo_session")?.value;
  const demoSecret = process.env.DEMO_SESSION_SECRET;
  const supabase = await createSupabaseServerClient();
  const authenticatedUser = supabase
    ? (await supabase.auth.getUser()).data.user
    : null;

  return resolveRequestActor({
    authenticatedUser,
    demoToken,
    demoSecret,
    isDesignatedPrincipal: isDesignatedBeckPrincipal,
    resolveExistingMembership: async (user) => {
      const serviceClient = createSupabaseServiceClient();
      if (!serviceClient) return null;
      return resolveExistingWorkspaceMembership(serviceClient, user);
    },
    bootstrap: async (user) => {
      const serviceClient = createSupabaseServiceClient();
      if (!serviceClient)
        throw new Error("Workspace bootstrap service is not configured");
      return bootstrapLiveWorkspace(
        createSupabaseWorkspaceBootstrapRepository(serviceClient),
        user,
      );
    },
  });
}
