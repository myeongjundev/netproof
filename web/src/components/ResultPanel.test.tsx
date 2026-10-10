import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResultPanel } from "./ResultPanel";
import type { Flow, Network, Verdict } from "../types";
import { EMPTY_CLAIM } from "../draft";
import data from "../testFixtures/topology-verdicts.json";

const fixtures = data as unknown as { network: Network; flow: Flow; verdict: Verdict; id: string }[];
it.each(fixtures)("$id의 답 없는 일반 근거 패널은 엔진 원문과 기존 재생만 보인다", item => {
  const html = renderToStaticMarkup(createElement(ResultPanel, { ...item, claim: EMPTY_CLAIM, stale: false, error: null, loading: false }));
  expect(html).toContain(item.verdict.reason); expect(html).toContain("구성도 · 경로 재생");
  expect(html).not.toMatch(/완료|성공|정답|점수|%|comparison-banner|badge/);
  item.verdict.problems.forEach(problem => expect(html).toContain(problem));
});
it("PASS의 통과 문구·원문을 유지하고 이전 근거의 재생은 비활성화한다", () => {
  const item = fixtures[3];
  const html = renderToStaticMarkup(createElement(ResultPanel, { ...item, claim: EMPTY_CLAIM, stale: true, error: null, loading: false }));
  expect(html).toContain("통과"); expect(html).toContain(item.verdict.reason); expect(html).toContain("이전 결과");
  expect(html).toMatch(/disabled=""[^>]*>재생/);
});
