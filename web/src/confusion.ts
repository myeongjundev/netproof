import { emptyCaseFilters } from "./caseSearch";
import type { CaseFilters, ConfusionAxis } from "./types";

export const axisNames = { ai: "AI 답", self: "사람 예상", engine: "NetProof 판정" };
export const confusionCells = [
  { key: "tp", predicted: "DENY", actual: "DENY", name: "맞게 잡은 차단" },
  { key: "fp", predicted: "DENY", actual: "PASS", name: "오탐" },
  { key: "fn", predicted: "PASS", actual: "DENY", name: "미탐" },
  { key: "tn", predicted: "PASS", actual: "PASS", name: "맞게 본 통과" },
] as const;

export function confusionCellFilters(axis: ConfusionAxis["axis"], predicted: "PASS" | "DENY", actual: "PASS" | "DENY"): CaseFilters {
  return { ...emptyCaseFilters, confirmed: "1", actual,
    ...(axis === "engine" ? { result: predicted } : { claim_kind: axis, claim_expected: predicted }) };
}
