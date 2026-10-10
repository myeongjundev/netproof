import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CaseReview } from "./CaseDetailPage";
import { blankDraft, toNetwork } from "../draft";
import type { CaseDetail, User } from "../types";

const user: User = { id: 1, nickname: "Test", role: "user", role_name: "일반" };
const draft = blankDraft();
const item: CaseDetail = { id: 1, title: "Saved", author: "Test", owner_id: 1, result: "DENY", comparison: "DISAGREE", claim_kind: "self",
  actual_result: null, confirmed: false, created_at: "2026-10-08", updated_at: "2026-10-08", engine_version: "test",
  network: toNetwork(draft), flow: draft.flow, claim: draft.claim, cause: { tag: "acl_rule", direction: "forward" },
  verdict: { result: "DENY", reason: "saved", problems: [], forward: null, return: null,
    decisive: { device: "R1", step: "acl_in", result: "drop", detail: "saved", in_if: null, out_if: null, rule: null, rule_seq: null } },
  actual: { result: null, source: null, note: "" }, confirmed_by: null, confirmed_at: null };
const html = (saved = item, viewer = user) => renderToStaticMarkup(createElement(CaseReview, { item: saved, user: viewer }));

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
  expect(markup).toContain("비교 불가"); expect(markup).toContain("확인 · 범위 밖");
  expect(markup).toContain('href="#/learn"');
});
