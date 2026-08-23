"use client";

import { Upload, WandSparkles } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function OpportunityActions() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/evidence/upload", {
      method: "POST",
      body: form,
    });
    const result = (await response.json()) as {
      itemCount?: number;
      requiresOcr?: boolean;
      error?: string;
    };
    setMessage(
      response.ok
        ? `${result.itemCount ?? 0} source items parsed${result.requiresOcr ? " · OCR required" : ""}`
        : (result.error ?? "Upload failed"),
    );
    setBusy(false);
  }

  async function mine() {
    setBusy(true);
    const response = await fetch("/api/jobs/opportunity-miner", {
      method: "POST",
    });
    const result = (await response.json()) as { mode?: string; error?: string };
    setMessage(
      response.ok
        ? `Opportunity Miner complete · ${result.mode === "synthetic_replay" ? "Synthetic Replay" : "durable run queued"}`
        : (result.error ?? "Miner could not start"),
    );
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <input
          accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.markdown"
          className="hidden"
          onChange={(event) => upload(event.target.files?.[0])}
          ref={fileInput}
          type="file"
        />
        <Button
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          size="sm"
          variant="secondary"
        >
          <Upload className="size-3.5" />
          Add evidence
        </Button>
        <Button disabled={busy} onClick={mine} size="sm">
          <WandSparkles className="size-3.5" />
          {busy ? "Working…" : "Run Opportunity Miner"}
        </Button>
      </div>
      {message ? (
        <p aria-live="polite" className="text-[11px] text-[#65685f]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
