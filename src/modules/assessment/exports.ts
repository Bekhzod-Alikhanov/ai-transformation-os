export {
  prepareExport,
  prepareSelection,
  type ExportPayload,
} from "./exports/payload";
export { investmentBrief } from "./exports/brief";
export { createAssessmentWorkbook } from "./exports/workbook";
export { createSteeringPack } from "./exports/slides";

export function downloadArtifact(blob: Blob, filename: string) {
  if (typeof window === "undefined")
    throw new Error(
      "Downloads require a browser. Open the workbench and retry.",
    );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  try {
    a.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
