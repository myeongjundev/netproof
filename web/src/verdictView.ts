import type { Claim, Verdict } from "./types";

const titles = { PASS: "통과", DENY: "막힘", INVALID: "입력 오류", UNSUPPORTED: "판정 불가" };

/** Display only the comparison supplied by the engine; never compare the answers here. */
export function comparisonBanner(verdict: Verdict | null, claim: Claim): { tone: "agree" | "disagree"; text: string } | null {
  if (!verdict || !claim.expected || (verdict.result !== "PASS" && verdict.result !== "DENY")) return null;
  const who = claim.kind === "ai" ? "AI 답이" : claim.kind === "self" ? "내 예상이" : "받은 답이";
  if (verdict.comparison === "AGREE") return { tone: "agree", text: `✓ ${who} NetProof 계산과 같습니다` };
  if (verdict.comparison === "DISAGREE") return { tone: "disagree", text: `✕ ${who} NetProof 계산과 다릅니다` };
  return null;
}

export function statusLine(verdict: Verdict | null, claim: Claim, loading: boolean): string {
  if (loading) return "계산 중…";
  if (!verdict) return "";
  const banner = comparisonBanner(verdict, claim);
  return `${banner ? `${banner.text} · ` : ""}NetProof 계산 ${titles[verdict.result]}`;
}
