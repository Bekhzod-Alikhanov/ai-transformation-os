"use client";

import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function magicLink() {
    setBusy(true);
    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setMessage(
      response.ok
        ? "Check your email for a secure sign-in link."
        : "Magic-link authentication is not configured in this environment.",
    );
    setBusy(false);
  }

  async function enterDemo() {
    setBusy(true);
    const response = await fetch("/api/auth/demo", { method: "POST" });
    if (response.ok) {
      router.push("/");
      router.refresh();
    } else {
      setMessage(
        "Demo session signing is not configured. The public synthetic replay remains available from the control room.",
      );
      setBusy(false);
    }
  }

  return (
    <Surface className="mx-auto mt-12 max-w-md overflow-hidden">
      <div className="border-b border-[#e4e5df] bg-[#fafaf7] p-6">
        <span className="grid size-10 place-items-center rounded-md bg-[#20221e] text-white">
          <Sparkles className="size-5" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">
          Enter the transformation control room
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#6d7067]">
          Use enterprise magic link, or open the fully synthetic Aster journey
          with no provider credentials.
        </p>
      </div>
      <div className="space-y-4 p-6">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold">Work email</span>
          <input
            aria-label="Work email"
            className="h-10 w-full rounded-md border border-[#d9dad4] px-3 text-sm"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            type="email"
            value={email}
          />
        </label>
        <Button
          className="w-full"
          disabled={busy || !email}
          onClick={magicLink}
        >
          Send magic link <ArrowRight className="size-4" />
        </Button>
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] text-[#92958c]">
          <span className="h-px flex-1 bg-[#e1e2dc]" />
          or
          <span className="h-px flex-1 bg-[#e1e2dc]" />
        </div>
        <Button
          className="w-full"
          disabled={busy}
          onClick={enterDemo}
          variant="secondary"
        >
          <Sparkles className="size-4" />
          Enter Aster Synthetic Replay
        </Button>
        {message ? (
          <p
            aria-live="polite"
            className="flex gap-2 rounded-md bg-[#f5f5f1] p-3 text-xs leading-5 text-[#62655d]"
          >
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[#25806a]" />
            {message}
          </p>
        ) : null}
      </div>
    </Surface>
  );
}
