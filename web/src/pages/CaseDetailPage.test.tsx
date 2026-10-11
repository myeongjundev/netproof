import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CaseCalculation, CaseClaimInfo, CaseReview } from "./CaseDetailPage";
import { blankDraft, toNetwork } from "../draft";
import type { CaseDetail, Claim, Comparison, User } from "../types";

const metadata = (saved: CaseDetail) => renderToStaticMarkup(createElement(CaseClaimInfo, { item: saved }));
const calculation = (saved: CaseDetail) => renderToStaticMarkup(createElement(CaseCalculation, { item: saved }));

const user: User = { id: 1, nickname: "Test", role: "user", role_name: "일반" };
const draft = blankDraft();
const item: CaseDetail = { id: 1, title: "Saved", author: "Test", owner_id: 1, result: "DENY", comparison: "DISAGREE", claim_kind: "self",
  actual_result: null, confirmed: false, created_at: "2026-10-08", updated_at: "2026-10-08", engine_version: "test",
  network: toNetwork(draft), flow: draft.flow, claim: draft.claim, cause: { tag: "acl_rule", direction: "forward" },
  verdict: { result: "DENY", reason: "saved", problems: [], forward: null, return: null,
    decisive: { device: "R1", step: "acl_in", result: "drop", detail: "saved", in_if: null, out_if: null, rule: null, rule_seq: null } },
  actual: { result: null, source: null, note: "" }, confirmed_by: null, confirmed_at: null };
const html = (saved = item, viewer = user) => renderToStaticMarkup(createElement(CaseReview, { item: saved, user: viewer }));

it("사례 계산은 저장된 판정과 엔진 버전을 그림에 표시하고 재판정하지 않는다", () => {
  const markup = renderToStaticMarkup(createElement(CaseCalculation, { item }));
  expect(markup).toContain("저장된 판정 · 엔진 test"); expect(markup).toContain("전체 구성 원문"); expect(markup).toContain("재생할 경로 없음");
});

it("관련 개념과 서로 다른 두 비교를 저장된 값으로 표시한다", () => {
  const markup = html();
  expect(markup).toContain('aria-labelledby="case-review-title"');
  expect(markup).toContain('href="#/learn/https-acl"');
  expect(markup).toContain("원인 태그로 고른 주제입니다. 정답이나 채점이 아닙니다.");
  expect(markup).toContain("받은 답과 계산:"); expect(markup).toContain("사람 예상과 계산"); expect(markup).toContain(">다름</span>");
  expect(markup).toContain("계산과 실제 결과:"); expect(markup).toContain(">안 적음</span>");
  expect(markup).toContain("복제해 다시 풀기");
});
it("관련 주제를 모르는 사례는 학습실로만 연결한다", () => {
  const markup = html({ ...item, cause: { tag: "other", direction: "forward" } });
  expect(markup).toContain('href="#/learn"'); expect(markup).toContain("학습실에서 개념 살펴보기");
  expect(markup).not.toContain('href="#/learn/https-acl"');
});
it("실제 결과 없음 안내는 작성자에게만 표시한다", () => {
  expect(html()).toContain("실제 결과가 아직 없습니다");
  expect(html(item, { ...user, id: 2, role: "reviewer" })).not.toContain("실제 결과가 아직 없습니다");
  expect(html({ ...item, actual_result: "PASS", actual: { result: "PASS", source: "ping", note: "observed" } })).not.toContain("실제 결과가 아직 없습니다");
});
it("비교 불가와 관측 확인 상태도 기존 배지 의미를 유지한다", () => {
  const markup = html({ ...item, result: "UNSUPPORTED", comparison: "NOT_COMPARABLE", actual_result: "PASS", confirmed: true });
  expect(markup).toContain("비교 불가"); expect(markup).toContain("확인 · 비교 불가");
  expect(markup).toContain('href="#/learn"');
});
it("다시 살펴보기에서도 확인 전 불일치는 중립 배지로 보인다", () => {
  const markup = html({ ...item, result: "DENY", actual_result: "PASS", confirmed: false });
  expect(markup).toContain('<span class="badge plain">확인 전 · 통과 · 판정과 다름</span>');
});

describe.each(["ai", "self", null, undefined] as const)("상세의 종류 %s 보존", kind => {
  it.each(["PASS", "DENY"] as const)("답 %s의 비교 머리와 예외 표시를 같은 조건으로 고른다", expected => {
    const claim: Claim = { expected, source: "고유 출처 · 불일치 PASS", text: "고유 내용 · 차단 DENY", ...(kind !== undefined ? { kind } : {}) };
    const answer = expected === "PASS" ? "된다" : "안 된다";
    const kindText = kind === "ai" ? "AI 답" : kind === "self" ? "사람 예상" : "종류 미정";
    for (const result of ["PASS", "DENY", "UNSUPPORTED", "INVALID"] as const) {
      for (const comparison of ["AGREE", "DISAGREE", "NOT_COMPARABLE", "NO_CLAIM", undefined] as const) {
        // 결과/답이 같아도 DISAGREE, 달라도 AGREE를 그대로 보여야 한다.
        const saved = { ...item, claim, comparison: comparison as Comparison, verdict: { ...item.verdict, result, reason: "원문 일치·차단", problems: ["원문 불일치"] } };
        const info = metadata(saved), calc = calculation(saved);
        const versus = (result === "PASS" || result === "DENY") && !!comparison && comparison !== "NO_CLAIM";
        expect(calc.includes('class="versus"')).toBe(versus);
        expect(info.includes("<dt>종류</dt>")).toBe(!versus);
        expect(info.includes("<dt>답</dt>")).toBe(!versus);
        if (!versus) { expect(info).toContain(kindText); expect(info).toContain(`<dd>${answer}</dd>`); }
        else {
          expect(calc).toContain(`<strong>${answer}</strong>`);
          expect(calc).toContain(`class="side-label">${kind ? kindText : "받은 답"}</span>`);
          if (comparison === "AGREE") expect(calc).toContain("받은 답과 계산이 같습니다.");
          if (comparison === "DISAGREE") expect(calc).toContain("받은 답과 계산이 다릅니다.");
          if (comparison === "NOT_COMPARABLE") expect(calc).toContain("계산이 판정을 못 해 비교하지 않았습니다.");
        }
        expect(info + calc).not.toContain("내 예상");
        expect(info.match(/고유 출처 · 불일치 PASS/g)).toHaveLength(1);
        expect(info.match(/고유 내용 · 차단 DENY/g)).toHaveLength(1);
        expect(calc).not.toContain("고유 출처"); expect(calc).not.toContain("고유 내용");
        expect(calc).toContain("원문 일치·차단"); expect(calc).toContain("원문 불일치");
        if (result === "UNSUPPORTED" || result === "INVALID") expect(calc).not.toContain('class="comparison-banner');
      }
    }
  });
});
it("상세의 별도 result가 아니라 계산 패널과 같은 verdict·comparison을 읽는다", () => {
  const claim: Claim = { expected: "PASS", kind: "self", source: "", text: "" };
  const saved = { ...item, result: "INVALID" as const, claim, comparison: "AGREE" as const,
    verdict: { ...item.verdict, result: "PASS" as const, comparison: "NO_CLAIM" as const } };
  expect(calculation(saved)).toContain('class="versus"');
  expect(metadata(saved)).not.toContain("<dt>답</dt>");
  const fallback = { ...saved, result: "PASS" as const, verdict: { ...saved.verdict, result: "INVALID" as const } };
  expect(calculation(fallback)).not.toContain('class="versus"');
  expect(metadata(fallback)).toContain("<dt>답</dt><dd>된다</dd>");
});
it.each([null, { expected: null, source: "숨겨진 메모", text: "숨겨진 내용", kind: "self" }] as const)("답 없는 상세는 %j에서 비교를 만들지 않는다", claim => {
  const saved = { ...item, claim };
  expect(metadata(saved)).toContain("이 사례에는 받은 답이 없습니다.");
  expect(metadata(saved)).not.toContain("<dl");
  expect(calculation(saved)).not.toContain('class="versus"');
});
it("빈 선택 메모는 두 필드에 적지 않음으로 표시한다", () => {
  expect(metadata({ ...item, claim: { expected: "PASS", kind: "ai", source: "", text: "" } }).match(/적지 않음/g)).toHaveLength(2);
});
