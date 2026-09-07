"use client";

import {
  ArrowRight,
  CircleCheck,
  CircleDollarSign,
  Clock3,
  FileWarning,
  Radar,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { asterData } from "@/modules/demo/aster-data";
import { formatCompactCurrency } from "@/lib/utils";
import { useWorkspace } from "@/modules/auth/workspace-provider";

const metrics = [
  {
    label: "Value at stake",
    value: formatCompactCurrency(asterData.summary.valueAtStake),
    detail: "Risk-adjusted annual value",
    delta: "+$620K this month",
    icon: CircleDollarSign,
    tone: "value",
  },
  {
    label: "Realised run-rate",
    value: formatCompactCurrency(asterData.summary.realisedRunRate),
    detail: "Across six active pilots",
    delta: "74% of Q3 target",
    icon: TrendingUp,
    tone: "value",
  },
  {
    label: "Active initiatives",
    value: String(asterData.summary.activeInitiatives),
    detail: "6 pilots · 6 scale plans",
    delta: "3 gates due this week",
    icon: Radar,
    tone: "action",
  },
  {
    label: "Decisions required",
    value: String(asterData.summary.decisionsRequired),
    detail: "Across value, risk and delivery",
    delta: "Oldest waiting 2 hours",
    icon: FileWarning,
    tone: "condition",
  },
] as const;

const decisions = [
  {
    title: "Customer Support Copilot is below its adoption gate",
    context: "44% adoption vs 70% target · 61–90 day gate",
    recommendation: "Scale with conditions",
    tone: "condition" as const,
    href: "/pilots",
  },
  {
    title: "Client reporting case is ready for investment decision",
    context: "$1.1M risk-adjusted value · 68% committee confidence",
    recommendation: "Conditional go",
    tone: "action" as const,
    href: "/use-cases/client-status-reporting",
  },
  {
    title: "Autonomous trading recommendation breaches risk policy",
    context: "94/100 inherent risk · client-facing regulated decision",
    recommendation: "Stop",
    tone: "risk" as const,
    href: "/opportunities",
  },
] as const;

export function ExecutiveDashboard() {
  const workspace = useWorkspace();
  if (workspace.mode === "live") {
    return (
      <div className="mx-auto max-w-[1480px] space-y-5 pb-16">
        <Badge tone="action">Live workspace</Badge>
        <h1 className="text-3xl font-semibold tracking-[-0.045em] text-[#20221e] sm:text-[2.35rem]">
          Good morning, {workspace.displayName}.
        </h1>
        <Surface className="p-6">
          <h2 className="text-lg font-semibold">AI Transformation OS</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#686b62]">
            Connect evidence sources to begin building your live transformation
            portfolio. Synthetic Aster results remain isolated under /demo.
          </p>
        </Surface>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-[1480px] space-y-7 pb-16">
      <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone="value">Synthetic replay</Badge>
            <span className="text-xs text-[#65685f]">
              Data current to 22 Aug 2026 · 08:14 ET
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.045em] text-[#20221e] sm:text-[2.35rem]">
            Good morning, {workspace.displayName}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#686b62]">
            Three decisions can materially change Aster’s AI portfolio this
            week. Evidence quality is improving; pilot adoption needs attention.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#666960]">
          <span className="flex items-center gap-1.5 rounded-md border border-[#dcded7] bg-white px-3 py-2">
            <CircleCheck className="size-3.5 text-[#21806a]" /> 18 sources
            healthy
          </span>
          <span className="flex items-center gap-1.5 rounded-md border border-[#dcded7] bg-white px-3 py-2">
            <Clock3 className="size-3.5" /> Next sync 08:30
          </span>
        </div>
      </section>

      <section
        aria-label="Portfolio metrics"
        className="grid overflow-hidden rounded-lg border border-[#dedfd9] bg-white sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              className={`p-5 ${index ? "border-t border-[#e6e7e1] sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 xl:border-l" : ""}`}
              key={metric.label}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#6d7067]">
                  {metric.label}
                </p>
                <Icon className="size-4 text-[#666960]" strokeWidth={1.7} />
              </div>
              <p
                className="mt-4 text-[2rem] font-semibold leading-none tracking-[-0.045em]"
                data-metric-value
              >
                {metric.value}
              </p>
              <p className="mt-2 text-xs text-[#65685f]">{metric.detail}</p>
              <p
                className={`mt-4 text-[11px] font-semibold ${metric.tone === "value" ? "text-[#21806a]" : metric.tone === "condition" ? "text-[#8a641b]" : "text-[#3157d5]"}`}
              >
                {metric.delta}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <Surface className="overflow-hidden">
          <div className="flex items-start justify-between border-b border-[#e5e6e0] p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#65685f]">
                Executive agenda
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em]">
                Decisions that need your attention
              </h2>
            </div>
            <Link
              className="text-xs font-semibold text-[#3157d5] hover:underline"
              href="/decision-room"
            >
              Open decision room
            </Link>
          </div>
          <div className="divide-y divide-[#e8e9e3]">
            {decisions.map((decision, index) => (
              <Link
                className="group grid gap-4 p-5 transition-colors hover:bg-[#fafaf7] sm:grid-cols-[28px_1fr_auto] sm:items-center"
                href={decision.href}
                key={decision.title}
              >
                <span className="grid size-7 place-items-center rounded-full border border-[#dbdcd6] bg-[#f7f7f3] text-[11px] font-semibold text-[#686b62]">
                  0{index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold tracking-[-0.01em] text-[#282a26]">
                    {decision.title}
                  </span>
                  <span className="mt-1 block text-xs text-[#65685f]">
                    {decision.context}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={decision.tone}>{decision.recommendation}</Badge>
                  <ArrowRight className="size-4 text-[#a0a39a] transition-transform group-hover:translate-x-0.5 group-hover:text-[#3157d5]" />
                </span>
              </Link>
            ))}
          </div>
        </Surface>

        <Surface className="overflow-hidden">
          <div className="border-b border-[#e5e6e0] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#65685f]">
              Portfolio signal
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em]">
              Value versus execution readiness
            </h2>
          </div>
          <div className="p-5">
            <div className="relative h-[225px] border-b border-l border-[#dfe0da]">
              <span className="absolute -left-1 top-2 -translate-x-full text-[10px] text-[#65685f]">
                High
              </span>
              <span className="absolute -left-1 bottom-0 -translate-x-full text-[10px] text-[#65685f]">
                Low
              </span>
              <span className="absolute bottom-[-20px] left-0 text-[10px] text-[#65685f]">
                Evidence
              </span>
              <span className="absolute bottom-[-20px] right-0 text-[10px] text-[#65685f]">
                Ready
              </span>
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <span className="border-b border-r border-dashed border-[#e4e5df] bg-[#fffaf0]/40" />
                <span className="border-b border-dashed border-[#e4e5df] bg-[#eef8f4]/45" />
                <span className="border-r border-dashed border-[#e4e5df]" />
              </div>
              {asterData.opportunities.slice(0, 12).map((item) => (
                <span
                  aria-label={`${item.title}, ${formatCompactCurrency(item.annualValue)}`}
                  className="absolute -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-[#3157d5] shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
                  key={item.id}
                  role="img"
                  style={{
                    bottom: `${Math.max(8, item.score)}%`,
                    left: `${Math.max(8, Math.min(92, item.feasibility))}%`,
                    width: `${Math.max(9, Math.min(21, item.annualValue / 60_000))}px`,
                    height: `${Math.max(9, Math.min(21, item.annualValue / 60_000))}px`,
                    backgroundColor:
                      item.risk > 65
                        ? "#bb5148"
                        : item.classification === "quick_win"
                          ? "#23816b"
                          : "#3157d5",
                  }}
                  title={item.title}
                />
              ))}
            </div>
            <div className="mt-8 flex items-center justify-between text-[11px] text-[#6f7269]">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#23816b]" /> Quick wins
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#3157d5]" /> Strategic
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#bb5148]" /> Risk
                constrained
              </span>
            </div>
          </div>
        </Surface>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e5e6e0] p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#65685f]">
                Hero case
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                Client Status Reporting Automation
              </h2>
            </div>
            <Badge tone="action">Conditional go</Badge>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[#65685f]">Risk-adjusted value</p>
              <p className="mt-1 text-xl font-semibold">$1.1M</p>
              <p className="mt-1 text-[11px] text-[#a1433b]">
                Revised from $1.6M
              </p>
            </div>
            <div>
              <p className="text-xs text-[#65685f]">Evidence coverage</p>
              <p className="mt-1 text-xl font-semibold">86%</p>
              <p className="mt-1 text-[11px] text-[#21806a]">
                4 anchored sources
              </p>
            </div>
            <div>
              <p className="text-xs text-[#65685f]">Time to value</p>
              <p className="mt-1 text-xl font-semibold">5 mo</p>
              <p className="mt-1 text-[11px] text-[#3157d5]">
                90-day PoV ready
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-[#e5e6e0] bg-[#fafaf7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs text-[#65685f]">
              <Users className="size-4" /> 6 specialists · 2 substantive
              objections · 68% consensus
            </p>
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#3157d5] hover:underline"
              href="/use-cases/client-status-reporting"
            >
              Review opportunity <ArrowRight className="size-4" />
            </Link>
          </div>
        </Surface>

        <Surface className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#65685f]">
            Operating pulse
          </p>
          <h2 className="mt-1 text-lg font-semibold">Transformation health</h2>
          <div className="mt-5 space-y-4">
            {[
              ["Evidence quality", 82, "#21806a"],
              ["Pilot delivery", 73, "#3157d5"],
              ["Change adoption", 61, "#b1781d"],
              ["Control coverage", 88, "#21806a"],
            ].map(([label, score, color]) => (
              <div key={String(label)}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-[#686b62]">{label}</span>
                  <span className="font-semibold">{score}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#ecece7]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: String(color),
                      width: `${score}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </div>
  );
}
