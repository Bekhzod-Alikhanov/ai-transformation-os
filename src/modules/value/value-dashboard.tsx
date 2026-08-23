"use client";

import { Download, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { pilots } from "@/modules/demo/aster-data";
import { cn, formatCompactCurrency, formatPercent } from "@/lib/utils";

const valueSeries = [
  { month: "Mar", target: 0.22, realised: 0.18 },
  { month: "Apr", target: 0.42, realised: 0.39 },
  { month: "May", target: 0.69, realised: 0.61 },
  { month: "Jun", target: 1.02, realised: 0.91 },
  { month: "Jul", target: 1.39, realised: 1.34 },
  { month: "Aug", target: 1.83, realised: 1.9 },
  { month: "Sep", target: 2.28, realised: null },
  { month: "Oct", target: 2.76, realised: null },
];

export function ValueDashboard() {
  return (
    <div className="space-y-5">
      <div className="grid overflow-hidden rounded-lg border border-[#dedfd9] bg-white sm:grid-cols-4">
        {[
          ["Realised run-rate", "$1.9M", "+$310K since July"],
          ["Validated cumulative", "$1.34M", "73% of annual target"],
          ["Forecast annual", "$2.8M", "P50 · 78% confidence"],
          ["Value leakage", "$420K", "Adoption is primary driver"],
        ].map(([label, value, detail], index) => (
          <div
            className={`p-5 ${index ? "border-t border-[#e5e6e0] sm:border-l sm:border-t-0" : ""}`}
            key={label}
          >
            <p className="text-xs text-[#777a71]">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              {value}
            </p>
            <p
              className={`mt-2 text-[11px] ${label === "Value leakage" ? "text-[#a43d36]" : "text-[#21806a]"}`}
            >
              {detail}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Surface className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777a71]">
                Value trajectory
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                Cumulative realised value
              </h2>
            </div>
            <Badge tone="value">
              <TrendingUp className="mr-1 size-3" />
              Ahead of plan
            </Badge>
          </div>
          <div className="mt-5 h-[300px]">
            <ResponsiveContainer height="100%" width="100%">
              <AreaChart
                data={valueSeries}
                margin={{ left: 0, right: 8, top: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="realised" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#25806a" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#25806a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#e8e9e3"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="month"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(value) => `$${value}M`}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #dedfd9",
                    borderRadius: 6,
                    boxShadow: "none",
                    fontSize: 12,
                  }}
                />
                <Area
                  dataKey="target"
                  fill="transparent"
                  name="Target"
                  stroke="#9ea29a"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  type="monotone"
                />
                <Area
                  dataKey="realised"
                  fill="url(#realised)"
                  name="Realised"
                  stroke="#25806a"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>
        <Surface className="p-5">
          <h2 className="text-sm font-semibold">Assurance summary</h2>
          <p className="mt-2 text-xs leading-5 text-[#6d7067]">
            Realised value is accepted only after the KPI source, baseline,
            period, and owner are verified.
          </p>
          <div className="mt-5 space-y-4">
            {[
              ["Source-backed", "94%"],
              ["Finance validated", "81%"],
              ["Recurring", "76%"],
              ["Cash-releasing", "42%"],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#ecece7]">
                  <div
                    className="h-full rounded-full bg-[#25806a]"
                    style={{ width: value }}
                  />
                </div>
              </div>
            ))}
          </div>
          <a
            className={cn(
              buttonVariants({ size: "sm", variant: "secondary" }),
              "mt-5 w-full",
            )}
            href="/api/exports/decision-brief"
          >
            <Download className="size-3.5" />
            Export value brief
          </a>
        </Surface>
      </div>
      <Surface className="overflow-hidden">
        <div className="border-b border-[#e4e5df] p-5">
          <h2 className="text-lg font-semibold">Pilot contribution</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-[#e5e6e0] bg-[#fafaf7] text-[10px] uppercase tracking-[0.12em] text-[#7b7e75]">
                <th className="px-5 py-3">Pilot</th>
                <th className="px-4 py-3">Run-rate</th>
                <th className="px-4 py-3">Adoption</th>
                <th className="px-4 py-3">Cycle reduction</th>
                <th className="px-5 py-3">Assurance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e7e8e2]">
              {pilots.map((pilot) => (
                <tr key={pilot.id}>
                  <td className="px-5 py-4 text-sm font-semibold">
                    {pilot.name}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {formatCompactCurrency(pilot.realisedRunRate)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {formatPercent(pilot.actualAdoption)}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    {formatPercent(pilot.actualCycleReduction)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      tone={
                        pilot.health === "on_track"
                          ? "value"
                          : pilot.health === "at_risk"
                            ? "risk"
                            : "condition"
                      }
                    >
                      {pilot.health === "on_track" ? "Validated" : "Review"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
}
