import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  previewBaseline,
  readBaselineFile,
  type BaselineMapping,
} from "./imports";

const mapping: BaselineMapping = {
  volumeColumn: "volume",
  minutesColumn: "minutes",
  period: "annual",
  timeUnit: "minutes",
};

function csvFile(text: string, name = "baseline.csv", type = "text/csv") {
  return new File([text], name, { type });
}

async function xlsxFile(
  sheets: Array<{
    name: string;
    rows: Array<ExcelJS.CellValue[] | null>;
  }>,
) {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    sheet.rows.forEach((row, rowIndex) => {
      row?.forEach((value, columnIndex) => {
        worksheet.getCell(rowIndex + 1, columnIndex + 1).value = value;
      });
    });
  }
  const bytes = await workbook.xlsx.writeBuffer();
  return new File([bytes], "baseline.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("baseline file imports", () => {
  it("produces equivalent CSV and XLSX tables and weighted previews", async () => {
    const csv = await readBaselineFile(
      csvFile("volume,minutes\n100,10\n300,20\n"),
    );
    const xlsx = await readBaselineFile(
      await xlsxFile([
        {
          name: "Baseline",
          rows: [
            ["volume", "minutes"],
            [100, 10],
            [300, 20],
          ],
        },
      ]),
    );

    expect(xlsx.headers).toEqual(csv.headers);
    expect(xlsx.rows).toEqual(csv.rows);
    expect(previewBaseline(csv, mapping)).toMatchObject({
      valid: true,
      errors: [],
      annualVolume: 400,
      minutesBefore: 17.5,
      rowCount: 2,
      sourceLocator: "baseline.csv · columns volume / minutes · rows 2–3",
    });
    expect(previewBaseline(xlsx, mapping).sourceLocator).toBe(
      "baseline.xlsx · Baseline!A2:B3 · columns volume / minutes",
    );
  });

  it("preserves original source rows when blank records are skipped", async () => {
    const table = await readBaselineFile(
      csvFile("volume,minutes\n10,2\n\n30,4\n"),
    );

    expect(table.rowNumbers).toEqual([2, 4]);
    expect(previewBaseline(table, mapping).sourceLocator).toBe(
      "baseline.csv · columns volume / minutes · rows 2, 4",
    );
    const workbook = await readBaselineFile(
      await xlsxFile([
        {
          name: "Gaps",
          rows: [["volume", "minutes"], [10, 2], null, [30, 4]],
        },
      ]),
    );
    expect(workbook.rowNumbers).toEqual([2, 4]);
    expect(previewBaseline(workbook, mapping)).toMatchObject({
      valid: true,
      annualVolume: 40,
      minutesBefore: 3.5,
      sourceLocator:
        "baseline.xlsx · Gaps!A2:B2, A4:B4 · columns volume / minutes",
    });
  });

  it("rejects invalid data after a physically absent worksheet row", async () => {
    const workbook = await readBaselineFile(
      await xlsxFile([
        {
          name: "Sparse invalid",
          rows: [["volume", "minutes"], [10, 2], null, ["invalid", 4]],
        },
      ]),
    );

    const preview = previewBaseline(workbook, mapping);
    expect(preview).toMatchObject({
      valid: false,
      annualVolume: null,
      minutesBefore: null,
      errors: [expect.objectContaining({ row: 4 })],
    });
  });

  it("annualizes monthly volume and converts seconds and hours", async () => {
    const table = await readBaselineFile(
      csvFile("cases,seconds\n10,120\n30,60\n"),
    );
    const seconds = previewBaseline(table, {
      volumeColumn: "cases",
      minutesColumn: "seconds",
      period: "monthly",
      timeUnit: "seconds",
    });
    const hours = previewBaseline(
      {
        ...table,
        headers: ["cases", "hours"],
        rows: [["10", "2"]],
        rowNumbers: [2],
      },
      {
        volumeColumn: "cases",
        minutesColumn: "hours",
        period: "weekly",
        timeUnit: "hours",
      },
    );

    expect(seconds).toMatchObject({
      valid: true,
      annualVolume: 480,
      minutesBefore: 1.25,
    });
    expect(seconds.assumptionsSummary).toMatch(/monthly.*12/i);
    expect(hours).toMatchObject({
      valid: true,
      annualVolume: 520,
      minutesBefore: 120,
    });
  });

  it.each([
    ["missing cell", "volume,minutes\n10,", /row 2.*required/i],
    ["zero value", "volume,minutes\n0,3", /row 2.*positive/i],
    ["invalid number", "volume,minutes\nten,3", /row 2.*finite number/i],
    ["formula text", "volume,minutes\n=5+5,3", /row 2.*finite number/i],
  ])(
    "rejects every row for %s without partial totals",
    async (_, text, error) => {
      const preview = previewBaseline(
        await readBaselineFile(csvFile(text)),
        mapping,
      );
      expect(preview).toMatchObject({
        valid: false,
        annualVolume: null,
        minutesBefore: null,
      });
      expect(
        preview.errors
          .map((item) => `row ${item.row}: ${item.message}`)
          .join(" "),
      ).toMatch(error);
    },
  );

  it("rejects duplicate headers, same-column mappings, empty data and overflow", async () => {
    const duplicate = await readBaselineFile(csvFile("volume,volume\n10,2"));
    expect(previewBaseline(duplicate, mapping).errors[0]!.message).toMatch(
      /duplicate header/i,
    );
    const table = await readBaselineFile(csvFile("volume,minutes\n10,2"));
    expect(
      previewBaseline(table, { ...mapping, minutesColumn: "volume" }).errors[0]!
        .message,
    ).toMatch(/different columns/i);
    expect(
      previewBaseline({ ...table, rows: [] }, mapping).errors[0]!.message,
    ).toMatch(/at least one/i);
    expect(
      previewBaseline({ ...table, rows: [["1000000000001", "2"]] }, mapping)
        .errors[0]!.message,
    ).toMatch(/maximum/i);
  });

  it("rejects spreadsheet formulas with a sheet and cell locator", async () => {
    const file = await xlsxFile([
      {
        name: "Inputs",
        rows: [
          ["volume", "minutes"],
          [10, { formula: "1+1", result: 2 }],
        ],
      },
    ]);

    await expect(readBaselineFile(file)).rejects.toThrow(/Inputs!B2.*formula/i);
  });

  it("rejects a formula after a physically absent worksheet row", async () => {
    const file = await xlsxFile([
      {
        name: "Sparse formula",
        rows: [
          ["volume", "minutes"],
          [10, 2],
          null,
          [30, { formula: "2+2", result: 4 }],
        ],
      },
    ]);

    await expect(readBaselineFile(file)).rejects.toThrow(
      /Sparse formula!B4.*formula/i,
    );
  });

  it("keeps spreadsheet-like CSV strings as inert text", async () => {
    const table = await readBaselineFile(
      csvFile('volume,minutes,note\n10,2,=HYPERLINK("https://invalid")'),
    );

    expect(table.rows[0]![2]).toBe('=HYPERLINK("https://invalid")');
  });

  it("lists and selects only the first 20 workbook sheets", async () => {
    const sheets = Array.from({ length: 21 }, (_, index) => ({
      name: `Sheet ${index + 1}`,
      rows: [
        ["volume", "minutes"],
        [index + 1, 5],
      ],
    }));
    const file = await xlsxFile(sheets);
    const defaultTable = await readBaselineFile(file);
    const selected = await readBaselineFile(file, "Sheet 20");

    expect(defaultTable.availableSheets).toHaveLength(20);
    expect(defaultTable.sheetName).toBe("Sheet 1");
    expect(selected.sheetName).toBe("Sheet 20");
    expect(selected.rows[0]).toEqual(["20", "5"]);
    await expect(readBaselineFile(file, "Sheet 21")).rejects.toThrow(
      /first 20 sheets/i,
    );
    await expect(readBaselineFile(file, "Missing")).rejects.toThrow(
      /not found/i,
    );
  });

  it("rejects oversized, unsupported and binary/text-mismatched files", async () => {
    const oversized = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "large.csv",
      { type: "text/csv" },
    );
    await expect(readBaselineFile(oversized)).rejects.toThrow(/10 MiB/i);
    await expect(
      readBaselineFile(
        new File(["hello"], "baseline.txt", { type: "text/plain" }),
      ),
    ).rejects.toThrow(/CSV or XLSX/i);
    await expect(
      readBaselineFile(
        new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "wrong.csv", {
          type: "text/csv",
        }),
      ),
    ).rejects.toThrow(/binary.*CSV/i);
    await expect(
      readBaselineFile(
        new File(["volume,minutes\n1,2"], "wrong.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      ),
    ).rejects.toThrow(/valid XLSX/i);
  });

  it("enforces the 5,000-row and 100-column table limits", async () => {
    const tooManyRows = [
      "volume,minutes",
      ...Array.from({ length: 5001 }, () => "1,2"),
    ].join("\n");
    await expect(readBaselineFile(csvFile(tooManyRows))).rejects.toThrow(
      /5,?000-row limit/i,
    );
    const headers = Array.from(
      { length: 101 },
      (_, index) => `column-${index}`,
    );
    const values = Array.from({ length: 101 }, () => "1");
    await expect(
      readBaselineFile(csvFile(`${headers.join(",")}\n${values.join(",")}`)),
    ).rejects.toThrow(/100-column limit/i);
  });
});
