import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Field, Select } from "./fields";
it("labels a selector without including the text of its options", () => {
  render(
    <Select label="Engagement" value="support" onChange={() => {}}>
      <option value="support">Support</option>
      <option value="reporting">Reporting</option>
    </Select>,
  );
  expect(screen.getByLabelText("Engagement", { exact: true })).toBe(
    screen.getByRole("combobox", { name: "Engagement" }),
  );
  expect(screen.getByText("Engagement").id).not.toBe("");
});
it("uses only the field caption as a multiline label, not its entered text", () => {
  render(
    <Field
      label="Validation stop criteria"
      value="Next decision date"
      multiline
      onChange={() => {}}
    />,
  );
  expect(screen.getByText("Validation stop criteria").id).not.toBe("");
  expect(
    screen.getByLabelText("Validation stop criteria", { exact: true }),
  ).toHaveValue("Next decision date");
});
