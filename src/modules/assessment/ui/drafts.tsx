"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Opportunity, SolutionOption } from "../types";
import { shareTaskBaseline } from "../tasks";

type DraftEntry = { value: unknown };
type DraftStore = { entries: Map<string, DraftEntry>; changed: () => void };
const DraftContext = createContext<DraftStore | null>(null);
export function DraftProvider({ children }: { children: ReactNode }) {
  const [entries] = useState(() => new Map<string, DraftEntry>());
  const [, rerender] = useState(0);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (entries.size) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [entries]);
  return (
    <DraftContext.Provider
      value={{ entries, changed: () => rerender((n) => n + 1) }}
    >
      {children}
    </DraftContext.Provider>
  );
}
export function useDrafts() {
  const context = useContext(DraftContext);
  if (!context) throw new Error("DraftProvider is required");
  return {
    dirty: context.entries.size > 0,
    project: (opportunity: Opportunity): Opportunity => {
      const next = structuredClone(opportunity);
      for (const [key, base] of context.entries) {
        const old = opportunity.options.find((x) => key === `${x.id}:base`);
        if (!old) continue;
        const value = structuredClone(base.value as SolutionOption),
          option = next.options.find((x) => x.id === old.id)!;
        Object.assign(option, value);
        for (const field of [
          "annualVolume",
          "minutesBefore",
          "hourlyCost",
          "productiveHours",
          "discountRate",
        ] as const)
          if (value.inputs[field] !== old.inputs[field])
            next.options.forEach((x) => {
              x.inputs[field] = value.inputs[field];
            });
        shareTaskBaseline(next.options, option, old);
      }
      return next;
    },
    clear: () => {
      context.entries.clear();
      context.changed();
    },
  };
}
export function useDraft<T>(key: string, saved: T) {
  const context = useContext(DraftContext);
  if (!context) throw new Error("DraftProvider is required");
  const entry = context.entries.get(key);
  const value = entry ? (entry.value as T) : saved;
  return {
    value,
    dirty: context.entries.has(key),
    set: (next: T) => {
      context.entries.delete(key);
      context.entries.set(key, { value: next });
      context.changed();
    },
    reset: () => {
      // A save callback captures the submitted entry. New edits, even from a
      // remounted form or an inspector snapshot, own a different entry and
      // must survive that older save's completion.
      if (context.entries.get(key) !== entry) return;
      context.entries.delete(key);
      context.changed();
    },
  };
}
