import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResultPanel } from "./ResultPanel";
import type { Flow, Network, Verdict } from "../types";
import { EMPTY_CLAIM } from "../draft";
import data from "../testFixtures/topology-verdicts.json";

const network: Network = { devices: [], acls: {} };
const flow: Flow = { src: "10.0.0.1", dst: "10.0.0.2", proto: "icmp", mode: "session" };
const verdict: Verdict = { result: "PASS", reason: "engine 원문", problems: [], decisive: null, return: null, comparison: "NO_CLAIM",
  forward: { delivered: true, reason: "engine 원문", hops: [{ device: "A", step: "deliver", result: "ok", detail: "엔진 단계 설명", in_if: null, out_if: null, rule: null, rule_seq: null }] } };
it.each(["PASS", "DENY", "INVALID", "UNSUPPORTED"] as const)("사실 표시 %s는 원문·RAW 결과와 기존 재생을 보이며 축하 문구가 없다", result => {
  const html = renderToStaticMarkup(createElement(ResultPanel, { verdict: { ...verdict, result, problems: ["엔진 문제 원문"] }, network, flow, claim: EMPTY_CLAIM, stale: false, error: null, loading: false, factual: true }));
  expect(html).toContain(`엔진 결과: ${result}`); expect(html).toContain("engine 원문"); expect(html).toContain("엔진 문제 원문"); expect(html).toContain("구성도 · 경로 재생");
  expect(html).not.toMatch(/통과|완료|성공|정답|점수|%|comparison-banner|badge|verdict pass/);
});
it("기존 결과 화면의 표현은 그대로이고 사실 표시는 이전 입력의 조작을 막는다", () => {
  const props = { verdict, claim: EMPTY_CLAIM, stale: false, error: null, loading: false };
  expect(renderToStaticMarkup(createElement(ResultPanel, props))).toContain("통과");
  const html = renderToStaticMarkup(createElement(ResultPanel, { ...props, network, flow, stale: true, factual: true }));
  expect(html).toContain("이전 결과"); expect(html).toMatch(/disabled=""[^>]*>재생/);
});
it.each(data)("현재 엔진 응답 $id의 고치기 근거에도 채점 표현이 없다", item => {
  const html = renderToStaticMarkup(createElement(ResultPanel, { ...item, verdict: item.verdict as Verdict, network: item.network as Network, flow: item.flow as Flow, claim: EMPTY_CLAIM, stale: false, error: null, loading: false, factual: true }));
  expect(html).not.toMatch(/통과|완료|성공|정답|점수|%|comparison-banner|badge/);
});
