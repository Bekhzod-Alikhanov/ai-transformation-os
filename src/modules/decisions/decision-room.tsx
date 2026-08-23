"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { ControlTower } from "@/modules/control-tower/control-tower";
import { opportunities } from "@/modules/demo/aster-data";
import { formatPercent } from "@/lib/utils";

export function DecisionRoom() {
  const hero = opportunities[0]!;
  const [challenged, setChallenged] = useState(false);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
        <Surface className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[#e4e5df] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#65685f]">
                Investment decision · UC-014
              </p>
              <h2 className="mt-1 text-lg font-semibold">{hero.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="condition">Conditional go</Badge>
              <span className="text-xs font-semibold">
                {formatPercent(hero.committee?.consensusConfidence ?? 0)}{" "}
                confidence
              </span>
            </div>
          </div>
          <div className="grid gap-px bg-[#e5e6e0] sm:grid-cols-3">
            {[
              [
                CircleDollarSign,
                "Economics",
                "$1.1M risk-adjusted",
                "Positive",
              ],
              [ShieldCheck, "Risk", "39 / 100", "Conditions"],
              [Users, "Adoption", "54 / 100", "Challenge"],
            ].map(([Icon, label, value, status]) => (
              <div className="bg-white p-5" key={String(label)}>
                <Icon className="size-4 text-[#3157d5]" />
                <p className="mt-3 text-[11px] uppercase tracking-[0.1em] text-[#65685f]">
                  {label as string}
                </p>
                <p className="mt-2 text-lg font-semibold">{value as string}</p>
                <p className="mt-1 text-[11px] text-[#65685f]">
                  {status as string}
                </p>
              </div>
            ))}
          </div>
          <div className="p-5">
            <div className="grid gap-3 md:grid-cols-3">
              {hero.committee?.specialists.map((specialist) => (
                <div
                  className="rounded-md border border-[#e1e2dc] p-3"
                  key={specialist.name}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{specialist.name}</p>
                    <span className="text-xs font-semibold">
                      {specialist.score}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-[#6d7067]">
                    {specialist.rationale}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-[#e4e5df] bg-[#fafaf7] p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#62655d]">
              Orchestrator proposal is constrained by evidence, risk, and
              economics policy gates.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setChallenged(true)}
                size="sm"
                variant="secondary"
              >
                <Scale className="size-3.5" />
                Challenge business case
              </Button>
              <Button size="sm">
                Record decision <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
          {challenged ? (
            <div
              aria-live="polite"
              className="border-t border-[#ead9ae] bg-[#fffaf0] p-5"
            >
              <p className="flex items-center gap-2 text-sm font-semibold text-[#8a641b]">
                <AlertTriangle className="size-4" />
                CFO Red Team reduced confidence from 82% to 68%
              </p>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-[#706039]">
                <li>
                  • Only 47% of released capacity is demonstrably redeployable.
                </li>
                <li>
                  • Adoption sensitivity creates a $380K downside at the P10
                  case.
                </li>
                <li>
                  • Benefits depend on three source-system entitlements not yet
                  tested live.
                </li>
              </ul>
            </div>
          ) : null}
        </Surface>
        <div className="space-y-5">
          <Surface className="p-5">
            <Bot className="size-5 text-[#3157d5]" />
            <h2 className="mt-3 text-sm font-semibold">
              Committee run complete
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#6d7067]">
              6 independent specialist steps · 1 retry · $3.26 estimated model
              cost
            </p>
            <div className="mt-4 space-y-2 text-xs">
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-[#21806a]" />
                All schemas validated
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-[#21806a]" />
                Every material claim cited
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-[#21806a]" />
                No action tools exposed
              </p>
            </div>
          </Surface>
          <Surface className="p-5">
            <h2 className="text-sm font-semibold">Hard policy gates</h2>
            <div className="mt-4 space-y-3 text-xs">
              {[
                ["Evidence coverage ≥ 60%", "Passed"],
                ["Risk score < 75", "Passed"],
                ["Three-year NPV > 0", "Passed"],
                ["Adoption plan approved", "Condition"],
              ].map(([label, result]) => (
                <div className="flex justify-between" key={label}>
                  <span>{label}</span>
                  <Badge tone={result === "Passed" ? "value" : "condition"}>
                    {result}
                  </Badge>
                </div>
              ))}
            </div>
            <Link
              className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#3157d5]"
              href="/use-cases/client-status-reporting"
            >
              Inspect full case <ArrowRight className="size-3" />
            </Link>
          </Surface>
        </div>
      </div>
      <ControlTower />
    </div>
  );
}
