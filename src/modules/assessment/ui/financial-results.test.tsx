import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { createTemplate } from "../templates";
import { calculateOption } from "../economics";
import { FinancialResults } from "./financial-results";
it("distinguishes calculated payback not reached from unassessed payback", () => {
  const o = createTemplate("reporting").opportunities[0];
  const r = calculateOption(o.options[2], o.options[0]);
  const view = render(
    <FinancialResults result={r} currency="USD" title="Results" />,
  );
  expect(
    screen.getByText("Cash payback (months)").nextElementSibling,
  ).toHaveTextContent("Not reached within 36 months");
  o.options[2].inputs.adoption = null;
  view.rerender(
    <FinancialResults
      result={calculateOption(o.options[2], o.options[0])}
      currency="USD"
      title="Results"
    />,
  );
  expect(
    screen.getByText("Cash payback (months)").nextElementSibling,
  ).toHaveTextContent("Not assessed");
});
it("distinguishes undefined ROI on a zero-investment reference from incomplete results", () => {
  const o = createTemplate("support").opportunities[0],
    bau = o.options[0];
  const view = render(
    <FinancialResults
      result={calculateOption(bau, bau)}
      currency="USD"
      title="BAU"
    />,
  );
  expect(
    screen.getByText("Economic ROI (year 1)").nextElementSibling,
  ).toHaveTextContent("Not defined (no positive initial investment)");
  expect(
    screen.getByText("Cash ROI (year 1)").nextElementSibling,
  ).toHaveTextContent("Not defined (no positive initial investment)");
  bau.inputs.hourlyCost = null;
  view.rerender(
    <FinancialResults
      result={calculateOption(bau, bau)}
      currency="USD"
      title="BAU"
    />,
  );
  expect(
    screen.getByText("Economic ROI (year 1)").nextElementSibling,
  ).toHaveTextContent("Not assessed");
});
