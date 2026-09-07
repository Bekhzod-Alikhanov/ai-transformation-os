import type { ReactNode } from "react";

import { getWorkspaceContext } from "@/modules/auth/workspace-context.server";
import { WorkspaceProvider } from "@/modules/auth/workspace-provider";

import { AppShell } from "./app-shell";

export async function WorkspaceShell({ children }: { children: ReactNode }) {
  const workspace = await getWorkspaceContext();
  if (!workspace) return children;
  return (
    <WorkspaceProvider workspace={workspace}>
      <AppShell workspace={workspace}>{children}</AppShell>
    </WorkspaceProvider>
  );
}
