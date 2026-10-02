import { expect, it } from "vitest";
import { confusionCellFilters } from "./confusion";
import { caseSearchParams } from "./caseSearch";

for (const axis of ["ai", "self", "engine"] as const) {
  for (const [predicted, actual] of [["DENY", "DENY"], ["DENY", "PASS"], ["PASS", "DENY"], ["PASS", "PASS"]] as const) {
    it(`${axis}: 예측 ${predicted} · 실제 ${actual} 사례만 연결한다`, () => {
      const params = Object.fromEntries(new URLSearchParams(caseSearchParams(confusionCellFilters(axis, predicted, actual), 1)));
      expect(params).toEqual({ page: "1", per_page: "20", confirmed: "1", actual,
        ...(axis === "engine" ? { result: predicted } : { claim_kind: axis, claim_expected: predicted }) });
    });
  }
}
