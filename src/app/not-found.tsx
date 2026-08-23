import Link from "next/link";

import { Surface } from "@/components/ui/surface";

export default function NotFound() {
  return (
    <Surface className="mx-auto mt-16 max-w-lg p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#777a71]">
        404
      </p>
      <h1 className="mt-3 text-xl font-semibold">
        The transformation record was not found
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#6d7067]">
        It may have moved, or your organisation may not have access.
      </p>
      <Link
        className="mt-5 inline-flex h-10 items-center rounded-md bg-[#3157d5] px-4 text-sm font-semibold text-white"
        href="/"
      >
        Return to control room
      </Link>
    </Surface>
  );
}
