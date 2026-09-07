"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { WorkspaceContext } from "./workspace-context";

const WorkspaceReactContext = createContext<WorkspaceContext | null>(null);

export function WorkspaceProvider({
  children,
  workspace,
}: {
  children: ReactNode;
  workspace: WorkspaceContext;
}) {
  return (
    <WorkspaceReactContext.Provider value={workspace}>
      {children}
    </WorkspaceReactContext.Provider>
  );
}

export function useWorkspace() {
  const workspace = useContext(WorkspaceReactContext);
  if (!workspace)
    throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return workspace;
}
