import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NetworkDiagram } from "./NetworkDiagram";
import { breachById, breachDraft, layoutFlow } from "../breach";
import { toNetwork } from "../draft";
import data from "../testFixtures/topology-verdicts.json";
import type { Flow, Network, Verdict } from "../types";

const scenario = breachById("breach-01")!;
const draft = breachDraft(scenario);
const network = toNetwork(draft);
const marks = { WEB: { tone: "breached" as const, text: "뚫림" }, DB: { tone: "reach" as const, text: "닿음 · 서비스 1개" }, ADMIN: { tone: "safe" as const, text: "안 닿음" } };
const render = (props: Partial<Parameters<typeof NetworkDiagram>[0]>) => renderToStaticMarkup(createElement(NetworkDiagram, {
  network, flow: layoutFlow(draft, "WEB"), trace: null, index: 0, selectedDevice: null, onSelectDevice: () => {}, ...props,
}));

it("재생 단계가 없으면 장비 칸에 표시 글과 표시 종류 class를 붙인다", () => {
  const html = render({ marks });
  expect(html).toMatch(/class="topology-device mark-breached"[^>]*>.*?뚫림<\/span>/);
  expect(html).toMatch(/class="topology-device mark-reach"[^>]*>.*?닿음 · 서비스 1개<\/span>/);
  expect(html).toMatch(/class="topology-device mark-safe"[^>]*>.*?안 닿음<\/span>/);
  expect(html).toContain('aria-label="OUTSIDE 장비 보기"');
  expect(html).not.toContain("mark-undefined");
});

it("뚫린 장비 주소에서 시작하는 흐름이면 그 장비가 첫 층에 온다", () => {
  const html = render({ marks });
  expect(html.indexOf('data-topology-key="device:WEB"')).toBeLessThan(html.indexOf('data-topology-key="device:FW"'));
  expect(html.indexOf('data-topology-key="device:WEB"')).toBeLessThan(html.indexOf('data-topology-key="device:OUTSIDE"'));
});

it("경로 재생이 있으면 표시를 쓰지 않고 기존 단계 표시를 유지한다", () => {
  const item = (data as unknown as { network: Network; flow: Flow; verdict: Verdict }[])[0];
  const html = render({ network: item.network, flow: item.flow, trace: item.verdict.forward, index: 0, marks: { PC1: { tone: "breached", text: "뚫림" } } });
  expect(html).not.toContain("mark-breached");
  expect(html).toContain("● 1단계");
});
