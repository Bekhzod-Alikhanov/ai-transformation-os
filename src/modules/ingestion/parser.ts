import Papa from "papaparse";

import type { SourceLocator } from "@/modules/sources/source-types";

export type ParsedLocator = SourceLocator;

export type ParsedSourceItem = {
  content: string;
  locator: ParsedLocator;
  metadata?: Record<string, string | number | boolean>;
};

export type ParsedSource = {
  kind: "pdf" | "docx" | "xlsx" | "csv" | "text" | "markdown";
  items: ParsedSourceItem[];
  untrusted: true;
  requiresOcr: boolean;
  warnings: string[];
};

function extension(name: string) {
  const suffix = name.toLowerCase().split(".").pop();
  return suffix ? `.${suffix}` : "";
}

function parseDelimited(bytes: Buffer): ParsedSource {
  const result = Papa.parse<Record<string, string>>(bytes.toString("utf8"), {
    header: true,
    skipEmptyLines: true,
  });
  if (result.errors.length)
    throw new Error(
      `CSV parsing failed: ${result.errors[0]?.message ?? "unknown error"}`,
    );
  return {
    kind: "csv",
    untrusted: true,
    requiresOcr: false,
    warnings: [],
    items: result.data.map((row, index) => ({
      content: Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join("; "),
      locator: { type: "csv_row", row: index + 2 },
    })),
  };
}

function parseText(bytes: Buffer, kind: "text" | "markdown"): ParsedSource {
  const content = bytes.toString("utf8").replace(/^\uFEFF/, "");
  const lineCount = Math.max(1, content.split(/\r?\n/).length);
  return {
    kind,
    untrusted: true,
    requiresOcr: false,
    warnings: [],
    items: [
      {
        content,
        locator: { type: "text_line", startLine: 1, endLine: lineCount },
      },
    ],
  };
}

async function parseWorkbook(bytes: Buffer): Promise<ParsedSource> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as ArrayBuffer);
  const items: ParsedSourceItem[] = [];
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row, rowNumber) => {
      const values = row.values;
      const cells = Array.isArray(values)
        ? values
            .slice(1)
            .map((value) =>
              typeof value === "object"
                ? JSON.stringify(value)
                : String(value ?? ""),
            )
        : [];
      if (!cells.some(Boolean)) return;
      items.push({
        content: cells.join(" | "),
        locator: {
          type: "spreadsheet_cell",
          sheet: sheet.name,
          range: `A${rowNumber}:${sheet.getColumn(row.cellCount || 1).letter}${rowNumber}`,
        },
      });
    });
  });
  return {
    kind: "xlsx",
    items,
    untrusted: true,
    requiresOcr: false,
    warnings: [],
  };
}

async function parseDocument(bytes: Buffer): Promise<ParsedSource> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: bytes });
  const paragraphs = result.value
    .split(/\n{2,}/)
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    kind: "docx",
    items: paragraphs.map((content, index) => ({
      content,
      locator: { type: "docx_section", section: `Section ${index + 1}` },
    })),
    untrusted: true,
    requiresOcr: false,
    warnings: result.messages.map((message) => message.message),
  };
}

export function requiresPdfOcr(pageText: readonly string[]) {
  const characters = pageText.reduce((sum, content) => sum + content.length, 0);
  return characters / Math.max(1, pageText.length) < 80;
}

async function parsePdf(bytes: Buffer): Promise<ParsedSource> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes) })
    .promise;
  const items: ParsedSourceItem[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const content = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    items.push({
      content,
      locator: { type: "pdf_page", page: pageNumber },
    });
  }
  const requiresOcr = requiresPdfOcr(items.map((item) => item.content));
  return {
    kind: "pdf",
    items,
    untrusted: true,
    requiresOcr,
    warnings: requiresOcr
      ? ["Low-text PDF requires OCR before evidence extraction"]
      : [],
  };
}

export async function parseSourceFile({
  name,
  bytes,
}: {
  name: string;
  bytes: Buffer;
}): Promise<ParsedSource> {
  const suffix = extension(name);
  if (suffix === ".csv") return parseDelimited(bytes);
  if (suffix === ".txt") return parseText(bytes, "text");
  if (suffix === ".md" || suffix === ".markdown")
    return parseText(bytes, "markdown");
  if (suffix === ".xlsx") return parseWorkbook(bytes);
  if (suffix === ".docx") return parseDocument(bytes);
  if (suffix === ".pdf") return parsePdf(bytes);
  throw new Error(`Unsupported file type: ${suffix || "unknown"}`);
}
