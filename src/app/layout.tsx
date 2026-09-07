import type { Metadata } from "next";
import type { ReactNode } from "react";

import { WorkspaceShell } from "@/components/shell/workspace-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI Transformation OS",
    template: "%s · AI Transformation OS",
  },
  description: "Evidence-led enterprise AI transformation control room.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WorkspaceShell>{children}</WorkspaceShell>
      </body>
    </html>
  );
}
