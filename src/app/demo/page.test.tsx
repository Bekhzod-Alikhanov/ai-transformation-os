import DemoPage from "./page";
import { AssessmentWorkbench } from "@/modules/assessment/workbench";

describe("DemoPage", () => {
  it("uses the same product in the isolated demonstration namespace, without a provider session", () => {
    const page = DemoPage();
    expect(page.type).toBe(AssessmentWorkbench);
    expect(page.props.mode).toBe("demo");
  });
});
