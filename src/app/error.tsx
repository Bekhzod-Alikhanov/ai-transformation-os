"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Surface className="mx-auto mt-16 max-w-lg p-8 text-center">
      <AlertTriangle className="mx-auto size-8 text-[#a43d36]" />
      <h1 className="mt-4 text-xl font-semibold">
        This view could not be loaded
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#6d7067]">
        Your data and pending approvals are unchanged. Retry the view, or return
        to the control room.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </Surface>
  );
}
