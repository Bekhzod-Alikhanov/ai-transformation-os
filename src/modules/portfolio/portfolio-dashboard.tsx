"use client";

import { RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { opportunities } from "@/modules/demo/aster-data";
import {
  defaultPortfolioWeights,
  type PortfolioWeights,
} from "@/modules/portfolio/portfolio-scorer";
import { formatCompactCurrency, titleCase } from "@/lib/utils";

const labels: Record<keyof PortfolioWeights, string> = {
  strategicAlignment: "Strategic alignment",
  economicValue: "Economic value",
  userImpact: "User impact",
  feasibility: "Feasibility",
  dataReadiness: "Data readiness",
  timeToValue: "Time to value",
  changeReadiness: "Change readiness",
  risk: "Inverse risk",
};

export function PortfolioDashboard() {
  const [weights, setWeights] = useState(defaultPortfolioWeights);
  const [saved, setSaved] = useState(false);
  const total = useMemo(
    () => Object.values(weights).reduce((sum, value) => sum + value, 0),
    [weights],
  );
  const valid = Math.abs(total - 1) < 0.000_001;
  const classified = useMemo(() => {
    return [
      "quick_win",
      "big_bet",
      "strategic_enabler",
      "experiment",
      "defer",
      "stop",
    ].map((classification) => ({
      classification,
      items: opportunities.filter(
        (item) => item.classification === classification,
      ),
    }));
  }, []);

  function updateWeight(key: keyof PortfolioWeights, percent: number) {
    setWeights((current) => ({ ...current, [key]: percent / 100 }));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
      <Surface className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e4e5df] p-5">
          <div>
            <h2 className="text-lg font-semibold">Classification map</h2>
            <p className="mt-1 text-xs text-[#70736a]">
              Transparent rules separate prioritisation from evidence
              sufficiency.
            </p>
          </div>
          <Badge tone="neutral">Rules v1.3</Badge>
        </div>
        <div className="grid gap-px bg-[#e5e6e0] sm:grid-cols-2 lg:grid-cols-3">
          {classified.map(({ classification, items }) => (
            <section className="min-h-56 bg-white p-4" key={classification}>
              <div className="flex items-center justify-between">
                <Badge
                  tone={
                    classification === "stop"
                      ? "risk"
                      : classification === "defer" ||
                          classification === "experiment"
                        ? "condition"
                        : classification === "quick_win"
                          ? "value"
                          : "action"
                  }
                >
                  {titleCase(classification)}
                </Badge>
                <span className="text-xs font-semibold text-[#777a71]">
                  {items.length}
                </span>
              </div>
              <div className="mt-4 space-y-2.5">
                {items.slice(0, 4).map((item) => (
                  <div
                    className="rounded-md border border-[#e4e5df] bg-[#fafaf7] p-3"
                    key={item.id}
                  >
                    <p className="text-xs font-semibold leading-4">
                      {item.title}
                    </p>
                    <div className="mt-2 flex justify-between text-[11px] text-[#777a71]">
                      <span>{formatCompactCurrency(item.annualValue)}</span>
                      <span>Score {item.score}</span>
                    </div>
                  </div>
                ))}
                {items.length > 4 ? (
                  <p className="px-1 text-[11px] font-medium text-[#3157d5]">
                    +{items.length - 4} more
                  </p>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      </Surface>

      <Surface className="h-fit overflow-hidden xl:sticky xl:top-20">
        <div className="border-b border-[#e4e5df] p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-[#3157d5]" />
            <h2 className="text-sm font-semibold">Portfolio weights</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#70736a]">
            Weights are organisation-owned, versioned, and must total 100%.
          </p>
        </div>
        <div className="space-y-4 p-5">
          {(Object.keys(weights) as Array<keyof PortfolioWeights>).map(
            (key) => (
              <label className="block" key={key}>
                <span className="mb-1.5 flex justify-between text-xs">
                  <span>{labels[key]}</span>
                  <span className="font-semibold tabular-nums">
                    {Math.round(weights[key] * 100)}%
                  </span>
                </span>
                <input
                  aria-label={`${labels[key]} weight`}
                  className="w-full accent-[#3157d5]"
                  max="30"
                  min="0"
                  onChange={(event) =>
                    updateWeight(key, Number(event.target.value))
                  }
                  step="1"
                  type="range"
                  value={weights[key] * 100}
                />
              </label>
            ),
          )}
        </div>
        <div
          className={`border-t px-5 py-4 ${valid ? "border-[#b9ddd3] bg-[#eef8f4]" : "border-[#e9cac6] bg-[#fff2f0]"}`}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Total</span>
            <span
              className={
                valid
                  ? "font-semibold text-[#176c59]"
                  : "font-semibold text-[#a43d36]"
              }
            >
              {Math.round(total * 100)}%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#6d7067]">
            {saved
              ? "Weight version saved in Synthetic Replay"
              : valid
                ? "Valid for scoring"
                : "Adjust weights to exactly 100%"}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => {
                setWeights(defaultPortfolioWeights);
                setSaved(false);
              }}
              size="sm"
              variant="secondary"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <Button disabled={!valid} onClick={() => setSaved(true)} size="sm">
              <Save className="size-3.5" />
              Save version
            </Button>
          </div>
        </div>
      </Surface>
    </div>
  );
}
