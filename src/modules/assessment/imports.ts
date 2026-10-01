import Papa from "papaparse";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_COLUMNS = 100;
const MAX_SHEETS = 20;
const MAX_BASELINE_VALUE = 1_000_000_000_000;

export interface ImportTable {
  headers: string[];
  rows: string[][];
  sourceName: string;
  sheetName?: string;
  availableSheets: string[];
  rowNumbers: number[];
}

export interface BaselineMapping {
  volumeColumn: string;
  minutesColumn: string;
  period: "annual" | "monthly" | "weekly";
  timeUnit: "minutes" | "seconds" | "hours";
}

export interface BaselinePreview {
  valid: boolean;
  errors: Array<{ row: number; message: string }>;
  annualVolume: number | null;
  minutesBefore: number | null;
  rowCount: number;
  sourceLocator: string;
  assumptionsSummary: string;
}

function validateDimensions(table: ImportTable): ImportTable {
  if (!table.headers.length) throw new Error("The import needs a header row.");
  if (table.headers.length > MAX_COLUMNS)
    throw new Error(`The import exceeds the ${MAX_COLUMNS}-column limit.`);
  if (table.rows.some((row) => row.length > MAX_COLUMNS))
    throw new Error(`The import exceeds the ${MAX_COLUMNS}-column limit.`);
  if (table.rows.length > MAX_ROWS)
    throw new Error(`The import exceeds the ${MAX_ROWS}-row limit.`);
  return table;
}

async function fileBytes(file: File) {
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(
        new Error(
          "The selected file could not be read. Check browser file permissions and choose it again.",
        ),
      );
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(file);
  });
}

function isZip(data: Uint8Array) {
  return (
    data.length >= 4 &&
    data[0] === 0x50 &&
    data[1] === 0x4b &&
    ((data[2] === 0x03 && data[3] === 0x04) ||
      (data[2] === 0x05 && data[3] === 0x06))
  );
}

function nonempty(row: string[]) {
  return row.some((cell) => cell.trim());
}

function parseCsv(data: Uint8Array, sourceName: string): ImportTable {
  if (isZip(data) || data.includes(0))
    throw new Error(
      "A binary file cannot be read as CSV. Choose the original CSV or XLSX file.",
    );
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    throw new Error(
      "The CSV is not valid UTF-8 text. Export it as UTF-8 CSV and try again.",
    );
  }
  const parsed = Papa.parse<string[]>(text, {
    delimiter: ",",
    skipEmptyLines: false,
  });
  if (parsed.errors.length)
    throw new Error(
      `CSV parsing failed at row ${(parsed.errors[0]?.row ?? 0) + 1}: ${parsed.errors[0]?.message ?? "invalid CSV"}.`,
    );
  const indexed = parsed.data.map((row, index) => ({
    row: row.map(String),
    number: index + 1,
  }));
  const headerIndex = indexed.findIndex((item) => nonempty(item.row));
  if (headerIndex < 0) throw new Error("The import needs a header row.");
  const records = indexed
    .slice(headerIndex + 1)
    .filter((item) => nonempty(item.row));
  return validateDimensions({
    headers: indexed[headerIndex]!.row.map((value) => value.trim()),
    rows: records.map((item) => item.row),
    rowNumbers: records.map((item) => item.number),
    sourceName,
    availableSheets: [],
  });
}

function excelCellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return String(value);
  if (typeof value === "object" && value) {
    if ("richText" in value)
      return (value as { richText: Array<{ text: string }> }).richText
        .map((part) => part.text)
        .join("");
    if (
      "text" in value &&
      typeof (value as { text?: unknown }).text === "string"
    )
      return (value as { text: string }).text;
  }
  return String(value);
}

async function parseXlsx(
  data: Uint8Array,
  sourceName: string,
  requestedSheet?: string,
): Promise<ImportTable> {
  if (!isZip(data))
    throw new Error(
      "The selected file is not a valid XLSX workbook. Choose the original CSV or XLSX file.",
    );
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data as unknown as ArrayBuffer);
  } catch {
    throw new Error(
      "The XLSX workbook could not be read. Keep the original file and export a standard, unencrypted XLSX copy.",
    );
  }
  const availableSheets = workbook.worksheets
    .slice(0, MAX_SHEETS)
    .map((worksheet) => worksheet.name);
  if (!availableSheets.length)
    throw new Error("The XLSX workbook has no worksheets.");
  if (requestedSheet && !availableSheets.includes(requestedSheet)) {
    if (
      workbook.worksheets.some((worksheet) => worksheet.name === requestedSheet)
    )
      throw new Error(
        "Only the first 20 sheets are selectable. Move the required sheet into that range and export a new XLSX copy.",
      );
    throw new Error(
      `Worksheet “${requestedSheet}” was not found in the workbook.`,
    );
  }
  const sheetName = requestedSheet ?? availableSheets[0]!;
  const worksheet = workbook.getWorksheet(sheetName)!;
  if (worksheet.columnCount > MAX_COLUMNS)
    throw new Error(`The import exceeds the ${MAX_COLUMNS}-column limit.`);
  const indexed: Array<{ row: string[]; number: number }> = [];
  worksheet.eachRow({ includeEmpty: false }, (_worksheetRow, rowNumber) => {
    const row: string[] = [];
    for (let column = 1; column <= worksheet.columnCount; column++) {
      const cell = worksheet.getCell(rowNumber, column);
      const value = cell.value;
      if (
        value &&
        typeof value === "object" &&
        ("formula" in value || "sharedFormula" in value)
      )
        throw new Error(
          `${sheetName}!${cell.address} contains a formula. Replace formulas with reviewed values before import.`,
        );
      row.push(excelCellText(value));
    }
    if (!nonempty(row)) return;
    if (indexed.length > MAX_ROWS)
      throw new Error(`The import exceeds the ${MAX_ROWS}-row limit.`);
    indexed.push({ row, number: rowNumber });
  });
  const [header, ...records] = indexed;
  return validateDimensions({
    headers: (header?.row ?? []).map((value) => value.trim()),
    rows: records.map((item) => item.row),
    rowNumbers: records.map((item) => item.number),
    sourceName,
    sheetName,
    availableSheets,
  });
}

export async function readBaselineFile(
  file: File,
  sheetName?: string,
): Promise<ImportTable> {
  if (file.size > MAX_FILE_BYTES)
    throw new Error("Baseline file exceeds the 10 MiB safety limit.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "csv" && extension !== "xlsx")
    throw new Error("Choose a supported CSV or XLSX baseline file.");
  const data = await fileBytes(file);
  if (extension === "csv") {
    if (sheetName)
      throw new Error("CSV files do not contain selectable worksheets.");
    return parseCsv(data, file.name);
  }
  return parseXlsx(data, file.name, sheetName);
}

function columnLetters(index: number) {
  let number = index + 1;
  let letters = "";
  while (number) {
    number--;
    letters = String.fromCharCode(65 + (number % 26)) + letters;
    number = Math.floor(number / 26);
  }
  return letters;
}

function compactRows(rows: number[]) {
  if (!rows.length) return "none";
  if (
    rows.length > 1 &&
    rows.every((row, index) => !index || row === rows[index - 1]! + 1)
  )
    return `${rows[0]}–${rows.at(-1)}`;
  return rows.join(", ");
}

function sourceLocator(
  table: ImportTable,
  mapping: BaselineMapping,
  volumeIndex: number,
  minutesIndex: number,
) {
  const columns = `columns ${mapping.volumeColumn} / ${mapping.minutesColumn}`;
  if (!table.sheetName)
    return `${table.sourceName} · ${columns} · rows ${compactRows(table.rowNumbers)}`;
  if (!table.rowNumbers.length || volumeIndex < 0 || minutesIndex < 0)
    return `${table.sourceName} · ${table.sheetName} · ${columns} · no data rows`;
  const left = Math.min(volumeIndex, minutesIndex);
  const right = Math.max(volumeIndex, minutesIndex);
  const contiguousRows = table.rowNumbers.every(
    (row, index) => !index || row === table.rowNumbers[index - 1]! + 1,
  );
  let cells: string;
  if (contiguousRows && right - left <= 1) {
    cells = `${columnLetters(left)}${table.rowNumbers[0]}:${columnLetters(right)}${table.rowNumbers.at(-1)}`;
  } else if (right - left <= 1) {
    cells = table.rowNumbers
      .map(
        (row) => `${columnLetters(left)}${row}:${columnLetters(right)}${row}`,
      )
      .join(", ");
  } else {
    cells = table.rowNumbers
      .flatMap((row) => [
        `${columnLetters(volumeIndex)}${row}`,
        `${columnLetters(minutesIndex)}${row}`,
      ])
      .join(", ");
  }
  return `${table.sourceName} · ${table.sheetName}!${cells} · ${columns}`;
}

function makePreview(
  table: ImportTable,
  mapping: BaselineMapping,
  volumeIndex: number,
  minutesIndex: number,
  errors: BaselinePreview["errors"],
): BaselinePreview {
  const annualFactor = { annual: 1, monthly: 12, weekly: 52 }[mapping.period];
  const timeDescription = {
    minutes: "minutes retained as minutes",
    seconds: "seconds divided by 60",
    hours: "hours multiplied by 60",
  }[mapping.timeUnit];
  return {
    valid: false,
    errors,
    annualVolume: null,
    minutesBefore: null,
    rowCount: table.rows.length,
    sourceLocator: sourceLocator(table, mapping, volumeIndex, minutesIndex),
    assumptionsSummary: `${mapping.period} volume annualized by ${annualFactor}; ${timeDescription}; handling time is volume-weighted.`,
  };
}

export function previewBaseline(
  table: ImportTable,
  mapping: BaselineMapping,
): BaselinePreview {
  const errors: BaselinePreview["errors"] = [];
  const duplicates = table.headers.filter(
    (header, index) => table.headers.indexOf(header) !== index,
  );
  if (duplicates.length)
    errors.push({ row: 1, message: `Duplicate header: ${duplicates[0]}.` });
  const volumeIndex = table.headers.indexOf(mapping.volumeColumn);
  const minutesIndex = table.headers.indexOf(mapping.minutesColumn);
  if (volumeIndex < 0)
    errors.push({
      row: 1,
      message: `Volume column “${mapping.volumeColumn}” was not found.`,
    });
  if (minutesIndex < 0)
    errors.push({
      row: 1,
      message: `Handling-time column “${mapping.minutesColumn}” was not found.`,
    });
  if (volumeIndex >= 0 && volumeIndex === minutesIndex)
    errors.push({
      row: 1,
      message: "Volume and handling time must use different columns.",
    });
  if (!table.rows.length)
    errors.push({ row: 1, message: "Provide at least one data row." });
  if (errors.length)
    return makePreview(table, mapping, volumeIndex, minutesIndex, errors);

  let volumeTotal = 0;
  let weightedMinutes = 0;
  const annualFactor = { annual: 1, monthly: 12, weekly: 52 }[mapping.period];
  const timeFactor = { minutes: 1, seconds: 1 / 60, hours: 60 }[
    mapping.timeUnit
  ];
  table.rows.forEach((row, index) => {
    const rowNumber = table.rowNumbers[index] ?? index + 2;
    const volumeText = row[volumeIndex]?.trim();
    const minutesText = row[minutesIndex]?.trim();
    if (!volumeText || !minutesText) {
      errors.push({
        row: rowNumber,
        message:
          "Both mapped values are required; blank cells are not treated as zero.",
      });
      return;
    }
    const volume = Number(volumeText);
    const duration = Number(minutesText);
    if (!Number.isFinite(volume) || !Number.isFinite(duration)) {
      errors.push({
        row: rowNumber,
        message: "Volume and handling time must each be a finite number.",
      });
      return;
    }
    if (volume <= 0 || duration <= 0) {
      errors.push({
        row: rowNumber,
        message: "Volume and handling time must each be positive.",
      });
      return;
    }
    if (volume > MAX_BASELINE_VALUE || duration > MAX_BASELINE_VALUE) {
      errors.push({
        row: rowNumber,
        message: `Values exceed the supported maximum of ${MAX_BASELINE_VALUE}.`,
      });
      return;
    }
    const minutes = duration * timeFactor;
    if (!Number.isFinite(minutes) || minutes > MAX_BASELINE_VALUE) {
      errors.push({
        row: rowNumber,
        message: `Converted handling time exceeds the supported maximum of ${MAX_BASELINE_VALUE} minutes.`,
      });
      return;
    }
    volumeTotal += volume;
    weightedMinutes += volume * minutes;
  });
  const annualVolume = volumeTotal * annualFactor;
  if (!Number.isFinite(annualVolume) || annualVolume > MAX_BASELINE_VALUE)
    errors.push({
      row: 1,
      message: `Annualized volume exceeds the supported maximum of ${MAX_BASELINE_VALUE}.`,
    });
  const preview = makePreview(
    table,
    mapping,
    volumeIndex,
    minutesIndex,
    errors,
  );
  if (errors.length) return preview;
  return {
    ...preview,
    valid: true,
    annualVolume,
    minutesBefore: weightedMinutes / volumeTotal,
  };
}
