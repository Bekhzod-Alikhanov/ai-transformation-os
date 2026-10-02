import * as Dialog from "@radix-ui/react-dialog";
import { useSyncExternalStore } from "react";
import type { InspectorContent } from "./surface";

function subscribe(callback: () => void) {
  const media = matchMedia("(min-width: 1280px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
export function Inspector({
  value,
  open,
  close,
  returnFocus,
}: {
  value: InspectorContent | null;
  open: boolean;
  close: () => void;
  returnFocus: HTMLElement | null;
}) {
  const desktop = useSyncExternalStore(
    subscribe,
    () => matchMedia("(min-width: 1280px)").matches,
    () => false,
  );
  if (desktop)
    return !value || !open ? null : (
      <aside className="aw-inspector aw-panel" aria-label="Inspector">
        <p className="aw-eyebrow">Context / source / history</p>
        <h2>{value?.title ?? "Assessment inspector"}</h2>
        <button
          onClick={() => {
            close();
            returnFocus?.focus();
          }}
        >
          Close inspector
        </button>
        {value?.content ?? (
          <p>
            Select “Inspect source” or “Inspect readiness” to see the supporting
            context. Source excerpts and notes are shown as entered.
          </p>
        )}
      </aside>
    );
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="aw-overlay" />
        <Dialog.Content
          className="aw-drawer"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocus?.focus();
          }}
        >
          <Dialog.Title>{value?.title ?? "Assessment inspector"}</Dialog.Title>
          <Dialog.Description>
            Supporting source, assumptions and history. Synthetic assessment
            only.
          </Dialog.Description>
          <Dialog.Close className="aw-close">Close inspector</Dialog.Close>
          <div className="aw-stack">{value?.content}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
