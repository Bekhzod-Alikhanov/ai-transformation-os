import PptxGenJS from "pptxgenjs";

import { opportunities, pilots } from "@/modules/demo/aster-data";
import { formatCompactCurrency } from "@/lib/utils";

const colours = {
  canvas: "F3F2EC",
  ink: "20221E",
  cobalt: "3157D5",
  teal: "25806A",
  amber: "A1701F",
  crimson: "A43D36",
  muted: "6D7067",
  line: "DEDFD9",
  white: "FFFFFF",
};

function title(
  slide: PptxGenJS.Slide,
  eyebrow: string,
  heading: string,
  description?: string,
) {
  slide.addText(eyebrow.toUpperCase(), {
    x: 0.65,
    y: 0.4,
    w: 5.5,
    h: 0.2,
    fontFace: "Inter",
    fontSize: 8,
    bold: true,
    color: colours.muted,
    charSpacing: 1.4,
    margin: 0,
  });
  slide.addText(heading, {
    x: 0.65,
    y: 0.72,
    w: 11.7,
    h: 0.45,
    fontFace: "Inter",
    fontSize: 24,
    bold: true,
    color: colours.ink,
    margin: 0,
    breakLine: false,
  });
  if (description)
    slide.addText(description, {
      x: 0.65,
      y: 1.25,
      w: 10.8,
      h: 0.35,
      fontFace: "Inter",
      fontSize: 10,
      color: colours.muted,
      margin: 0,
    });
}

function footer(slide: PptxGenJS.Slide, page: number) {
  slide.addText("ASTER FINANCIAL GROUP · SYNTHETIC REPLAY", {
    x: 0.65,
    y: 7.12,
    w: 5,
    h: 0.16,
    fontFace: "Inter",
    fontSize: 7,
    color: "8A8D84",
    charSpacing: 1.1,
    margin: 0,
  });
  slide.addText(String(page).padStart(2, "0"), {
    x: 12.1,
    y: 7.12,
    w: 0.5,
    h: 0.16,
    align: "right",
    fontFace: "Inter",
    fontSize: 7,
    color: "8A8D84",
    margin: 0,
  });
}

export async function generateSteeringPack() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Aster AI Transformation OS";
  pptx.subject = "Evidence-backed AI transformation steering pack";
  pptx.title = "Aster AI Transformation Steering Pack";
  pptx.company = "Aster Financial Group · Synthetic Replay";
  pptx.theme = { headFontFace: "Inter", bodyFontFace: "Inter" };
  pptx.defineSlideMaster({
    title: "ASTER",
    background: { color: colours.canvas },
    objects: [
      {
        line: {
          x: 0.65,
          y: 6.96,
          w: 12,
          h: 0,
          line: { color: colours.line, width: 0.75 },
        },
      },
    ],
    slideNumber: {
      x: 12.2,
      y: 7.1,
      color: "8A8D84",
      fontFace: "Inter",
      fontSize: 7,
    },
  });

  const cover = pptx.addSlide("ASTER");
  cover.addShape(pptx.ShapeType.rect, {
    x: 0.65,
    y: 0.65,
    w: 0.12,
    h: 5.85,
    fill: { color: colours.cobalt },
    line: { transparency: 100 },
  });
  cover.addText("AI TRANSFORMATION\nSTEERING PACK", {
    x: 1.1,
    y: 1.2,
    w: 7.2,
    h: 1.55,
    fontFace: "Inter",
    fontSize: 34,
    bold: true,
    color: colours.ink,
    margin: 0,
    breakLine: false,
  });
  cover.addText("Evidence-led decisions · 22 August 2026", {
    x: 1.1,
    y: 3.0,
    w: 6,
    h: 0.35,
    fontFace: "Inter",
    fontSize: 13,
    color: colours.muted,
    margin: 0,
  });
  cover.addText("SYNTHETIC ENTERPRISE REPLAY", {
    x: 1.1,
    y: 3.65,
    w: 2.8,
    h: 0.28,
    fontFace: "Inter",
    fontSize: 8,
    bold: true,
    color: colours.teal,
    charSpacing: 1.3,
    margin: 0,
  });
  cover.addText("Aster Financial Group", {
    x: 1.1,
    y: 5.75,
    w: 4,
    h: 0.3,
    fontFace: "Inter",
    fontSize: 11,
    bold: true,
    color: colours.ink,
    margin: 0,
  });
  footer(cover, 1);

  const summary = pptx.addSlide("ASTER");
  title(
    summary,
    "Executive control room",
    "Portfolio at a glance",
    "Aster's portfolio is creating value; adoption remains the most material execution constraint.",
  );
  const metrics = [
    ["VALUE AT STAKE", "$8.4M", colours.cobalt],
    ["REALISED RUN-RATE", "$1.9M", colours.teal],
    ["ACTIVE INITIATIVES", "12", colours.ink],
    ["DECISIONS REQUIRED", "4", colours.amber],
  ];
  metrics.forEach(([label, value, colour], index) => {
    const x = 0.65 + index * 3.05;
    summary.addShape(pptx.ShapeType.roundRect, {
      x,
      y: 1.9,
      w: 2.8,
      h: 1.25,
      rectRadius: 0.05,
      fill: { color: colours.white },
      line: { color: colours.line, width: 0.7 },
    });
    summary.addText(label, {
      x: x + 0.18,
      y: 2.12,
      w: 2.4,
      h: 0.18,
      fontFace: "Inter",
      fontSize: 7,
      bold: true,
      color: colours.muted,
      charSpacing: 1,
      margin: 0,
    });
    summary.addText(value, {
      x: x + 0.18,
      y: 2.48,
      w: 2.4,
      h: 0.4,
      fontFace: "Inter",
      fontSize: 24,
      bold: true,
      color: colour,
      margin: 0,
    });
  });
  summary.addText("Three decisions for steering attention", {
    x: 0.65,
    y: 3.75,
    w: 5.5,
    h: 0.3,
    fontFace: "Inter",
    fontSize: 15,
    bold: true,
    color: colours.ink,
    margin: 0,
  });
  [
    [
      "01",
      "Scale Customer Support Copilot with adoption conditions",
      "44% adoption vs 70% target",
      colours.amber,
    ],
    [
      "02",
      "Fund Client Reporting 90-day proof of value",
      "$1.1M risk-adjusted annual value",
      colours.cobalt,
    ],
    [
      "03",
      "Stop Autonomous Trading Recommendation",
      "Risk policy gate: 94 / 100",
      colours.crimson,
    ],
  ].forEach(([number, heading, detail, colour], index) => {
    const y = 4.25 + index * 0.72;
    summary.addText(number, {
      x: 0.65,
      y,
      w: 0.4,
      h: 0.25,
      fontSize: 9,
      bold: true,
      color: colour,
      margin: 0,
    });
    summary.addText(heading, {
      x: 1.15,
      y,
      w: 6.9,
      h: 0.25,
      fontFace: "Inter",
      fontSize: 11,
      bold: true,
      color: colours.ink,
      margin: 0,
    });
    summary.addText(detail, {
      x: 8.4,
      y,
      w: 3.8,
      h: 0.25,
      fontFace: "Inter",
      fontSize: 9,
      color: colours.muted,
      margin: 0,
    });
  });
  footer(summary, 2);

  const portfolio = pptx.addSlide("ASTER");
  title(
    portfolio,
    "Portfolio",
    "Prioritised opportunity slate",
    "Deterministic scoring uses editable weights; evidence coverage remains separate.",
  );
  portfolio.addTable(
    opportunities
      .slice(0, 9)
      .map((item) => [
        item.title,
        item.businessUnit,
        formatCompactCurrency(item.annualValue),
        String(item.score),
        `${Math.round(item.evidenceCoverage * 100)}%`,
        item.classification.replaceAll("_", " "),
      ])
      .map((row) => row.map((text) => ({ text }))),
    {
      x: 0.65,
      y: 1.8,
      w: 12,
      h: 4.6,
      border: { type: "solid", color: colours.line, pt: 0.6 },
      fill: { color: colours.white },
      color: colours.ink,
      fontFace: "Inter",
      fontSize: 8,
      margin: 0.08,
      rowH: 0.42,
      colW: [3.4, 2, 1.2, 0.7, 0.8, 1.6],
      bold: false,
    },
  );
  footer(portfolio, 3);

  const hero = pptx.addSlide("ASTER");
  title(
    hero,
    "Hero decision",
    "Client Status Reporting Automation",
    "Conditional go · evidence-backed business case revised by CFO Red Team.",
  );
  [
    ["ORIGINAL VALUE", "$1.6M", colours.muted],
    ["RISK-ADJUSTED", "$1.1M", colours.teal],
    ["EVIDENCE", "86%", colours.cobalt],
    ["CONSENSUS", "68%", colours.amber],
  ].forEach(([label, value, colour], index) => {
    const x = 0.65 + index * 3.05;
    hero.addText(label, {
      x,
      y: 1.85,
      w: 2.5,
      h: 0.2,
      fontFace: "Inter",
      fontSize: 7,
      bold: true,
      color: colours.muted,
      charSpacing: 1,
      margin: 0,
    });
    hero.addText(value, {
      x,
      y: 2.2,
      w: 2.5,
      h: 0.45,
      fontFace: "Inter",
      fontSize: 25,
      bold: true,
      color: colour,
      margin: 0,
    });
  });
  hero.addShape(pptx.ShapeType.roundRect, {
    x: 0.65,
    y: 3.1,
    w: 12,
    h: 2.6,
    rectRadius: 0.05,
    fill: { color: "FFFAF0" },
    line: { color: "EAD9AE", width: 0.8 },
  });
  hero.addText("CFO RED TEAM CHALLENGE", {
    x: 0.95,
    y: 3.4,
    w: 3,
    h: 0.2,
    fontFace: "Inter",
    fontSize: 8,
    bold: true,
    color: colours.amber,
    charSpacing: 1.2,
    margin: 0,
  });
  hero.addText(
    "Released capacity was incorrectly counted as full cash savings.",
    {
      x: 0.95,
      y: 3.85,
      w: 7.2,
      h: 0.4,
      fontFace: "Inter",
      fontSize: 17,
      bold: true,
      color: colours.ink,
      margin: 0,
    },
  );
  hero.addText(
    "Conditions: verify source entitlements · demonstrate 65% adoption · measure redeployability · retain human publication approval",
    {
      x: 0.95,
      y: 4.65,
      w: 10.8,
      h: 0.45,
      fontFace: "Inter",
      fontSize: 10,
      color: colours.muted,
      breakLine: false,
      margin: 0,
    },
  );
  footer(hero, 4);

  const value = pptx.addSlide("ASTER");
  title(
    value,
    "Measure",
    "Pilot value and adoption",
    "Value is accepted only when baseline, source, period, and owner are verified.",
  );
  value.addTable(
    pilots.map((pilot) =>
      [
        pilot.name,
        `Days ${pilot.phase}`,
        `${Math.round(pilot.actualAdoption * 100)}% / ${Math.round(pilot.targetAdoption * 100)}%`,
        formatCompactCurrency(pilot.realisedRunRate),
        pilot.recommendation.replaceAll("_", " "),
      ].map((text) => ({ text })),
    ),
    {
      x: 0.65,
      y: 1.8,
      w: 12,
      h: 3.2,
      border: { type: "solid", color: colours.line, pt: 0.6 },
      fill: { color: colours.white },
      color: colours.ink,
      fontFace: "Inter",
      fontSize: 9,
      margin: 0.1,
      rowH: 0.45,
      colW: [3.6, 1.4, 2, 1.5, 2.1],
    },
  );
  value.addText("$1.9M", {
    x: 0.65,
    y: 5.45,
    w: 2.5,
    h: 0.55,
    fontFace: "Inter",
    fontSize: 30,
    bold: true,
    color: colours.teal,
    margin: 0,
  });
  value.addText("realised annual run-rate", {
    x: 0.65,
    y: 6.06,
    w: 2.5,
    h: 0.2,
    fontFace: "Inter",
    fontSize: 9,
    color: colours.muted,
    margin: 0,
  });
  value.addText("Steering recommendation", {
    x: 4.2,
    y: 5.5,
    w: 2.6,
    h: 0.2,
    fontFace: "Inter",
    fontSize: 8,
    bold: true,
    color: colours.muted,
    charSpacing: 1,
    margin: 0,
  });
  value.addText(
    "Scale proven pilots; repair adoption before expanding the support copilot.",
    {
      x: 4.2,
      y: 5.9,
      w: 7.5,
      h: 0.55,
      fontFace: "Inter",
      fontSize: 15,
      bold: true,
      color: colours.ink,
      margin: 0,
    },
  );
  footer(value, 5);

  return Buffer.from(
    (await pptx.write({ outputType: "nodebuffer" })) as ArrayBuffer,
  );
}
