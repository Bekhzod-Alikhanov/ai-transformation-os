"use client";

import { Check, KeyRound, LockKeyhole, Users } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

export function SettingsPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const members = [
    ["Maya Chen", "maya@aster.example", "Owner"],
    ["Jordan Wells", "jordan@aster.example", "Transformation lead"],
    ["Priya Nair", "priya@aster.example", "Approver"],
    ["Leo Martin", "leo@aster.example", "Analyst"],
  ];

  async function resetDemo() {
    setResetting(true);
    const response = await fetch("/api/demo/reset", { method: "POST" });
    setMessage(
      response.ok
        ? "Synthetic Aster data restored to the stable seed."
        : "Start an authorised demo session before resetting the seed.",
    );
    setResetting(false);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e4e5df] p-5">
            <div>
              <h2 className="text-lg font-semibold">Organisation and access</h2>
              <p className="mt-1 text-xs text-[#70736a]">
                Aster Financial Group · synthetic demonstration tenant
              </p>
            </div>
            <Button
              onClick={() =>
                setMessage(
                  "Invitation draft created. Configure Supabase Auth delivery to send it.",
                )
              }
              size="sm"
            >
              Invite member
            </Button>
          </div>
          <div className="divide-y divide-[#e7e8e2]">
            {members.map(([name, email, role]) => (
              <div
                className="grid gap-3 p-4 sm:grid-cols-[1fr_180px] sm:items-center"
                key={email}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded bg-[#e9edf9] text-xs font-semibold text-[#3157d5]">
                    {name!
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="mt-0.5 text-[11px] text-[#777a71]">{email}</p>
                  </div>
                </div>
                <select
                  aria-label={`${name} role`}
                  className="h-9 rounded-md border border-[#d9dad4] bg-white px-3 text-xs"
                  defaultValue={role}
                >
                  {[
                    "Owner",
                    "Admin",
                    "Transformation lead",
                    "Analyst",
                    "Approver",
                    "Viewer",
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Surface>
        <Surface className="p-5">
          <h2 className="text-lg font-semibold">Model routing configuration</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Fast path", "gpt-5.6-luna", "Extraction and tagging"],
              ["Standard", "gpt-5.6-terra", "Structured routine analysis"],
              ["Deep work", "gpt-5.6-sol", "Synthesis and redesign"],
            ].map(([tier, model, use]) => (
              <div
                className="rounded-md border border-[#e1e2dc] p-4"
                key={tier}
              >
                <Badge tone="action">{tier}</Badge>
                <p className="mt-3 font-mono text-xs font-semibold">{model}</p>
                <p className="mt-2 text-[11px] leading-4 text-[#70736a]">
                  {use}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-md border border-[#e1e2dc] bg-[#fafaf7] p-3">
            <div>
              <p className="text-xs font-semibold">Native multi-agent beta</p>
              <p className="mt-1 text-[11px] text-[#777a71]">
                Application-managed orchestration is the stable path.
              </p>
            </div>
            <Badge tone="neutral">Disabled</Badge>
          </div>
        </Surface>
      </div>
      <aside className="space-y-5">
        <Surface className="p-5">
          <Users className="size-5 text-[#3157d5]" />
          <h2 className="mt-3 text-sm font-semibold">Role model</h2>
          <p className="mt-2 text-xs leading-5 text-[#6d7067]">
            Owner, admin, transformation lead, analyst, approver, and viewer
            permissions are enforced in Postgres RLS.
          </p>
        </Surface>
        <Surface className="p-5">
          <LockKeyhole className="size-5 text-[#3157d5]" />
          <h2 className="mt-3 text-sm font-semibold">Security posture</h2>
          <div className="mt-4 space-y-2 text-xs">
            {[
              "Cross-tenant RLS enabled",
              "Private storage bucket",
              "Immutable approvals and audit",
              "Encrypted connector secrets",
            ].map((item) => (
              <p className="flex items-center gap-2" key={item}>
                <Check className="size-3.5 text-[#21806a]" />
                {item}
              </p>
            ))}
          </div>
        </Surface>
        <Surface className="p-5">
          <KeyRound className="size-5 text-[#3157d5]" />
          <h2 className="mt-3 text-sm font-semibold">Demo reset</h2>
          <p className="mt-2 text-xs leading-5 text-[#6d7067]">
            Reset restores stable Aster identifiers, synthetic evidence, cases,
            pilots, and pending approvals.
          </p>
          <Button
            className="mt-4 w-full"
            disabled={resetting}
            onClick={resetDemo}
            size="sm"
            variant="danger"
          >
            {resetting ? "Resetting…" : "Reset synthetic demo"}
          </Button>
          {message ? (
            <p
              aria-live="polite"
              className="mt-3 text-[11px] leading-4 text-[#6d7067]"
            >
              {message}
            </p>
          ) : null}
        </Surface>
      </aside>
    </div>
  );
}
