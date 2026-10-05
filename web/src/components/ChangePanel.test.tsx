import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChangePanel } from "./ChangePanel";
import { blankDraft, toNetwork } from "../draft";
import type { ChangeHistory } from "../changeView";
import type { ChangeImpact, Verdict } from "../types";

const draft = blankDraft();
const verdict: Verdict = { result: "DENY", reason: "engine before", problems: [], forward: null, return: null, decisive: null, comparison: "AGREE" };
const judgment = { network: toNetwork(draft), flow: draft.flow, verdict };
const history: ChangeHistory = { before: judgment, last: { ...judgment, verdict: { ...verdict, reason: "engine after" } } };
const response: ChangeImpact = { status: "OK", problems: [], limit_exceeded: false, engine_version: "test", mode: "session",
  services: [{ proto: "tcp", dst_port: 443, key: "tcp/443", label: "HTTPS" }], changes: [],
  totals: { checks: 9, changed: 0, opened: 0, closed: 0, other: 0, not_compared: 0 } };
const props = { history, result: null, error: null, loading: false, stale: false, disabled: false, onCalculate: () => {} };
const render = (patch: Partial<Parameters<typeof ChangePanel>[0]> = {}) => renderToStaticMarkup(createElement(ChangePanel, { ...props, ...patch }));

it("기준이 없으면 숨기고 두 엔진 이유를 나란히 표시한다", () => {
  expect(render({ history: { last: judgment, before: null } })).toBe("");
  const html = render(); expect(html).toContain("변경 전: 막힘 — engine before");
  expect(html).toContain("변경 후: 막힘 — engine after");
  expect(html).not.toMatch(/바뀌었다|같다|정답|안전합니다/);
});
it("요약·범위·비교하지 않은 통신은 엔진 개수 그대로다", () => {
  const html = render({ result: { ...response, mode: "one-way", totals: { ...response.totals, opened: 7, closed: 8, other: 9, not_compared: 10 } } });
  expect(html).toContain("새로 열린 통신 7개 · 새로 막힌 통신 8개 · 그 밖의 변화 9개");
  expect(html).toContain("검사 9건 · HTTPS · 한 방향"); expect(html).toContain("끝점이 바뀌어 비교하지 않은 통신 10건");
  expect(html).toContain("검사한 범위에서 결과가 바뀐 다른 통신이 없습니다.");
  expect(html).toContain("안전을 보장하지 않으며, 실제 장비 결과가 아닙니다.");
});
it("모순 응답을 재분류하지 않고 목록 순서·30줄 제한·나머지 엔진 개수를 따른다", () => {
  const changes = Array.from({ length: 32 }, (_, i) => ({ src: `10.0.0.${i}`, dst: "10.0.1.1", src_device: `H${i}`, dst_device: "S",
    service: "tcp/443", kind: "closed" as const, before: verdict, after: { ...verdict, reason: `reason${i}` } }));
  const html = render({ result: { ...response, changes, totals: { ...response.totals, changed: 32, closed: 32 } } });
  expect(html).toContain("새로 막힌 통신 32개"); expect(html.match(/<li>/g)).toHaveLength(30);
  expect(html).toContain("막힘 → 막힘"); expect(html).toContain("reason29"); expect(html).not.toContain("reason30");
  expect(html).toContain("외 2건"); expect(html.indexOf("H0(")).toBeLessThan(html.indexOf("H1("));
});
it.each(["stale", "disabled", "loading"] as const)("%s 중 단추를 막는다", flag => {
  const html = render({ [flag]: true }); expect(html).toMatch(/<button[^>]*disabled/);
  if (flag === "stale") expect(html).toContain("이전 입력의 비교입니다. 다시 판정해 주세요.");
  if (flag === "loading") expect(html).toContain("계산 중…");
});
it("오류·INVALID 원문과 계산 뒤 안내를 그대로 보인다", () => {
  expect(render({ error: "검사 2001건: 최대 2000건입니다" })).toContain("검사 2001건: 최대 2000건입니다");
  const html = render({ result: { ...response, status: "INVALID", problems: ["변경 전 구성: bad"] } });
  expect(html).toContain("변경 전 구성: bad"); expect(html).toContain("안전을 보장하지 않으며");
  expect(html).not.toContain("검사한 범위에서 결과가 바뀐 다른 통신이 없습니다.");
});
