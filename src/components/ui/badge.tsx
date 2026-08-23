import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "value" | "condition" | "risk" | "action";

const tones: Record<BadgeTone, string> = {
  neutral: "border-[#dfe0da] bg-[#f5f5f1] text-[#565950]",
  value: "border-[#b9ddd3] bg-[#edf8f4] text-[#16715d]",
  condition: "border-[#ead9ae] bg-[#fff8e8] text-[#8a641b]",
  risk: "border-[#e9cac6] bg-[#fff2f0] text-[#a43d36]",
  action: "border-[#cbd4f7] bg-[#f1f4ff] text-[#3157d5]",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-[0.01em]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
