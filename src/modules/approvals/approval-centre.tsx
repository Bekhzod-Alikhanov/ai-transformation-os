"use client";

import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock3,
  FileCheck2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { approvals as seedApprovals } from "@/modules/demo/aster-data";

type Approval = (typeof seedApprovals)[number];

export function ApprovalCentre() {
  const [items, setItems] = useState<Approval[]>(seedApprovals);
  const [message, setMessage] = useState<string | null>(null);
  const pending = items.filter((item) => item.status === "pending");

  function decide(id: string, decision: "approved" | "rejected") {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: decision } : item,
      ),
    );
    setMessage(
      decision === "approved" ? "Approved for execution" : "Action rejected",
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <Surface className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e3e4de] p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#65685f]">
              Action queue
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">
              {pending.length} pending actions
            </h2>
          </div>
          <Badge tone="condition">
            <Clock3 className="mr-1 size-3" /> Human decision required
          </Badge>
        </div>

        {message ? (
          <div
            aria-live="polite"
            className="flex items-center gap-2 border-b border-[#b9ddd3] bg-[#eef8f4] px-5 py-3 text-sm font-medium text-[#176c59]"
          >
            <Check className="size-4" /> {message}
            <button
              aria-label="Dismiss message"
              className="ml-auto"
              onClick={() => setMessage(null)}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}

        <div className="divide-y divide-[#e7e8e2]">
          {pending.map((item) => (
            <article className="p-5" key={item.id}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge
                      tone={
                        item.risk === "high"
                          ? "risk"
                          : item.risk === "medium"
                            ? "condition"
                            : "value"
                      }
                    >
                      {item.risk} risk
                    </Badge>
                    <span className="text-[11px] text-[#65685f]">
                      Requested {item.age} ago by {item.requester}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#292b27]">
                    {item.action}
                  </h3>
                  <p className="mt-1 text-xs text-[#70736a]">
                    Target: {item.system}
                  </p>
                  <div className="mt-3 rounded-md border border-[#e1e2dc] bg-[#fafaf7] px-3 py-2.5 text-xs leading-5 text-[#5f625a]">
                    <span className="font-semibold text-[#333530]">
                      Reviewed payload
                    </span>
                    <br />
                    {item.payload}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    aria-label="Reject"
                    onClick={() => decide(item.id, "rejected")}
                    size="sm"
                    variant="secondary"
                  >
                    <X className="size-3.5" /> Reject
                  </Button>
                  <Button
                    aria-label="Approve"
                    onClick={() => decide(item.id, "approved")}
                    size="sm"
                  >
                    <Check className="size-3.5" /> Approve
                  </Button>
                </div>
              </div>
            </article>
          ))}
          {pending.length === 0 ? (
            <div className="grid min-h-52 place-items-center p-8 text-center">
              <div>
                <FileCheck2 className="mx-auto size-8 text-[#25806a]" />
                <p className="mt-3 text-sm font-semibold">Queue is clear</p>
                <p className="mt-1 text-xs text-[#65685f]">
                  Every proposed action has a recorded decision.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </Surface>

      <div className="space-y-5">
        <Surface className="p-5">
          <ShieldCheck className="size-5 text-[#3157d5]" />
          <h2 className="mt-3 text-sm font-semibold">Execution safeguards</h2>
          <p className="mt-1 text-xs leading-5 text-[#6f7269]">
            Before execution, the policy engine validates actor permission,
            revision, expiry, payload hash, and idempotency.
          </p>
          <ul className="mt-4 space-y-2 text-xs text-[#585b53]">
            {[
              "Immutable reviewed revision",
              "Exact payload execution",
              "Organisation-scoped credentials",
              "Append-only audit receipt",
            ].map((text) => (
              <li className="flex items-center gap-2" key={text}>
                <Check className="size-3.5 text-[#25806a]" />
                {text}
              </li>
            ))}
          </ul>
        </Surface>
        <Surface className="border-[#ead9ae] bg-[#fffaf0] p-5">
          <AlertTriangle className="size-5 text-[#a1701f]" />
          <h2 className="mt-3 text-sm font-semibold">Separate send approval</h2>
          <p className="mt-1 text-xs leading-5 text-[#766339]">
            Approving email content creates a Gmail draft only. Sending always
            requires a second explicit approval.
          </p>
          <button
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#8a641b]"
            type="button"
          >
            Review policy <ArrowRight className="size-3.5" />
          </button>
        </Surface>
      </div>
    </div>
  );
}
