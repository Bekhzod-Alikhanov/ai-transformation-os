import { notFound, redirect } from "next/navigation";

import {
  hasWorkspaceCapability,
  type WorkspaceCapability,
} from "./workspace-context";
import { getWorkspaceContext } from "./workspace-context.server";

export async function requireWorkspaceCapability(
  capability: WorkspaceCapability,
) {
  const workspace = await getWorkspaceContext();
  if (!workspace) redirect("/auth/sign-in");
  if (!hasWorkspaceCapability(workspace, capability)) notFound();
  return workspace;
}
