import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JudgePage, acceptJudgeImport, focusJudgeResult } from "./JudgePage";
import { FlowForm } from "../components/FlowForm";
import { NetworkEditor } from "../components/NetworkEditor";
import { SettingsPage } from "./SettingsPage";
import { blankDraft, fromCase, toNetwork } from "../draft";
import { api } from "../api";
import type { CaseItem, Draft } from "../types";
import type { ChangeImpact, Verdict } from "../types";
import { ChangePanel } from "../components/ChangePanel";
import { ResultPanel } from "../components/ResultPanel";

// SSR는 문구를, 훅 단위 하네스는 실제 load/restore 콜백을 검사한다.
// DOM·포커스·React 생명주기 통합 검증은 별도 실제 브라우저 QA에서 한다.
const fixture = vi.hoisted(() => ({ items: null as CaseItem[] | null, controller: false, caseCount: undefined as number | undefined,
  states: [] as unknown[], refs: [] as { current: unknown }[], effects: [] as (() => unknown)[], stateIndex: 0, refIndex: 0 }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual,
    useState: (initial: unknown) => {
      if (!fixture.controller) return actual.useState(initial === null && fixture.caseCount !== undefined ? fixture.caseCount : Array.isArray(initial) && initial.length === 0 && fixture.items ? fixture.items : initial);
      const index = fixture.stateIndex++;
      if (!(index in fixture.states)) fixture.states[index] = typeof initial === "function" ? initial() : initial;
      return [fixture.states[index], (value: unknown) => { fixture.states[index] = typeof value === "function" ? value(fixture.states[index]) : value; }];
    },
    useRef: (initial: unknown) => fixture.controller ? (fixture.refs[fixture.refIndex++] ??= { current: initial }) : actual.useRef(initial),
    useMemo: (make: () => unknown, deps: unknown[]) => fixture.controller ? make() : actual.useMemo(make, deps),
    useCallback: (callback: () => unknown, deps: unknown[]) => fixture.controller ? callback : actual.useCallback(callback, deps),
    useEffect: (effect: () => unknown, deps: unknown[]) => fixture.controller ? fixture.effects.push(effect) : actual.useEffect(effect as () => void, deps),
  };
});
afterEach(() => {
  fixture.items = null; fixture.controller = false; fixture.caseCount = undefined; fixture.states = []; fixture.refs = []; fixture.effects = [];
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function find(node: unknown, test: (item: ReactElement<Record<string, any>>) => boolean): ReactElement<Record<string, any>> | undefined {
  if (Array.isArray(node)) return node.map(item => find(item, test)).find(Boolean);
  if (!isValidElement<Record<string, any>>(node)) return;
  return test(node) ? node : find(node.props.children, test);
}

// 실제 컴포넌트의 load 콜백을 재호출한다. DOM 생명주기는 브라우저 QA가 맡는다.
function judgeHarness(initial: Draft, items: CaseItem[], signedIn = false) {
  fixture.controller = true; fixture.states = [items];
  let draft = structuredClone(initial);
  const render = (pendingImport?: { draft: Draft; label: string }) => {
    fixture.stateIndex = 0; fixture.refIndex = 0; fixture.effects = [];
    return JudgePage({ user: signedIn ? { id: 1, nickname: "qa", role: "user", role_name: "동기" } : null, draft, setDraft: update => { draft = update(draft); }, pendingImport });
  };
  return { render, current: () => draft };
}

const engineVerdict: Verdict = { result: "DENY", comparison: "AGREE", reason: "engine", problems: [], decisive: null, forward: null, return: null };
const impactResponse: ChangeImpact = { status: "OK", problems: [], limit_exceeded: false, engine_version: "test", mode: "session", services: [], changes: [],
  totals: { checks: 7, changed: 0, opened: 0, closed: 0, other: 0, not_compared: 0 } };
const changePanel = (tree: unknown) => find(tree, node => node.type === ChangePanel)!;
const judgeButton = (tree: unknown) => find(tree, node => node.type === "button" && ["판정하기", "다시 판정하기"].includes(node.props.children))!;
const editAcl = (tree: unknown, text: string) => find(tree, node => node.type === NetworkEditor)!.props.onAcls([{ name: "A", text }]);

it("판정기의 재생 입력은 이전 판정의 network·flow를 유지하고 새 응답에서 함께 갱신된다", async () => {
  vi.stubGlobal("requestAnimationFrame", vi.fn()); vi.spyOn(api, "verify").mockResolvedValue(engineVerdict); vi.spyOn(api, "aclAudit").mockResolvedValue(null as any);
  const h = judgeHarness(blankDraft(), []); await judgeButton(h.render()).props.onClick();
  const panel = () => find(h.render(), node => node.type === ResultPanel)!;
  const old = structuredClone({ network: panel().props.network, flow: panel().props.flow });
  find(h.render(), node => node.type === FlowForm)!.props.onFlow({ ...h.current().flow, dst_port: 80 });
  expect(panel().props.stale).toBe(true); expect({ network: panel().props.network, flow: panel().props.flow }).toEqual(old);
  await judgeButton(h.render()).props.onClick(); expect(panel().props.flow.dst_port).toBe(80);
});

it("판정기 구성 변경은 직전 기준, 받은 답만 바꾸면 유지, 통신 변경은 지운다", async () => {
  vi.stubGlobal("requestAnimationFrame", vi.fn()); vi.spyOn(api, "verify").mockResolvedValue(engineVerdict);
  vi.spyOn(api, "aclAudit").mockResolvedValue(null as any);
  const h = judgeHarness(blankDraft(), []);
  await judgeButton(h.render()).props.onClick(); expect(changePanel(h.render()).props.history.before).toBeNull();
  editAcl(h.render(), "deny ip any any"); await judgeButton(h.render()).props.onClick();
  const history = changePanel(h.render()).props.history;
  expect(history.before.network).toEqual(toNetwork(blankDraft())); expect(history.last.network.acls.A).toEqual(["deny ip any any"]);
  find(h.render(), node => node.type === FlowForm)!.props.onClaim({ ...h.current().claim, expected: "PASS" });
  await judgeButton(h.render()).props.onClick(); expect(changePanel(h.render()).props.history.before).toBe(history.before);
  find(h.render(), node => node.type === FlowForm)!.props.onFlow({ ...h.current().flow, dst_port: 80 });
  await judgeButton(h.render()).props.onClick(); expect(changePanel(h.render()).props.history.before).toBeNull();
});
it("판정기 영향 요청은 직전·지금 구성과 기본 다섯 서비스만 보내고 재판정에서 지운다", async () => {
  vi.stubGlobal("requestAnimationFrame", vi.fn()); vi.spyOn(api, "verify").mockResolvedValue(engineVerdict); vi.spyOn(api, "aclAudit").mockResolvedValue(null as any);
  const impact = vi.spyOn(api, "changeImpact").mockResolvedValue(impactResponse); const h = judgeHarness(blankDraft(), []);
  await judgeButton(h.render()).props.onClick(); const before = toNetwork(h.current()); editAcl(h.render(), "deny ip any any");
  await judgeButton(h.render()).props.onClick(); expect(impact).not.toHaveBeenCalled();
  await changePanel(h.render()).props.onCalculate();
  expect(impact.mock.calls[0].slice(0, 3)).toEqual([before, toNetwork(h.current()), h.current().flow]); expect(impact.mock.calls[0][3]).toHaveLength(5);
  expect(changePanel(h.render()).props.result).toBe(impactResponse);
  await judgeButton(h.render()).props.onClick(); expect(changePanel(h.render()).props.result).toBeNull();
});
it.each(["success", "error"])("판정기 영향의 늦은 %s는 편집·복구/재판정 뒤 폐기된다", async outcome => {
  vi.stubGlobal("requestAnimationFrame", vi.fn()); vi.spyOn(api, "verify").mockResolvedValue(engineVerdict); vi.spyOn(api, "aclAudit").mockResolvedValue(null as any);
  let finish!: (value?: any) => void;
  vi.spyOn(api, "changeImpact").mockImplementation(() => new Promise((resolve, reject) => { finish = outcome === "success" ? resolve : reject; }));
  const h = judgeHarness(blankDraft(), []); await judgeButton(h.render()).props.onClick(); editAcl(h.render(), "deny ip any any"); await judgeButton(h.render()).props.onClick();
  const pending = changePanel(h.render()).props.onCalculate(); editAcl(h.render(), "permit ip any any"); editAcl(h.render(), "deny ip any any");
  await judgeButton(h.render()).props.onClick(); finish(outcome === "success" ? impactResponse : new Error("late")); await pending;
  expect(changePanel(h.render()).props.result).toBeNull(); expect(changePanel(h.render()).props.error).toBeNull();
});
it("판정기 실패는 기억을 유지하고 불러오기는 양쪽 기준을 지운다", async () => {
  vi.stubGlobal("requestAnimationFrame", vi.fn()); const verify = vi.spyOn(api, "verify").mockResolvedValue(engineVerdict); vi.spyOn(api, "aclAudit").mockResolvedValue(null as any);
  const item = example(); const h = judgeHarness(blankDraft(), [item]); await judgeButton(h.render()).props.onClick();
  const last = changePanel(h.render()).props.history.last; editAcl(h.render(), "deny ip any any");
  verify.mockRejectedValueOnce(new Error("failed")); await judgeButton(h.render()).props.onClick(); expect(changePanel(h.render()).props.history.last).toBe(last);
  expect(changePanel(h.render()).props.stale).toBe(true);
  await judgeButton(h.render()).props.onClick(); expect(changePanel(h.render()).props.history.before).toBe(last);
  exampleButton(h.render()).props.onClick(); expect(changePanel(h.render()).props.history).toEqual({ last: null, before: null });
});
it("F24 빈 구성 판정 뒤 제목만 있어도 복구 가능, 같은 입력 재불러오기는 제목을 보존한다", async () => {
  vi.stubGlobal("requestAnimationFrame", vi.fn()); vi.spyOn(api, "verify").mockResolvedValue(engineVerdict);
  const h = judgeHarness(blankDraft(), [example()], true); await judgeButton(h.render()).props.onClick();
  const titleInput = () => find(h.render(), node => node.type === "input" && node.props.maxLength === 80)!;
  titleInput().props.onChange({ target: { value: "저장 제목" } }); h.render(); exampleButton(h.render()).props.onClick();
  expect(find(h.render(), node => node.props.className === "undo-notice")).toBeDefined();
  find(h.render(), node => node.type === "button" && node.props.children === "되돌리기")!.props.onClick();
  await judgeButton(h.render()).props.onClick(); expect(titleInput().props.value).toBe("저장 제목");
  find(h.render(), node => node.type === "button" && node.props.children === "처음 구성")!.props.onClick();
  await judgeButton(h.render()).props.onClick(); expect(titleInput().props.value).toBe("저장 제목");
});
function example(id = "synthetic-01"): CaseItem {
  const draft = blankDraft(); draft.flow.dst_port = 22;
  return { id, title: "풀이 제목은 알림에 쓰지 않음", source: "test", network: toNetwork(draft), flow: draft.flow };
}
function exampleButton(tree: unknown, number = "01") {
  return find(tree, item => item.type === "button" && Array.isArray(item.props.children) && item.props.children[1] === number)!;
}

it.each([[undefined, "사례가"], [0, "사례 0건이"], [4, "사례 4건이"]] as const)("계정 삭제 안내는 사례 개수 %s에 맞는 고정 조사다", (count, words) => {
  fixture.caseCount = count;
  const html = renderToStaticMarkup(createElement(SettingsPage, { user: { id: 1, nickname: "qa_author", role: "user", role_name: "동기" }, onUser: () => {}, onSignedOut: () => {} }));
  expect(html).toContain(`계정과 내가 저장한 ${words} 함께 지워지고 되돌릴 수 없습니다.`);
  expect(html).not.toContain("사례이 함께");
});

it.each(["예시", "처음 구성", "JSON", "가져오기"])("손대지 않은 빈 템플릿의 %s 불러오기는 되돌리기 알림이 없다", channel => {
  const item = example(); const harness = judgeHarness(blankDraft(), [item]);
  let tree = harness.render();
  if (channel === "예시") exampleButton(tree).props.onClick();
  else if (channel === "처음 구성") find(tree, node => node.type === "button" && node.props.children === "처음 구성")!.props.onClick();
  else if (channel === "JSON") {
    find(tree, node => node.type === "textarea" && !node.props.readOnly)!.props.onChange({ target: { value: JSON.stringify(item) } });
    tree = harness.render();
    find(tree, node => node.type === "button" && node.props.children === "불러오기")!.props.onClick();
  } else {
    const pendingImport = { draft: fromCase(item), label: "실습 구성" };
    vi.spyOn(api, "examples").mockResolvedValue([item]);
    harness.render(pendingImport);
    fixture.effects.forEach(effect => effect());
  }
  expect(find(harness.render(), node => node.props.className === "undo-notice")).toBeUndefined();
  if (channel !== "처음 구성") expect(harness.current().flow.dst_port).toBe(22);
});

it.each(["포트", "받은 답"])("%s만 바꿔도 불러오기 알림이 뜨고 되돌리기는 원래 입력을 복구한다", change => {
  const draft = blankDraft();
  if (change === "포트") draft.flow.dst_port = 8443;
  else draft.claim.expected = "PASS";
  const harness = judgeHarness(draft, [example()]);
  exampleButton(harness.render()).props.onClick();
  const tree = harness.render();
  expect(find(tree, node => node.props.className === "undo-notice")).toBeDefined();
  find(tree, node => node.type === "button" && node.props.children === "되돌리기")!.props.onClick();
  expect(harness.current()).toEqual(draft);
});

it("입력이 있어도 같은 예시를 다시 불러오면 알림이 없다", () => {
  const item = example(); const harness = judgeHarness(fromCase(item), [item]);
  exampleButton(harness.render()).props.onClick();
  expect(find(harness.render(), node => node.props.className === "undo-notice")).toBeUndefined();
});

it.each([
  ["01", "HTTPS와 입력 ACL 예시를 불러왔습니다"],
  ["02", "왕복 경로 예시를 불러왔습니다"],
  ["03", "출력 ACL 예시를 불러왔습니다"],
  ["04", "예시(04)를 불러왔습니다"],
])("예시 %s 알림은 승인된 주제/번호 문구다", (number, label) => {
  const draft = blankDraft(); draft.flow.dst_port = 8443;
  const harness = judgeHarness(draft, [example(`synthetic-${number}`)]);
  exampleButton(harness.render(), number).props.onClick();
  expect(find(harness.render(), node => node.type === "span" && Array.isArray(node.props.children) && node.props.children.join("") === `${label}.`)).toBeDefined();
});

it.each([["102", "102 ACL을 삭제했습니다"], ["", "ACL을 삭제했습니다"], ["   ", "ACL을 삭제했습니다"]])("ACL 이름 %s 삭제 문구", (name, label) => {
  const onBeforeRemove = vi.fn(); const onAcls = vi.fn();
  const tree = NetworkEditor({ devices: [], acls: [{ name, text: "" }], onDevices: () => {}, onAcls, onBeforeRemove });
  find(tree, node => node.type === "button" && node.props["aria-label"] === `ACL ${name} 삭제`)!.props.onClick();
  expect(onBeforeRemove).toHaveBeenCalledWith(label); expect(onAcls).toHaveBeenCalledWith([]);
});

it("예시 조회 상태를 넣은 SSR 단추는 결론 대신 주제 이름만 쓴다", () => {
  const draft = blankDraft();
  const titles = ["HTTPS가 ACL에 막힘", "돌아오는 경로 없음", "ACL을 나가는 방향으로 붙임", "알 수 없는 예시의 정답은 막힘"];
  fixture.items = titles.map((title, i) => ({ id: `synthetic-0${i + 1}`, title, source: "test", network: toNetwork(draft), flow: draft.flow }));
  const html = renderToStaticMarkup(createElement(JudgePage, { user: null, draft, setDraft: () => {} }));
  const buttons = html.match(/<div class="examples" aria-label="예시 불러오기">([\s\S]*?)<\/div>/)![1];
  const labels = [...buttons.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map(([, text]) => text.trim());
  expect(labels).toEqual(["예시 01 · HTTPS와 입력 ACL", "예시 02 · 왕복 경로", "예시 03 · 출력 ACL", "예시 04", "처음 구성"]);
  for (const title of titles) expect(buttons).not.toContain(title);
});

it("판정기는 자유 도구이며 실습 진입 카드·안내·라디오·접기 과제가 없다", () => {
  const setDraft = vi.fn();
  const html = renderToStaticMarkup(createElement(JudgePage, { user: null, draft: blankDraft(), setDraft }));
  expect(html).toContain("판정하기"); expect(html).toContain("실습은 학습실에서:");
  for (const id of ["01", "02", "03"]) expect(html).toContain(`href="#/practice/synthetic-${id}"`);
  expect(html).not.toMatch(/practice-entry|practice-title|practice-guide|practice-guess|실습 과제|구성 불러오기/);
  expect(setDraft).not.toHaveBeenCalled();
});

it("pendingImport는 지정 라벨로 load 후 소비되고 실제 되돌리기로 기존 입력을 복구한다", () => {
  fixture.controller = true;
  vi.spyOn(api, "examples").mockResolvedValue([]);
  let draft = blankDraft(); draft.flow.dst_port = 8443;
  const before = structuredClone(draft);
  const next = blankDraft(); next.flow.dst_port = 22;
  const pendingImport = { draft: next, label: "출력 ACL 실습 구성을 판정기로 가져왔습니다" };
  const setDraft = vi.fn((update: (current: Draft) => Draft) => { draft = update(draft); });
  const consumed = vi.fn();
  const render = () => {
    fixture.stateIndex = 0; fixture.refIndex = 0; fixture.effects = [];
    return JudgePage({ user: null, draft, setDraft, pendingImport, onImportConsumed: consumed });
  };
  render(); fixture.effects.forEach(effect => effect());
  expect(draft).toEqual(next); expect(consumed).toHaveBeenCalledOnce();
  const tree = render();
  expect(find(tree, item => item.type === "span" && Array.isArray(item.props.children) && item.props.children.join("") === `${pendingImport.label}.`)).toBeDefined();
  fixture.effects.forEach(effect => effect());
  expect(consumed).toHaveBeenCalledOnce(); expect(setDraft).toHaveBeenCalledOnce();
  find(tree, item => item.type === "button" && item.props.children === "되돌리기")!.props.onClick();
  expect(draft).toEqual(before); expect(draft).not.toBe(before);
  expect(find(render(), item => item.type === "button" && item.props.children === "되돌리기")).toBeUndefined();
});

it("가져오기 알림도 직접 편집하면 닫힌다", () => {
  fixture.controller = true; vi.spyOn(api, "examples").mockResolvedValue([]);
  let draft = blankDraft(); draft.flow.dst_port = 8443;
  const pendingImport = { draft: blankDraft(), label: "실습 구성" };
  const render = () => {
    fixture.stateIndex = 0; fixture.refIndex = 0; fixture.effects = [];
    return JudgePage({ user: null, draft, setDraft: update => { draft = update(draft); }, pendingImport });
  };
  render(); fixture.effects.forEach(effect => effect());
  const tree = render();
  find(tree, item => item.type === FlowForm)!.props.onFlow({ ...draft.flow, dst_port: 80 });
  expect(find(render(), item => item.type === "button" && item.props.children === "되돌리기")).toBeUndefined();
});

it("가져오기 소비는 load가 성공한 뒤에만 일어난다", () => {
  const consumed = vi.fn();
  expect(() => acceptJudgeImport({ draft: blankDraft(), label: "실습" }, () => { throw new Error("load failed"); }, consumed)).toThrow("load failed");
  expect(consumed).not.toHaveBeenCalled();
});

describe("완료 요청의 결과 포커스", () => {
  it.each([true, false])("결과·오류 공용 완료 경로: 휴대폰=%s", mobile => {
    const heading = { tabIndex: 0, focus: vi.fn(), scrollIntoView: vi.fn() };
    let frame!: () => void;
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { frame = callback; });
    vi.stubGlobal("document", { getElementById: vi.fn(() => heading) });
    vi.stubGlobal("window", { matchMedia: vi.fn(query => ({ matches: query === "(max-width: 900px)" && mobile })) });
    focusJudgeResult(() => true); expect(heading.focus).not.toHaveBeenCalled(); frame();
    expect(heading.tabIndex).toBe(-1); expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
    if (mobile) expect(heading.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    else expect(heading.scrollIntoView).not.toHaveBeenCalled();
  });
  it("예약 뒤 revision이 바뀐 응답은 DOM을 건드리지 않는다", () => {
    let current = true; let frame!: () => void; const getElementById = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { frame = callback; });
    vi.stubGlobal("document", { getElementById }); focusJudgeResult(() => current); current = false; frame();
    expect(getElementById).not.toHaveBeenCalled();
  });
  it("결과 제목이 없는 화면에는 초점을 옮기지 않는다", () => {
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => callback());
    const getElementById = vi.fn(() => null); vi.stubGlobal("document", { getElementById });
    focusJudgeResult(() => true); expect(getElementById).toHaveBeenCalledWith("result-title");
  });
});
