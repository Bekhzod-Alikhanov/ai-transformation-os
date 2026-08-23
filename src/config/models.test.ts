import { modelCatalog, routeModel } from "./models";

describe("model routing", () => {
  it("routes work by complexity through versioned configuration", () => {
    expect(routeModel("extraction").id).toBe("gpt-5.6-luna");
    expect(routeModel("structured_analysis").id).toBe("gpt-5.6-terra");
    expect(routeModel("committee_synthesis").id).toBe("gpt-5.6-sol");
    expect(modelCatalog.sol.pricingEffectiveDate).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });
});
