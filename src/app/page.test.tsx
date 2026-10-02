import HomePage from "./page";
import { AssessmentWorkbench } from "@/modules/assessment/workbench";

describe("HomePage", () => {
  it("registers the immediate populated synthetic product instead of an auth redirect", () => {
    const page = HomePage();
    expect(page.type).toBe(AssessmentWorkbench);
    expect(page.props.mode).toBe("demo");
  });
});
