import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import data from "../testFixtures/topology-verdicts.json";
import type { Flow, Network, Verdict } from "../types";
import { TracePlayer } from "./TracePlayer";

const fixtures = data as unknown as { id: string; network: Network; flow: Flow; verdict: Verdict }[];
const render = (item = fixtures[0], busy = false) => renderToStaticMarkup(createElement(TracePlayer, { ...item, busy, engineVersion: "0.1.4", onShowAcl: () => {} }));
it.each(fixtures)("$id는 엔진 이유·원래 마지막 단계·저장 버전·전체 원문을 보여 준다", item => {
  const html = render(item);
  expect(html).toContain("저장된 판정 · 엔진 0.1.4"); expect(html).toContain("전체 구성 원문");
  expect(html).toContain("실제 배선 그림이 아닙니다");
  const last = item.verdict.forward?.hops.at(-1);
  if (last) { expect(html).toContain(last.detail); expect(html).toContain('aria-current="step"'); }
  else { expect(html).toContain("재생할 경로 없음"); expect(html).not.toContain('aria-current="step"'); }
});
it("ACL 원문과 기존 입력 보기, one-way 이유, stale/loading 조작 비활성화", () => {
  expect(render()).toContain("선택 규칙 입력에서 보기");
  expect(render({ ...fixtures[0], flow: { ...fixtures[0].flow, mode: "one-way" } })).toContain("one-way 통신: 복귀 경로를 계산하지 않음");
  const html = render(fixtures[0], true);
  expect(html).toMatch(/disabled=""[^>]*>이전/); expect(html).toMatch(/disabled=""[^>]*>재생/);
  expect(html).toMatch(/disabled=""[^>]*>다음/); expect(html).toMatch(/disabled=""[^>]*>정방향/);
});
it("복귀가 결정 근거인 판정에서 정방향에 전체 판정 결정 표시를 붙이지 않는다", () => {
  const html = render(fixtures[1]); expect(html).not.toContain("전체 판정을 결정한 단계");
  expect(html).not.toContain('hop drop decisive');
});
it("중복 식별자는 그림 키를 만들지 않고 원문을 남긴다", () => {
  const html = render({ ...fixtures[0], network: { ...fixtures[0].network, devices: [fixtures[0].network.devices[0], fixtures[0].network.devices[0]] } });
  expect(html).toContain("구성 원문을 표시합니다"); expect(html).not.toContain("data-topology-key");
});
it("큰 구성은 명시적인 경로 모드, trace 없는 큰 구성은 목록으로 전환", () => {
  const network = { ...fixtures[0].network, devices: [...fixtures[0].network.devices,
    ...Array.from({ length: 10 }, (_, i) => ({ id: `extra${i}`, kind: "host" as const, interfaces: [] }))] };
  expect(render({ ...fixtures[0], network })).toContain("큰 구성: 경로 장비만 표시");
  expect(render({ ...fixtures[5], network })).toContain("큰 구성: 그림 대신 경로 목록");
});
