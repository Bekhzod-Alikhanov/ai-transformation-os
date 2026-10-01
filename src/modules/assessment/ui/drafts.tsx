"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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
