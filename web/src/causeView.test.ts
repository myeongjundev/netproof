import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { causeName, causeRatio, caseCauseText } from "./causeView";
import { CaseCalculation } from "./pages/CaseDetailPage";
import { blankDraft, toNetwork } from "./draft";
import type { CaseDetail, Result } from "./types";

describe("서버가 준 원인 표시", () => {
  it.each([
    ["acl_rule", "ACL 규칙에서 차단"], ["acl_implicit", "ACL 암묵적 deny(일치 규칙 없음)"],
    ["no_route", "경로 없음"], ["no_gateway", "기본 게이트웨이 없음"],
    ["no_next_hop", "다음 홉 없음"], ["host_no_forward", "호스트가 전달하지 않음"],
    ["routing_loop", "라우팅 루프"], ["no_block", "막는 곳 없음(통과)"],
    ["other", "분류 못 함"], ["old_tag", "분류 못 함"], ["constructor", "분류 못 함"],
  ])("%s", (tag, label) => expect(causeName(tag)).toBe(label));
  it.each([[0, 0, "—"], [0, 3, "0%"], [1, 3, "33%"], [2, 3, "67%"], [3, 3, "100%"]] as const)(
    "비율 %s/%s", (count, total, text) => expect(causeRatio(count, total)).toBe(text));
  it.each(["UNSUPPORTED", "INVALID"] as const)("%s는 원인과 방향을 표시하지 않는다", (result) => {
    expect(caseCauseText(result, { tag: "other", direction: "forward" })).toBeNull();
    expect(caseCauseText(result, { tag: "no_route", direction: "return" })).toBeNull();
  });
  it("판정한 사례는 통계용 태그를 표시하고 방향을 중복하지 않는다", () => {
    expect(caseCauseText("DENY", { tag: "no_route", direction: "return" })).toBe("원인 태그(통계): 경로 없음");
    expect(caseCauseText("PASS", { tag: "no_block", direction: "forward" })).toBe("원인 태그(통계): 막는 곳 없음(통과)");
    expect(caseCauseText("DENY", { tag: "other", direction: "forward" })).toBe("원인 태그(통계): 분류 못 함");
  });
});

function detail(result: Result): CaseDetail {
  const draft = blankDraft();
  return {
    id: 1, owner_id: 1, title: "원인 표시 회귀", author: "작성자", result, comparison: "NO_CLAIM",
    claim_kind: null, actual_result: null, confirmed: false, created_at: "2026-10-06T00:00:00Z",
    network: toNetwork(draft), flow: draft.flow, claim: null, engine_version: "0.1.4",
    actual: { result: null, source: null, note: "" }, confirmed_by: null, confirmed_at: null,
    updated_at: "2026-10-06T00:00:00Z",
    cause: { tag: result === "PASS" ? "no_block" : result === "DENY" ? "no_route" : "other", direction: "forward" },
    verdict: { result, reason: result === "DENY" ? "복귀 방향: 경로 없음" : "엔진이 준 설명",
      problems: [], decisive: null, forward: null, return: null },
  };
}

describe("사례 상세의 실제 판정 블록", () => {
  it.each(["UNSUPPORTED", "INVALID"] as const)("R1: %s 설명은 유지하고 원인 줄은 숨긴다", (result) => {
    const html = renderToStaticMarkup(createElement(CaseCalculation, { item: detail(result) }));
    expect(html).toContain(result === "UNSUPPORTED" ? "판정 불가" : "입력 오류");
    expect(html).toContain("엔진이 준 설명");
    expect(html).not.toContain("case-cause");
    expect(html).not.toContain("원인 태그");
    expect(html).not.toContain("정방향");
  });
  it.each(["PASS", "DENY"] as const)("R2: %s 원인 태그는 판정 카드 안에 있고 방향 문장은 한 번이다", (result) => {
    const html = renderToStaticMarkup(createElement(CaseCalculation, { item: detail(result) }));
    expect(html).toMatch(/^<section class="panel result"/);
    expect(html).toMatch(/<h2 id="result-title">판정 · 원인 태그\(통계\): .+<\/h2>/);
    expect(html).not.toContain("받은 답</h2>");
    expect(html).not.toContain("경로 없음 · 복귀 방향");
    if (result === "DENY") expect(html.match(/복귀 방향: 경로 없음/g)).toHaveLength(1);
  });
});
