"use client";

import {
  CalendarDays,
  Check,
  FileText,
  Link2,
  LockKeyhole,
  Mail,
  PlugZap,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { integrations } from "@/modules/demo/aster-data";

const icons = { files: FileText, gmail: Mail, calendar: CalendarDays };

export function IntegrationsHub() {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((integration) => {
          const Icon = icons[integration.id as keyof typeof icons] ?? PlugZap;
          const operational = integration.state === "connected";
          const connectable = integration.state === "available";
          return (
            <Surface className="p-5" key={integration.id}>
              <div className="flex items-start justify-between">
                <span className="grid size-10 place-items-center rounded-md border border-[#dedfd9] bg-[#fafaf7]">
                  <Icon className="size-5 text-[#55584f]" />
                </span>
                <Badge
                  tone={
                    operational
                      ? "value"
                      : connectable
                        ? "action"
                        : integration.state === "disabled"
                          ? "risk"
                          : "neutral"
                  }
                >
                  {operational
                    ? "Connected"
                    : connectable
                      ? "Available"
                      : integration.state === "disabled"
                        ? "Disabled"
                        : "Adapter only"}
                </Badge>
              </div>
              <h2 className="mt-4 text-sm font-semibold">{integration.name}</h2>
              <p className="mt-1 text-xs leading-5 text-[#6d7067]">
                {integration.detail}
              </p>
              <div className="mt-4 border-t border-[#ecece7] pt-4">
                {operational ? (
                  <Button
                    onClick={() =>
                      setMessage(`${integration.name} sync queued`)
                    }
                    size="sm"
                    variant="secondary"
                  >
                    <RefreshCw className="size-3.5" />
                    Sync now
                  </Button>
                ) : connectable ? (
                  <Button
                    onClick={() =>
                      setMessage(
                        `${integration.name} OAuth uses incremental scopes; credentials are not configured in replay mode`,
                      )
                    }
                    size="sm"
                  >
                    <Link2 className="size-3.5" />
                    Connect
                  </Button>
                ) : (
                  <Button disabled size="sm" variant="secondary">
                    <LockKeyhole className="size-3.5" />
                    {integration.state === "disabled"
                      ? "Disabled"
                      : "Not configured"}
                  </Button>
                )}
              </div>
            </Surface>
          );
        })}
      </div>
      <aside className="space-y-5">
        <Surface className="p-5">
          <ShieldCheck className="size-5 text-[#3157d5]" />
          <h2 className="mt-3 text-sm font-semibold">Credential controls</h2>
          <ul className="mt-4 space-y-2 text-xs leading-5 text-[#60635b]">
            <li className="flex gap-2">
              <Check className="mt-0.5 size-3.5 text-[#21806a]" />
              AES-256-GCM envelope with key versioning
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 size-3.5 text-[#21806a]" />
              Server-side decryption only
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 size-3.5 text-[#21806a]" />
              Incremental Google scopes
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 size-3.5 text-[#21806a]" />
              Verified channel and webhook tokens
            </li>
          </ul>
        </Surface>
        {message ? (
          <Surface className="border-[#cdd5f3] bg-[#f7f8ff] p-4">
            <p aria-live="polite" className="text-xs leading-5 text-[#45558e]">
              {message}
            </p>
          </Surface>
        ) : null}
        <Surface className="p-5">
          <h2 className="text-sm font-semibold">Google production note</h2>
          <p className="mt-2 text-xs leading-5 text-[#6d7067]">
            Gmail readonly and compose are restricted scopes and require Google
            verification for a public production deployment.
          </p>
        </Surface>
      </aside>
    </div>
  );
}
