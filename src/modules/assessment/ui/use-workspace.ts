"use client";
import { useEffect, useRef, useState } from "react";
import {
  openRepository,
  CorruptWorkspaceError,
  StaleWorkspaceError,
  type AssessmentRepository,
} from "../repository";
import type { Workspace } from "../types";
import { errorText } from "./fields";

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [opening, setOpening] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [rawBackup, setRawBackup] = useState<string | null>(null),
    [stale, setStale] = useState(false);
  const latest = useRef<Workspace | null>(null),
    repository = useRef<AssessmentRepository | null>(null),
    pending = useRef(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const repo = await openRepository();
        if (cancelled) {
          repo.close();
          return;
        }
        repository.current = repo;
        const loaded = await repo.load();
        if (cancelled) return;
        latest.current = loaded;
        setWorkspace(loaded);
      } catch (cause) {
        if (!cancelled) {
          setError(errorText(cause));
          if (cause instanceof CorruptWorkspaceError)
            setRawBackup(cause.rawBackup);
        }
      } finally {
        if (!cancelled) setOpening(false);
      }
    })();
    return () => {
      cancelled = true;
      repository.current?.close();
      repository.current = null;
    };
  }, []);

  async function commit(update: (current: Workspace | null) => Workspace) {
    if (pending.current || opening)
      throw new Error("Wait for the current storage operation to finish.");
    if (!repository.current || (error && !latest.current))
      throw new Error(
        "Reopen the workbench to recover the storage connection.",
      );
    pending.current = true;
    setBusy(true);
    setNotice("");
    try {
      const current = latest.current;
      const saved = await repository.current.save(
        update(current ? structuredClone(current) : null),
        current?.revision ?? null,
      );
      latest.current = saved;
      setWorkspace(saved);
      setError("");
      setStale(false);
      setNotice(`Saved in this browser · workspace revision ${saved.revision}`);
      return saved;
    } catch (cause) {
      setError(errorText(cause));
      setStale(cause instanceof StaleWorkspaceError);
      throw cause;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function reload() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const loaded = await repository.current!.load();
      latest.current = loaded;
      setWorkspace(loaded);
      setError("");
      setStale(false);
      setNotice("Reloaded the saved workspace.");
    } catch (cause) {
      setError(errorText(cause));
      throw cause;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return {
    workspace,
    opening,
    busy,
    error,
    notice,
    rawBackup,
    stale,
    commit,
    reload,
  };
}
