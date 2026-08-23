import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Gauge,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/ui/surface";
import { pilots } from "@/modules/demo/aster-data";
import { formatCompactCurrency, formatPercent, titleCase } from "@/lib/utils";

export function PilotPortfolio() {
  const focus = pilots[0]!;
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
      <div className="space-y-5">
        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e4e5df] p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777a71]">
                Gate attention
              </p>
              <h2 className="mt-1 text-lg font-semibold">{focus.name}</h2>
            </div>
            <Badge tone="condition">Scale with conditions</Badge>
          </div>
          <div className="grid gap-px bg-[#e5e6e0] sm:grid-cols-4">
            {[
              ["Phase", "Days 61–90"],
              [
                "Realised run-rate",
                formatCompactCurrency(focus.realisedRunRate),
              ],
              ["Adoption", formatPercent(focus.actualAdoption)],
              ["Cycle reduction", formatPercent(focus.actualCycleReduction)],
            ].map(([label, value]) => (
              <div className="bg-white p-5" key={label}>
                <p className="text-xs text-[#777a71]">{label}</p>
                <p
                  className="mt-2 text-xl font-semibold"
                  data-actual-adoption={label === "Adoption" ? true : undefined}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Gate
              label="User adoption"
              actual={focus.actualAdoption}
              target={focus.targetAdoption}
            />
            <Gate
              label="Cycle-time reduction"
              actual={focus.actualCycleReduction}
              target={focus.targetCycleReduction}
            />
          </div>
          <div className="border-t border-[#ead9ae] bg-[#fffaf0] px-5 py-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#8a641b]">
              <AlertTriangle className="size-4" />
              Adoption is 26 points below target
            </p>
            <p className="mt-1 text-xs leading-5 text-[#766339]">
              Continue for 30 days with manager-led onboarding, weekly usage
              reviews, and a 60% minimum re-test gate.
            </p>
          </div>
        </Surface>
        <Surface className="overflow-hidden">
          <div className="border-b border-[#e4e5df] p-5">
            <h2 className="text-lg font-semibold">Pilot portfolio</h2>
            <p className="mt-1 text-xs text-[#777a71]">
              Deterministic recommendations compare targets, measurements, risk,
              and economics.
            </p>
          </div>
          <div className="divide-y divide-[#e7e8e2]">
            {pilots.map((pilot) => (
              <div
                className="grid gap-3 p-4 md:grid-cols-[1fr_120px_150px] md:items-center"
                key={pilot.id}
              >
                <div>
                  <p className="text-sm font-semibold">{pilot.name}</p>
                  <p className="mt-1 text-[11px] text-[#777a71]">
                    Days {pilot.phase} ·{" "}
                    {formatCompactCurrency(pilot.realisedRunRate)} run-rate
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[#85887f]">
                    Adoption
                  </p>
                  <p className="mt-1 text-xs font-semibold">
                    {formatPercent(pilot.actualAdoption)} /{" "}
                    {formatPercent(pilot.targetAdoption)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Badge
                    tone={
                      pilot.recommendation === "scale"
                        ? "value"
                        : pilot.recommendation === "pause"
                          ? "risk"
                          : "condition"
                    }
                  >
                    {titleCase(pilot.recommendation)}
                  </Badge>
                  <ArrowRight className="size-4 text-[#8a8d84]" />
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>
      <aside className="space-y-5">
        <Surface className="p-5">
          <Gauge className="size-5 text-[#3157d5]" />
          <h2 className="mt-3 text-sm font-semibold">
            61–90 day decision gate
          </h2>
          <div className="mt-4 space-y-3">
            {[
              ["Quality threshold", "Passed", true],
              ["Risk controls", "Passed", true],
              ["Economics", "Passed", true],
              ["Adoption", "Missed", false],
            ].map(([label, result, pass]) => (
              <div
                className="flex items-center justify-between text-xs"
                key={String(label)}
              >
                <span>{label as string}</span>
                <span
                  className={`flex items-center gap-1 font-semibold ${pass ? "text-[#21806a]" : "text-[#a43d36]"}`}
                >
                  {pass ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <AlertTriangle className="size-3.5" />
                  )}
                  {result as string}
                </span>
              </div>
            ))}
          </div>
        </Surface>
        <Surface className="p-5">
          <Users className="size-5 text-[#3157d5]" />
          <h2 className="mt-3 text-sm font-semibold">Next actions</h2>
          <ul className="mt-4 space-y-3 text-xs leading-5 text-[#62655d]">
            <li>Owner: Service Operations</li>
            <li>Follow-up: 16 Sep 2026</li>
            <li>
              Conditions: manager adoption plan, usage instrumentation, weekly
              review
            </li>
          </ul>
          <button
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#3157d5]"
            type="button"
          >
            <CalendarDays className="size-3.5" />
            Open 90-day plan
          </button>
        </Surface>
      </aside>
    </div>
  );
}

function Gate({
  label,
  actual,
  target,
}: {
  label: string;
  actual: number;
  target: number;
}) {
  const passed = actual >= target;
  return (
    <div className="rounded-md border border-[#e1e2dc] p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <Badge tone={passed ? "value" : "risk"}>
          {passed ? "Passed" : "Below target"}
        </Badge>
      </div>
      <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-[#ecece7]">
        <div
          className={`h-full rounded-full ${passed ? "bg-[#25806a]" : "bg-[#b1781d]"}`}
          style={{ width: `${actual * 100}%` }}
        />
        <span
          className="absolute bottom-[-3px] top-[-3px] w-px bg-[#20221e]"
          style={{ left: `${target * 100}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between text-[11px] text-[#777a71]">
        <span>Actual {formatPercent(actual)}</span>
        <span>Target {formatPercent(target)}</span>
      </div>
    </div>
  );
}
