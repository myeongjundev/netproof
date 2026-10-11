import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DashboardPage } from "./DashboardPage";
import type { Dashboard } from "../types";

const fixture = vi.hoisted(() => ({ data: null as Dashboard | null, index: 0 }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useState: (initial: unknown) => actual.useState(fixture.index++ === 0 ? fixture.data : initial) };
});
const data: Dashboard = {
  total: 9, confirmed: 3, unsupported: 1, invalid: 2, confirmed_in_scope: 2, agree: 1, ai_confirmed: 1, ai_wrong: 1,
  mismatches: [{ id: 7, title: "사용자 일치·차단 제목", author: "test", result: "PASS", comparison: "DISAGREE", claim_kind: "self", actual_result: "DENY", confirmed: true, created_at: "2026-10-11" }], mismatches_total: 1,
  confusion: { positive: "DENY", axes: ["ai", "self", "engine"].map(axis => ({ axis: axis as "ai" | "self" | "engine", tp: 1, fp: 2, fn: 3, tn: 4, total: 10, excluded: { not_confirmed: 5, no_actual: 6, no_prediction: 7 } })) },
  causes: { denominator: 2, disagree_total: 2, top: [{ tag: "acl_rule", count: 1, return_count: 1 }], rest: 0, other: { tag: "other", count: 1, return_count: 0 }, excluded: { agree: 3, no_claim: 4, not_comparable: 5 }, claim_kinds: { ai: 1, self: 1, unknown: 0 }, limit: 5000, limited: false },
};
function render(value = data) {
  fixture.data = value; fixture.index = 0;
  return renderToStaticMarkup(createElement(DashboardPage));
}
it("표시만 통일하며 혼동 행렬의 수·분모·필터 링크·양성 정의를 유지한다", () => {
  const html = render();
  expect(html).toContain("범위 안 · 실제와 같음"); expect(html).toContain("1 / 2");
  expect(html).toContain("양성은 통신 차단(DENY)");
  expect(html).toContain("막힘(DENY)"); expect(html).toContain("통과(PASS)");
  expect(html.match(/같음 5 \/ 10건 · 50%/g)).toHaveLength(3);
  expect(html.match(/제외: 미확인 5 · 미정 6 · 예측 없음 7/g)).toHaveLength(3);
  expect(html).toContain('claim_kind=self&amp;claim_expected=DENY');
  expect(html).toContain('result=DENY'); expect(html).toContain('actual=PASS');
  expect(html).toContain("사람 예상 1건"); expect(html).toContain("종류 미정 0건");
  expect(html).toContain("같음(AGREE) 3건 · 받은 답 없음(NO_CLAIM) 4건 · 비교 불가(NOT_COMPARABLE) 5건");
  expect(html).toContain("사용자 일치·차단 제목");
  expect(html).toContain("실제 막힘"); expect(html).not.toContain("실제 DENY");
});
it("확인·분모가 없으면 같은 결과의 비율을 새로 만들지 않는다", () => {
  const html = render({ ...data, confirmed: 0, confirmed_in_scope: 0, agree: 0 });
  expect(html).toContain("아직 확인된 사례가 없습니다");
  expect(html).toContain("0 / 0"); expect(html).toContain("같은 결과의 비율이 채워집니다");
});
