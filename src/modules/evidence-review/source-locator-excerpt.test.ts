import { describe, expect, it } from "vitest";

import { excerptForLocator } from "./source-locator-excerpt";

describe("source locator excerpts", () => {
  it("resolves text, PDF, DOCX, spreadsheet, and CSV locators without returning whole source content", () => {
    expect(
      excerptForLocator("one\ntwo\nthree", {
        type: "text_line",
        startLine: 2,
        endLine: 2,
      }),
    ).toBe("two");
    expect(
      excerptForLocator("Page 1\fPage 2", { type: "pdf_page", page: 2 }),
    ).toBe("Page 2");
    expect(
      excerptForLocator("Intro\n## Risks\nRisk text", {
        type: "docx_section",
        section: "Risks",
      }),
    ).toBe("## Risks\nRisk text");
    expect(
      excerptForLocator("A1=Hours\nB2=8", {
        type: "spreadsheet_cell",
        sheet: "Baseline",
        range: "B2",
      }),
    ).toBe("B2=8");
    expect(
      excerptForLocator("name,hours\nOps,8\nFinance,6", {
        type: "csv_row",
        row: 2,
      }),
    ).toBe("Ops,8");
  });
});
