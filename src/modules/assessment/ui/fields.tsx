import { useId, type ReactNode } from "react";
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  required = false,
}: {
  label: string;
  value: string | number | null;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  required?: boolean;
}) {
  const id = useId();
  const props = {
    id,
    "aria-labelledby": `${id}-label`,
    value:
      typeof value === "number" && !Number.isFinite(value) ? "" : (value ?? ""),
    required,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
  };
  return (
    <label className="aw-field" htmlFor={id}>
      <span id={`${id}-label`}>{label}</span>
      {multiline ? (
        <textarea {...props} rows={3} />
      ) : (
        <input
          {...props}
          type={type}
          min={type === "number" ? "0" : undefined}
          step={type === "number" ? "any" : undefined}
        />
      )}
    </label>
  );
}
export function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <label className="aw-field">
      <span id={id}>{label}</span>
      <select
        aria-labelledby={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
export function ErrorMessage({ error }: { error: string }) {
  return error ? (
    <p className="aw-error" role="alert">
      {error}
    </p>
  ) : null;
}
export const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "The operation failed. Your saved record is unchanged.";
export function downloadBackup(
  text: string,
  name = "assessment-workspace-backup.json",
) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
