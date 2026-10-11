import { ACTUAL_TEXT, ANSWER_TEXT, COMPARISON_TEXT, RESULT_TEXT, claimComparisonText, claimKindText } from "./displayText";

it("계산·받은 답·실제 결과·비교 값을 각각 표시한다", () => {
  expect(RESULT_TEXT).toEqual({ PASS: "통과", DENY: "막힘", UNSUPPORTED: "판정 불가", INVALID: "입력 오류" });
  expect(ANSWER_TEXT).toEqual({ PASS: "된다", DENY: "안 된다" });
  expect(ACTUAL_TEXT).toEqual({ PASS: "통과", DENY: "막힘" });
  expect(COMPARISON_TEXT).toEqual({ AGREE: "같음", DISAGREE: "다름", NOT_COMPARABLE: "비교 불가", NO_CLAIM: "받은 답 없음" });
});
it.each(["ai", "self", null, undefined] as const)("종류 %s의 개인·저장·미정 문맥을 구분한다", kind => {
  const personal = kind === "ai" ? "AI 답" : kind === "self" ? "내 예상" : "종류 미정";
  const stored = kind === "ai" ? "AI 답" : kind === "self" ? "사람 예상" : "종류 미정";
  expect(claimKindText(kind, "personal")).toBe(personal);
  expect(claimKindText(kind, "stored")).toBe(stored);
  expect(claimComparisonText(kind)).toBe(kind ? personal : "받은 답");
  expect(claimComparisonText(kind, "stored")).toBe(kind ? stored : "받은 답");
});
