import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BreachPage } from "./BreachPage";
import { api } from "../api";
import { breachById, breachDraft, breachSpec } from "../breach";
import { toNetwork } from "../draft";
import responses from "../testFixtures/breach-responses.json";
import type { ChangeImpact, Draft, Network, PolicyMatrix, Verdict } from "../types";

// FixExercisePage.test.tsx와 같은 훅 대역: 렌더를 함수 호출로 돌리고 effect는 직접 비운다.
const fixture = vi.hoisted(() => ({ enabled: false, states: [] as any[], refs: [] as any[], effects: [] as any[], queue: [] as (() => void)[], s: 0, r: 0, e: 0 }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual,
    useState: (initial: any) => {
      if (!fixture.enabled) return actual.useState(initial);
      const i = fixture.s++; if (!(i in fixture.states)) fixture.states[i] = typeof initial === "function" ? initial() : initial;
      return [fixture.states[i], (value: any) => { fixture.states[i] = typeof value === "function" ? value(fixture.states[i]) : value; }];
    },
    useRef: (initial: any) => fixture.enabled ? (fixture.refs[fixture.r++] ??= { current: initial }) : actual.useRef(initial),
    useMemo: (make: () => any, deps: any[]) => fixture.enabled ? make() : actual.useMemo(make, deps),
    useEffect: (effect: () => any, deps: any[]) => {
      if (!fixture.enabled) return actual.useEffect(effect, deps);
      const i = fixture.e++, old = fixture.effects[i];
      if (!old || deps.some((value, index) => !Object.is(value, old.deps[index]))) {
        fixture.effects[i] = { deps, cleanup: old?.cleanup };
        fixture.queue.push(() => { old?.cleanup?.(); fixture.effects[i].cleanup = effect(); });
      }
    },
  };
});

const scenario = breachById("breach-01")!;
const start = responses.start as unknown as PolicyMatrix;
const narrowed = responses.narrowed as unknown as PolicyMatrix;
const impact = responses.narrowedImpact as unknown as ChangeImpact;
const verdict: Verdict = { result: "PASS", comparison: "NO_CLAIM", reason: "engine response", problems: [], forward: null, return: null, decisive: null };
const isStart = (network: Network) => JSON.stringify(network) === JSON.stringify(toNetwork(breachDraft(scenario)));
beforeEach(() => {
  vi.spyOn(api, "policyMatrix").mockImplementation(async (network) => (isStart(network) ? start : narrowed));
  vi.spyOn(api, "changeImpact").mockResolvedValue(impact);
  vi.spyOn(api, "verify").mockResolvedValue(verdict);
});
afterEach(() => { fixture.enabled = false; fixture.states = []; fixture.refs = []; fixture.effects = []; fixture.queue = []; vi.restoreAllMocks(); });

function findAll(node: unknown, test: (node: ReactElement<any>) => boolean): ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap((item) => findAll(item, test));
  if (!isValidElement<any>(node)) return [];
  return [...(test(node) ? [node] : []), ...findAll(node.props.children, test)];
}
function text(node: unknown): string {
  // 화면 글 조각을 끼워 넣는 공백 없이 그대로 잇는다("WEB" + "을" → "WEB을").
  if (Array.isArray(node)) return node.map(text).join("");
  if (isValidElement<any>(node)) return text(node.props.children);
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}
function driver(initial: Draft = breachDraft(scenario)) {
  fixture.enabled = true;
  let draft = initial;
  const onImport = vi.fn();
  const setDraft = vi.fn((update: (current: Draft) => Draft) => { draft = update(draft); });
  const render = () => { fixture.s = 0; fixture.r = 0; fixture.e = 0; return BreachPage({ id: scenario.id, draft, setDraft, onImport }); };
  const effects = async () => { for (const effect of fixture.queue.splice(0)) effect(); for (let i = 0; i < 4; i++) await Promise.resolve(); };
  const button = (label: string) => findAll(render(), (node) => node.type === "button" && text(node).includes(label))[0];
  const check = async () => { render(); await effects(); await button("확인하기").props.onClick(); render(); await effects(); return text(render()); };
  return { render, effects, button, check, onImport, setDraft, get draft() { return draft; } };
}

it("확인 전: 상황·역할·지켜야 할 서비스·예상을 보이고 계산을 요청하지 않는다", () => {
  const html = renderToStaticMarkup(createElement(BreachPage, { id: scenario.id, draft: breachDraft(scenario), setDraft: () => {}, onImport: () => {} }));
  expect(html).toContain(`<h1>${scenario.title}</h1>`);
  expect(html).toContain(scenario.story); expect(html).toContain(scenario.task);
  expect(html).toContain("서비스가 실제로 열려 있는지, 취약한지는 계산하지 않습니다.");
  expect(html).toContain("학교 홈페이지 서버(PHP) · 뚫림");
  for (const keep of scenario.keep) { expect(html).toContain(keep.label); expect(html).toContain(keep.why); }
  expect(html).toContain("WEB에서 시작한 연결이 닿을 것 같은 장비");
  expect(html.match(/type="radio"/g)).toHaveLength(3 * 2);
  expect(html).toContain("확인 전");
  expect(html).not.toMatch(/완료|성공|정답|점수|%|축하/);
  expect(api.policyMatrix).not.toHaveBeenCalled();
});

it("구성을 준비하기 전에는 편집기 대신 준비 중을 알린다", () => {
  const html = renderToStaticMarkup(createElement(BreachPage, { id: scenario.id, draft: undefined, setDraft: () => {}, onImport: () => {} }));
  expect(html).toContain("구성을 준비하는 중");
});

it("첫 확인은 지금·처음 매트릭스와 변경 영향을 정확한 본문으로 한 번씩 요청한다", async () => {
  const page = driver();
  await page.check();
  expect(api.policyMatrix).toHaveBeenCalledTimes(2);
  for (const call of vi.mocked(api.policyMatrix).mock.calls) expect(call[1]).toEqual(breachSpec(scenario));
  expect(api.changeImpact).toHaveBeenCalledTimes(1);
  const [before, after, flow, services] = vi.mocked(api.changeImpact).mock.calls[0];
  expect(isStart(before)).toBe(true); expect(isStart(after)).toBe(true);
  expect(flow).toMatchObject({ src: "203.0.113.10", dst: "10.0.10.10", proto: "tcp", dst_port: 443, mode: "session" });
  expect(services).toEqual(scenario.services);
});

it("처음 구성 결과: 3곳·15개, 예상 비교, 서비스별 근거 단추", async () => {
  const page = driver();
  page.render();
  findAll(page.render(), (node) => node.type === "input" && node.props.name === "guess-DB" && node.props.value === "safe")[0].props.onChange();
  const shown = await page.check();
  expect(shown).toContain("처음 구성 3곳 · 서비스 15개 → 지금 3곳 · 서비스 15개");
  expect(shown).toContain("예상과 다름"); expect(shown).toContain("예상 안 함");
  expect(findAll(page.render(), (node) => node.type === "button" && String(node.props.className).includes("reach-service"))).toHaveLength(15);
});

it("규칙을 고친 뒤 확인: 처음 구성은 다시 요청하지 않고 전/후·지켜야 할 서비스·바뀐 통신을 엔진 분류 그대로 보인다", async () => {
  const page = driver();
  await page.check();
  page.setDraft((current) => ({ ...current, devices: current.devices.map((device) => device.id === "FW" ? { ...device, interfaces: device.interfaces.map((iface) =>
    iface.name === "em1" ? { ...iface, rules_in: [{ action: "pass" as const, proto: "tcp" as const, src: "10.0.10.10", dst: "10.0.20.10", dst_port: "22" }] } : iface) } : device) }));
  expect(text(page.render())).toContain("이전 결과");
  const shown = await page.check();
  expect(api.policyMatrix).toHaveBeenCalledTimes(3);
  expect(shown).toContain("처음 구성 3곳 · 서비스 15개 → 지금 1곳 · 서비스 1개");
  expect(shown).toContain("WEB → DB · MySQL · 막혔습니다");
  expect(shown).toContain("OUTSIDE → WEB · HTTPS · 그대로 됩니다");
  expect(shown.match(/새로 막힘 · WEB →/g)).toHaveLength(14);
  expect(shown).toContain("그 밖의 변화 0건");
});

it("근거 단추는 그 칸의 흐름·지금 구성으로만 verify를 부른다", async () => {
  const page = driver();
  await page.check();
  const button = findAll(page.render(), (node) => node.type === "button" && text(node).includes("근거 보기") && text(node).includes("DB · MySQL"))[0];
  await button.props.onClick();
  const [network, flow] = vi.mocked(api.verify).mock.calls[0];
  expect(isStart(network)).toBe(true);
  expect(flow).toEqual({ src: "10.0.10.10", dst: "10.0.20.10", proto: "tcp", dst_port: 3306, mode: "session" });
});

it("뚫린 장비를 지우면 다른 장비를 대신 고르지 않고 찾지 못했다고 알린다", async () => {
  const draft = breachDraft(scenario);
  const page = driver({ ...draft, devices: draft.devices.filter((device) => device.id !== "WEB") });
  vi.mocked(api.policyMatrix).mockImplementation(async (network) => (isStart(network) ? start : { ...narrowed, endpoints: narrowed.endpoints.filter((e) => e.device !== "WEB") }));
  const shown = await page.check();
  expect(shown).toContain("구성에서 뚫린 장비 WEB을 찾을 수 없습니다");
});

it("입력을 바꾼 뒤 늦게 온 확인 응답은 버린다", async () => {
  let resolve!: (value: PolicyMatrix) => void;
  vi.mocked(api.policyMatrix).mockImplementation(async (network) => isStart(network) ? start : await new Promise<PolicyMatrix>((done) => { resolve = done; }));
  const draft = breachDraft(scenario);
  const page = driver({ ...draft, devices: draft.devices.map((device) => device.id === "ADMIN" ? { ...device, id: "ADMIN2" } : device) });
  page.render(); await page.effects();
  const pending = page.button("확인하기").props.onClick();
  page.setDraft((current) => ({ ...current, devices: [...current.devices] , acls: [{ name: "x", text: "" }] }));
  page.render(); await page.effects();
  resolve(narrowed); await pending; page.render(); await page.effects();
  expect(text(page.render())).not.toContain("지금 1곳");
});

it("판정기로 가져가기는 지금 구성의 복사본을 넘긴다", () => {
  const page = driver();
  page.button("판정기로 가져가기").props.onClick();
  expect(page.onImport).toHaveBeenCalledWith(page.draft);
  expect(page.onImport.mock.calls[0][0]).not.toBe(page.draft);
});

it("그 밖의 변화 이유의 방화벽 미대조 끝 문장은 떼고 한 번만 보인다", async () => {
  const tag = ". 제한된 상태 추적 모델이며 실제 pfSense 장비와 대조하지 않았습니다";
  const other = { src: "10.0.30.10", dst: "10.0.10.10", src_device: "ADMIN", dst_device: "WEB", service: "tcp/22", kind: "closed" as const,
    before: { result: "PASS", reason: "before", decisive: null }, after: { result: "DENY", reason: `정방향: em3 in: 기본 정책으로 차단${tag}`, decisive: null } };
  vi.mocked(api.changeImpact).mockResolvedValue({ ...impact, changes: [...impact.changes, other] } as ChangeImpact);
  const shown = await driver().check();
  expect(shown).toContain("그 밖의 변화 1건"); expect(shown).toContain("정방향: em3 in: 기본 정책으로 차단");
  expect(shown.match(/실제 pfSense 장비와 대조하지 않았습니다/g)).toHaveLength(1);
  expect(shown).not.toContain(`차단${tag}`); expect(shown).toContain("방화벽 단계는 제한된 상태 추적 모델로 계산했습니다");
});
