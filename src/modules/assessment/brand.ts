/** Existing contrast-safe workspace presets, shared by UI and local artifacts. */
export const accents = {
  Cobalt: "#3157d5",
  Teal: "#176b58",
  Crimson: "#9f2942",
} as const;

export function safeAccent(value: string): string {
  return (
    Object.values(accents).find((accent) => accent === value) ?? accents.Cobalt
  );
}

/** OOXML takes explicit RGB hex values rather than CSS colours. */
export function artifactAccent(value: string): string {
  return safeAccent(`#${value.replace(/^#/, "").toLowerCase()}`)
    .slice(1)
    .toUpperCase();
}
