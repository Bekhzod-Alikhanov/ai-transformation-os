import type ExcelJS from "exceljs";
import type { ExportPayload } from "./payload";
import { provenance, shown, metric } from "./brief";
import { artifactAccent } from "../brand";

type Value = string | number | boolean | null;
/** Structured text/number cells only. ExcelJS strings never become formulas. */
export async function createAssessmentWorkbook(
  p: ExportPayload,
): Promise<Blob> {
  const { default: Excel } = await import("exceljs");
  const book = new Excel.Workbook();
  book.creator = p.brand.name;
  book.title = p.title;
  book.subject = `${p.notice} ${provenance(p)}`;
  const accent = artifactAccent(p.brand.accent);
  const currencyFormat = `"${p.currency}" #,##0.00;[Red]-"${p.currency}" #,##0.00;"${p.currency}" 0.00`;
  function table(
    name: string,
    headers: string[],
    rows: Value[][],
    moneyColumns: number[] = [],
  ) {
    const sheet = book.addWorksheet(name, {
      views: [{ state: "frozen", ySplit: 1, xSplit: 1, showGridLines: false }],
    });
    sheet.addRow(headers);
    for (const values of rows) {
      // Excel has a 32,767-character cell limit. Preserve full text in visible
      // continuation rows rather than silently dropping overflow or hiding it.
      const chunks = values.map((value) =>
        typeof value === "string"
          ? (value.match(/[\s\S]{1,30000}/g) ?? [""])
          : [value],
      );
      const count = Math.max(...chunks.map((c) => c.length));
      for (let i = 0; i < count; i++) {
        if (sheet.rowCount >= 1048576)
          throw new Error(
            "Workbook exceeds Excel's row limit. Export a smaller opportunity or use the workspace backup.",
          );
        sheet.addRow(
          chunks.map((c) =>
            i < c.length
              ? c[i] === null || c[i] === ""
                ? "Not assessed"
                : c[i]
              : "",
          ),
        );
      }
    }
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: sheet.rowCount, column: headers.length },
    };
    sheet.columns.forEach((column, i) => {
      column.width = i === 0 ? 29 : moneyColumns.includes(i + 1) ? 22 : 35;
    });
    sheet.eachRow((row, n) => {
      row.alignment = { vertical: "top", wrapText: true };
      row.font = { name: "Aptos", size: 11, color: { argb: "FF20221E" } };
      if (n === 1) {
        row.font = {
          name: "Aptos",
          size: 11,
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: `FF${accent}` },
        };
        row.height = 32;
      } else if (n % 2 === 0)
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F1E9" },
        };
      for (const col of moneyColumns) row.getCell(col).numFmt = currencyFormat;
    });
    return sheet;
  }
  const overview: Value[][] = [
    ["Title", p.title],
    ["Disclosure", p.notice],
    ["Status / provenance", provenance(p)],
    ["Client", p.client],
    ["Engagement", p.engagement],
    ["Opportunity", p.opportunity],
    ["Currency (no FX conversion)", p.currency],
    ["Model / schema", `${p.modelVersion} / ${p.schemaVersion}`],
    ["Snapshot ID", p.snapshotId],
    ["Source revision", p.sourceRevision],
    ["Engagement revision", p.engagementRevision],
    ["Current revision (context only)", p.currentRevision],
    ["As of", p.asOf],
    ["Selected option", p.options.find((o) => o.selected)!.name],
    ["Scenario basis", p.basis],
    ["Problem", p.problem],
    ["Client objective", p.objectives],
    ["Constraints", p.constraints],
    ["Outcome", p.outcome],
    ["Computed policy outcome", p.computedOutcome],
    ["Rationale", p.rationale],
    ["Conditions", p.conditions],
    ["Strategic exception", p.strategicException],
    ["Alternatives rationale", p.alternativesRejected],
    ["Next decision date", p.nextDecisionDate],
    ["Deadline", p.deadline],
    ["Sponsor", p.sponsor],
    ["Process owner", p.processOwner],
    ["Lead", p.lead],
    ["Critical controls open", p.criticalControlsOpen],
    ["Economic hurdle", p.economicHurdle],
    ["Budget ceiling", p.budgetCeiling],
    [
      "Internal notes",
      p.includeInternalNotes ? "Included by explicit choice" : "Excluded",
    ],
    ...p.readiness.map((r) => [
      `Readiness: ${r.dimension}`,
      r.state === "unknown" ? "Not assessed" : r.state,
    ]),
    ...p.reasons.map((r) => ["Reason", r]),
    ...p.blockers.map((r) => ["Blocker", r]),
    ...p.requests.flatMap((r) => [
      [`Evidence request (${r.status})`, r.question],
      ["Request owner", r.owner],
      ["Request impact", r.impact],
    ]),
    ...p.discovery.map((d) => [`Discovery: ${d.area}`, d.notes]),
  ];
  const overviewSheet = table("Overview", ["Field", "Value"], overview);
  function formatMoneyFields(sheet: ExcelJS.Worksheet, fields: string[]) {
    sheet.eachRow((row) => {
      if (fields.includes(String(row.getCell(1).value)))
        row.getCell(2).numFmt = currencyFormat;
    });
  }
  formatMoneyFields(overviewSheet, ["Economic hurdle", "Budget ceiling"]);
  table(
    "Options",
    [
      "ID",
      "Alternative",
      "Kind",
      "Selected",
      "Status",
      "Initial investment",
      "Annual OPEX (year 1)",
      "Annual hours",
      "FTE capacity",
      "Annual capacity value",
      "Annual economic benefit",
      "Annual cash subset",
      "First-year economic net",
      "First-year cash net",
      "Economic NPV",
      "Cash NPV",
      "36-month economic net",
      "Economic ROI (year 1)",
      "Cash ROI (year 1)",
      "Economic payback (months)",
      "Cash payback (months)",
      "Zero-NPV adoption",
      "Maximum viable investment",
      "Cash mechanism",
      "Review allocation",
      "Issues",
    ],
    p.options.map((o) => {
      const f = o.financial;
      return [
        o.id,
        o.name,
        o.kind,
        o.selected,
        f.status,
        f.investment,
        f.annualOpex,
        f.annualHoursSaved,
        f.fteCapacity,
        f.capacityValue,
        f.annualBenefit,
        f.cashSavings,
        f.firstYearNet,
        f.firstYearCashNet,
        f.npv,
        f.cashNpv,
        f.threeYearNet,
        f.economicRoi ?? metric(null, f, "roi"),
        f.cashRoi ?? metric(null, f, "roi"),
        f.paybackMonths ?? metric(null, f, "payback"),
        f.cashPaybackMonths ?? metric(null, f, "payback"),
        f.breakEvenAdoption ?? metric(null, f, "breakEven"),
        f.maximumViableInvestment,
        o.cashMechanism,
        o.reviewAllocation,
        f.issues.join("; ") || "None",
      ];
    }),
    [6, 7, 10, 11, 12, 13, 14, 15, 16, 17, 23],
  );
  for (const column of [18, 19, 22])
    book.getWorksheet("Options")!.getColumn(column).numFmt = "0.0%";
  table(
    "Assumptions",
    [
      "Record",
      "Option ID",
      "Field",
      "Value",
      "Unit",
      "Provenance",
      "Confidence",
      "Owner",
      "Version",
      "As of",
      "Material",
      "Evidence IDs",
    ],
    [
      ...p.options.flatMap((o) =>
        o.inputs.map((i) => [
          "Saved base input",
          o.id,
          i.field,
          i.value,
          [
            "reduction",
            "adoption",
            "realisation",
            "cashShare",
            "discountRate",
          ].includes(i.field)
            ? "fraction 0–1"
            : i.field === "hourlyCost"
              ? `${p.currency}/hour`
              : i.field,
          "See revision rows",
          "",
          "",
          "",
          p.asOf,
          true,
          "",
        ]),
      ),
      ...p.assumptions.map((a) => [
        "Provenance revision",
        a.optionId,
        a.field,
        a.value,
        a.unit,
        a.provenance,
        a.confidence,
        a.owner,
        a.version,
        a.at,
        a.material,
        a.evidenceIds.join("; "),
      ]),
    ],
  );
  table(
    "Evidence",
    [
      "ID",
      "Title",
      "Excerpt",
      "Source",
      "Locator",
      "Date",
      "Status",
      "Review rationale",
      "Reviewed at",
      "Source version",
      ...(p.includeInternalNotes ? ["Internal note"] : []),
    ],
    p.evidence.map((e) => [
      e.id,
      e.title,
      e.excerpt,
      e.source,
      e.locator,
      e.date,
      e.status,
      e.reviewRationale,
      e.reviewedAt,
      e.version,
      ...(p.includeInternalNotes ? [e.internalNote ?? ""] : []),
    ]),
  );
  table(
    "Costs",
    [
      "Option ID",
      "ID",
      "Name",
      "Category",
      "Amount",
      "Frequency",
      "Start month",
      "End month",
      "Accounting",
    ],
    p.options.flatMap((o) =>
      o.costs.map((c) => [
        o.id,
        c.id,
        c.name,
        c.category,
        c.amount,
        c.frequency,
        c.startMonth,
        c.endMonth,
        c.accounting,
      ]),
    ),
    [5],
  );
  table(
    "Benefits",
    [
      "Option ID",
      "ID",
      "Name",
      "Kind",
      "Annual potential before adoption",
      "Pool",
      "Cash share",
      "Enabled",
      "Overlap resolved",
      "Mechanism",
    ],
    p.options.flatMap((o) =>
      o.benefits.map((b) => [
        o.id,
        b.id,
        b.name,
        b.kind,
        b.annualAmount,
        b.pool,
        b.cashShare,
        b.enabled,
        b.overlapResolved,
        b.mechanism,
      ]),
    ),
    [5],
  );
  book.getWorksheet("Benefits")!.getColumn(7).numFmt = "0.0%";
  table(
    "Monthly flows",
    [
      "Option ID",
      "Alternative",
      "Month",
      "Economic benefit",
      "Cash benefit",
      "Cost",
      "Economic net",
      "Cash net",
      "Cumulative economic",
      "Cumulative cash",
    ],
    p.options.flatMap((o): Value[][] =>
      o.financial.monthly.length
        ? o.financial.monthly.map((m) => [
            o.id,
            o.name,
            m.month,
            m.economicBenefit,
            m.cashBenefit,
            m.cost,
            m.economicNet,
            m.cashNet,
            m.cumulative,
            m.cashCumulative,
          ])
        : [
            [
              o.id,
              o.name,
              "Not assessed",
              null,
              null,
              null,
              null,
              null,
              null,
              null,
            ],
          ],
    ),
    [4, 5, 6, 7, 8, 9, 10],
  );
  const validation = table(
    "Validation",
    ["Field", "Value"],
    p.validation.map((v) => [v.field, v.value]),
  );
  formatMoneyFields(validation, ["budgetCeiling"]);
  table(
    "Methods",
    ["Method", "Definition / result"],
    [
      ...p.methods.map((m) => [m.method, m.definition]),
      [
        "Full text",
        "Text exceeding 30,000 characters continues in the same column on subsequent visible rows. Filters may hide continuation rows; clear filters to read all text.",
      ],
      [
        "Assumption history",
        "Saved base rows are authoritative values. Revision rows preserve the full history, including retired fields. For each option/field the highest version, then latest timestamp, is the latest provenance.",
      ],
      ...p.sensitivity.map((s) => [
        `Sensitivity ${s.field}`,
        `Low-setting NPV: ${p.currency} ${s.low}; high-setting NPV: ${p.currency} ${s.high}`,
      ]),
      ["Sensitivity issue", shown(p.sensitivityIssue || "None")],
    ],
  );
  if (p.tasks.length)
    table(
      "Task model",
      [
        "Option",
        "Activity",
        "Executions/year",
        "Current min",
        "Responsibility",
        "Eligible fraction",
        "Adoption fraction",
        "Handling reference reduction",
        "Selected reduction",
        "Remaining min",
        "Human review min",
        "Exception fraction",
        "Exception min",
        "Evidence IDs",
        "Explicit assumption",
      ],
      p.tasks.map((r) => [
        r.optionName,
        r.name,
        r.annualVolume,
        r.currentMinutes,
        r.responsibility,
        r.eligible,
        r.adoption,
        r.referenceReduction,
        r.selectedReduction,
        r.remainingMinutes,
        r.reviewMinutes,
        r.exceptionRate,
        r.exceptionMinutes,
        r.evidenceIds.join(", "),
        r.assumed,
      ]),
    );
  if (p.questions.length)
    table(
      "Workshop",
      ["Area", "Question", "Answer", "Owner", "Evidence IDs", "Unresolved"],
      p.questions.map((q) => [
        q.area,
        q.question,
        q.answer,
        q.owner,
        q.evidenceIds.join(", "),
        q.unresolved,
      ]),
    );
  if (p.evaluations.length)
    table(
      "Evaluation",
      [
        "Run",
        "Mode",
        "Dataset",
        "Input revision",
        "Input",
        "Expected",
        "Output",
        "Supported",
        "Escalated",
        "Human control",
        "Source references",
        "Timeline",
      ],
      p.evaluations.flatMap((r) =>
        r.cases.map((c) => [
          r.id,
          r.mode,
          r.datasetVersion,
          r.inputRevision,
          c.input,
          c.expected,
          c.output,
          c.supported,
          c.escalated,
          c.control,
          c.sourceRefs.join("; "),
          c.events.map((v) => `${v.stage}: ${v.detail}`).join("\n"),
        ]),
      ),
    );
  if (p.pilots.length) {
    table(
      "Pilot observations",
      [
        "Pilot",
        "Pilot revision ID",
        "Saved at",
        "Owner",
        "Source",
        "Task",
        "Timed count",
        "Manual total min",
        "Handling total min",
        "Review total min",
        "Exceptions",
        "Exception total min",
      ],
      p.pilots.flatMap((pilot) =>
        pilot.observations.map((r) => [
          pilot.name,
          pilot.id,
          pilot.at,
          pilot.owner,
          pilot.source,
          r.task,
          r.sampleCount,
          r.manualMinutes,
          r.handlingMinutes,
          r.reviewMinutes,
          r.exceptions,
          r.exceptionMinutes,
        ]),
      ),
    );
    table(
      "Pilot assessment",
      [
        "Pilot",
        "Pilot revision ID",
        "Saved at",
        "Item",
        "Value",
        "Unit / currency",
      ],
      p.pilots.flatMap((x): Value[][] => {
        const unit = (k: string) =>
          /adoption|successRate|threshold|Roi/.test(k)
            ? "fraction (0–1)"
            : /[Hh]ours/.test(k)
              ? "hours"
              : /[Mm]inutes/.test(k)
                ? "minutes"
                : /[Mm]onths/.test(k)
                  ? "months"
                  : /cases|outcomes|releases/i.test(k)
                    ? "count"
                    : /[Cc]ost|[Bb]udget|spend|npv|Npv|investment|Opex|Net/.test(
                          k,
                        )
                      ? x.currency
                      : "";
        return [
          [x.name, "Captured hourly cost", x.hourlyCost, `${x.currency}/hour`],
          [x.name, "Captured forecast revision", x.forecastRevision],
          [x.name, "Disposition", x.disposition],
          [x.name, "Stale", x.stale],
          [x.name, "Period start", x.startDate],
          [x.name, "Period end", x.endDate],
          [x.name, "Limitations", x.limitations],
          [x.name, "Rationale", x.rationale],
          [x.name, "Eligible cases", x.eligibleCases],
          [x.name, "Assisted cases", x.assistedCases],
          [x.name, "Successful outcomes", x.successfulOutcomes],
          [x.name, "Unsafe releases", x.unsafeReleased],
          [x.name, "Pilot budget", x.budget],
          [x.name, "Non-labour spend", x.nonLabourSpend],
          [x.name, "Other human minutes", x.otherHumanMinutes],
          [x.name, "Adoption threshold", x.thresholds.adoption],
          [x.name, "Success threshold", x.thresholds.successRate],
          ...Object.entries(x.metrics).map(([k, v]): Value[] => [x.name, k, v]),
          ...(
            [
              "annualHoursSaved",
              "investment",
              "annualOpex",
              "npv",
              "cashNpv",
              "firstYearNet",
              "firstYearCashNet",
              "economicRoi",
              "cashRoi",
              "paybackMonths",
              "cashPaybackMonths",
            ] as const
          ).flatMap((k): Value[][] => [
            [x.name, `Original forecast ${k}`, x.forecast[k]],
            [x.name, `Pilot-informed projection ${k}`, x.projected[k]],
          ]),
          ...x.reasons.map((r): Value[] => [x.name, "Condition", r]),
          [
            x.name,
            "Convention",
            "Synthetic matched samples; annualised values are projections. Recorded pilot cost = non-labour spend + (handling + review + exceptions + other human minutes) / 60 × hourly cost. Manual comparator time is excluded. Cash is a subset, not an added benefit.",
          ],
        ].map((r): Value[] => [
          r[0],
          x.id,
          x.at,
          r[1],
          r[2],
          r[3] ?? unit(String(r[1])),
        ]);
      }),
    );
    table(
      "Pilot changes",
      [
        "Pilot",
        "Pilot revision ID",
        "Saved at",
        "Field",
        "Unit",
        "Forecast",
        "Proposed",
        "Application status",
        "Review owner",
        "Review rationale",
      ],
      p.pilots.flatMap((x) =>
        x.changes.map((c) => [
          x.name,
          x.id,
          x.at,
          c.label,
          c.field === "adoption" || c.field.endsWith("exceptionRate")
            ? "fraction (0–1)"
            : "minutes",
          c.before,
          c.after,
          x.applied.length ? `Applied ${x.applied[0].at}` : "Proposed only",
          x.applied[0]?.owner ?? "",
          x.applied[0]?.rationale ?? "",
        ]),
      ),
    );
  }
  // No cell formulas, macros, external links, hidden sheets or raw JSON metadata.
  const bytes: ExcelJS.Buffer = await book.xlsx.writeBuffer();
  return new Blob([new Uint8Array(bytes)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
