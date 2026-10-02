import { AssessmentWorkbench } from "@/modules/assessment/workbench";
export const metadata = { title: "Investment Decision Demonstrator" };
export default function DemoPage() {
  return <AssessmentWorkbench mode="demo" />;
}
