import type { SourceLocator } from "@/modules/sources/source-types";

export function excerptForLocator(
  content: string | null,
  locator: SourceLocator,
) {
  if (!content) return "No extracted text is available for this locator.";
  const lines = content.split(/\r?\n/);
  if (locator.type === "text_line")
    return lines.slice(locator.startLine - 1, locator.endLine).join("\n");
  if (locator.type === "pdf_page")
    return (
      content.split("\f")[locator.page - 1] ?? "Page extraction is unavailable."
    );
  if (locator.type === "docx_section") {
    const start = lines.findIndex(
      (line) => line.replace(/^#+\s*/, "").trim() === locator.section,
    );
    if (start < 0) return "Section extraction is unavailable.";
    const end = lines.slice(start + 1).findIndex((line) => /^#+\s+/.test(line));
    return lines.slice(start, end < 0 ? undefined : start + end + 1).join("\n");
  }
  if (locator.type === "spreadsheet_cell") {
    const found = lines.find((line) => line.startsWith(`${locator.range}=`));
    return found ?? `${locator.sheet}!${locator.range}`;
  }
  if (locator.type === "csv_row")
    return lines[locator.row - 1] ?? "CSV row extraction is unavailable.";
  return content;
}
