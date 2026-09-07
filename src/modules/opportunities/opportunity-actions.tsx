"use client";

import { Upload, WandSparkles } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { uploadSourceFile } from "@/modules/sources/source-upload.client";

export function OpportunityActions() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dataAcknowledged, setDataAcknowledged] = useState(false);
  const [aiProcessingConsent, setAiProcessingConsent] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const result = await uploadSourceFile(file, {
        acknowledgedInternalNonRegulated: dataAcknowledged,
        aiProcessingConsent,
      });
      setMessage(
        result.status === "requires_ocr"
          ? "Source uploaded · OCR required"
          : "Source uploaded · extraction queued",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function mine() {
    setBusy(true);
    const response = await fetch("/api/opportunities/mine", {
      method: "POST",
    });
    const result = (await response.json()) as { mode?: string; error?: string };
    setMessage(
      response.ok
        ? "Opportunity Miner complete · draft persisted"
        : (result.error ?? "Miner could not start"),
    );
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <fieldset className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-[11px] text-[#65685f]">
        <legend className="sr-only">Source processing consent</legend>
        <label className="flex items-center gap-1.5">
          <input
            checked={dataAcknowledged}
            onChange={(event) => setDataAcknowledged(event.target.checked)}
            type="checkbox"
          />
          Internal, non-regulated data only
        </label>
        <label className="flex items-center gap-1.5">
          <input
            checked={aiProcessingConsent}
            onChange={(event) => setAiProcessingConsent(event.target.checked)}
            type="checkbox"
          />
          I consent to AI processing
        </label>
      </fieldset>
      <div className="flex gap-2">
        <input
          accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.markdown"
          className="hidden"
          onChange={(event) => upload(event.target.files?.[0])}
          ref={fileInput}
          type="file"
        />
        <Button
          disabled={busy || !dataAcknowledged || !aiProcessingConsent}
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
