import type { ReactNode } from "react";
import { headers } from "next/headers";

import { getWorkspaceContext } from "@/modules/auth/workspace-context.server";
import { WorkspaceProvider } from "@/modules/auth/workspace-provider";

import { AppShell } from "./app-shell";

export async function WorkspaceShell({ children }: { children: ReactNode }) {
  if ((await headers()).get("x-assessment-surface") === "workbench")
    return children;
  const workspace = await getWorkspaceContext();
  if (!workspace) return children;
  return (
    <WorkspaceProvider workspace={workspace}>
      <AppShell workspace={workspace}>{children}</AppShell>
    </WorkspaceProvider>
  );
}
