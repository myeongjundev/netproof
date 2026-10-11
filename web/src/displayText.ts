import type { Claim } from "./types";

/** 표시 전용 사전. 판정·비교·확인 상태는 호출자가 받은 값을 그대로 쓴다. */
export const RESULT_TEXT = { PASS: "통과", DENY: "막힘", UNSUPPORTED: "판정 불가", INVALID: "입력 오류" } as const;
export const ANSWER_TEXT = { PASS: "된다", DENY: "안 된다" } as const;
export const ACTUAL_TEXT = { PASS: "통과", DENY: "막힘" } as const;
export const COMPARISON_TEXT = { AGREE: "같음", DISAGREE: "다름", NOT_COMPARABLE: "비교 불가", NO_CLAIM: "받은 답 없음" } as const;

export type ClaimContext = "personal" | "stored";

export function claimKindText(kind: Claim["kind"], context: ClaimContext = "stored"): string {
  return kind === "ai" ? "AI 답" : kind === "self" ? context === "personal" ? "내 예상" : "사람 예상" : "종류 미정";
}

export function claimComparisonText(kind: Claim["kind"], context: ClaimContext = "personal"): string {
  return kind ? claimKindText(kind, context) : "받은 답";
}
