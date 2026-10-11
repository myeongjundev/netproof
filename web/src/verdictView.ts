import type { Claim, Verdict } from "./types";
import { ANSWER_TEXT, RESULT_TEXT, claimComparisonText, type ClaimContext } from "./displayText";

/** ResultPanel의 기존 비교 머리 조건. comparison을 새로 계산하지 않는다. */
export function showsComparisonHeader(verdict: Verdict | null, claim: Claim): verdict is Verdict & { comparison: "AGREE" | "DISAGREE" | "NOT_COMPARABLE" } {
  return !!verdict && (verdict.result === "PASS" || verdict.result === "DENY")
    && !!verdict.comparison && verdict.comparison !== "NO_CLAIM" && !!claim.expected;
}

/** Display only the comparison supplied by the engine; never compare the answers here. */
export function comparisonBanner(verdict: Verdict | null, claim: Claim, context: ClaimContext = "personal"): { tone: "agree" | "disagree"; text: string; hint?: string } | null {
  if (!verdict || !claim.expected || (verdict.result !== "PASS" && verdict.result !== "DENY")) return null;
  const answer = `${claimComparisonText(claim.kind, context)}(${ANSWER_TEXT[claim.expected]})과`;
  if (verdict.comparison === "AGREE") return { tone: "agree", text: `= ${answer} NetProof 계산이 같습니다` };
  if (verdict.comparison === "DISAGREE") return {
    tone: "disagree", text: `≠ ${answer} NetProof 계산(${RESULT_TEXT[verdict.result]})이 다릅니다`,
    hint: "아래 경로와 ACL 근거에서 이유를 확인해 보세요.",
  };
  return null;
}

export function statusLine(verdict: Verdict | null, claim: Claim, loading: boolean, context: ClaimContext = "personal"): string {
  if (loading) return "계산 중…";
  if (!verdict) return "";
  const banner = comparisonBanner(verdict, claim, context);
  return `${banner ? `${banner.text} · ` : ""}NetProof 계산 ${RESULT_TEXT[verdict.result]}`;
}
