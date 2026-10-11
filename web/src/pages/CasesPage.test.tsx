import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { CasesPage } from "./CasesPage";
import { parseCaseFilters, emptyCaseFilters } from "../caseSearch";
import { useRoute } from "../router";

vi.mock("../router", async () => ({ ...await vi.importActual<typeof import("../router")>("../router"), useRoute: vi.fn(() => ({ page: "cases" })) }));
afterEach(() => vi.mocked(useRoute).mockReturnValue({ page: "cases" }));

it("복습 바로가기는 내 예상·실제 불일치·실제 미정의 서로 다른 조건을 사용한다", () => {
  const markup = renderToStaticMarkup(createElement(CasesPage));
  expect(markup).toContain('aria-label="다시 살펴보기"');
  expect(markup).toContain("flex-wrap:wrap");
  expect(markup).toContain('href="#/cases?mine=1&amp;claim_kind=self&amp;comparison=DISAGREE"');
  expect(markup).toContain('href="#/cases?mine=1&amp;actual_mismatch=1"');
  expect(markup).toContain('href="#/cases?mine=1&amp;actual=none"');
  expect(parseCaseFilters("mine=1&claim_kind=self&comparison=DISAGREE")).toEqual({ ...emptyCaseFilters, mine: true, claim_kind: "self", comparison: "DISAGREE" });
  expect(parseCaseFilters("mine=1&actual_mismatch=1")).toEqual({ ...emptyCaseFilters, mine: true, actual_mismatch: "1" });
  expect(parseCaseFilters("mine=1&actual=none")).toEqual({ ...emptyCaseFilters, mine: true, actual: "none" });
});
it("새 선택 조건은 접힌 개수·선택 값·적용 문구에 반영된다", () => {
  vi.mocked(useRoute).mockReturnValue({ page: "cases", query: "mine=1&actual_mismatch=1" });
  const markup = renderToStaticMarkup(createElement(CasesPage));
  expect(markup).toContain("필터 (적용 1개)");
  expect(markup).toContain('<option value="1" selected="">다름</option>');
  expect(markup).toContain("내 사례만 · 계산과 실제 결과 다름");
});
it("계산·실제·받은 답은 기존 필터 값을 유지하며 다른 문구로 표시한다", () => {
  vi.mocked(useRoute).mockReturnValue({ page: "cases", query: "result=DENY&comparison=DISAGREE&actual=DENY&claim_kind=none&claim_expected=DENY" });
  const markup = renderToStaticMarkup(createElement(CasesPage));
  expect(markup).toContain("필터 (적용 5개)");
  expect(markup.match(/<option value="DENY" selected="">막힘<\/option>/g)).toHaveLength(2);
  expect(markup).toContain('<option value="DENY" selected="">안 된다</option>');
  expect(markup).toContain('<option value="DISAGREE" selected="">다름</option>');
  expect(markup).toContain('<option value="none" selected="">종류 미정</option>');
  expect(markup).toContain("판정 막힘 · 받은 답과 판정 다름 · 실제 결과 막힘 · 받은 답 종류 종류 미정 · 받은 답 안 된다");
  expect(markup).toContain('<option value="NO_CLAIM">받은 답 없음</option>');
  expect(markup).toContain('<option value="UNSUPPORTED">판정 불가</option>');
  expect(markup).toContain('<option value="INVALID">입력 오류</option>');
  expect(markup).not.toMatch(/>차단<|>일치<|>불일치<|>종류 없음</);
});
