import type { CaseSummary, Comparison, Result } from "../types";
import { ACTUAL_TEXT, COMPARISON_TEXT, RESULT_TEXT } from "../displayText";

export function ResultBadge({ result }: { result: Result }) {
  return <span className={`badge r-${result.toLowerCase()}`}>{RESULT_TEXT[result]}</span>;
}

export function ComparisonBadge({ comparison }: { comparison: Comparison }) {
  const tone = comparison === "AGREE" ? "good" : comparison === "DISAGREE" ? "bad" : "plain";
  return <span className={`badge ${tone}`}>{COMPARISON_TEXT[comparison]}</span>;
}

export function ActualBadge({ item }: { item: Pick<CaseSummary, "actual_result" | "confirmed" | "result"> }) {
  if (!item.actual_result) return <span className="badge plain">안 적음</span>;
  if (!item.confirmed) return <span className="badge plain">확인 전 · {ACTUAL_TEXT[item.actual_result]}
    {(item.result === "PASS" || item.result === "DENY") && (item.actual_result === item.result ? " · 판정과 같음" : " · 판정과 다름")}</span>;
  if (item.result !== "PASS" && item.result !== "DENY") return <span className="badge warn">확인 · 비교 불가</span>;
  return item.actual_result === item.result ? (
    <span className="badge good">확인 · 판정과 같음</span>
  ) : (
    <span className="badge bad">확인 · 판정과 다름</span>
  );
}
