import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PracticePage, PracticeGuessPicker, practiceIntroSeen, rememberPracticeIntro } from "./PracticePage";
import { initializePracticeDrafts, practiceImport } from "../App";
import { FlowForm } from "../components/FlowForm";
import { NetworkEditor } from "../components/NetworkEditor";
import { ResultPanel } from "../components/ResultPanel";
import { blankDraft } from "../draft";
import { practiceDraft, LESSONS } from "../learning";
import { api } from "../api";
import type { CaseDetail, CaseItem, Draft, User, Verdict } from "../types";
import { go } from "../router";
import type { ChangeImpact } from "../types";
import { ChangePanel } from "../components/ChangePanel";
import { toNetwork } from "../draft";
import case01 from "../../../cases/synthetic-01-https-acl.json";
import case02 from "../../../cases/synthetic-02-missing-return-route.json";
import case03 from "../../../cases/synthetic-03-acl-out.json";

const examples = [case01, case02, case03] as CaseItem[];
const response: Verdict = { result: "DENY", comparison: "DISAGREE", reason: "engine response", problems: [], forward: null, return: null, decisive: null };
const user: User = { id: 1, nickname: "Test", role: "user", role_name: "일반" };
vi.mock("../router", async () => ({ ...await vi.importActual<typeof import("../router")>("../router"), go: vi.fn() }));
// 콜백·요청 폐기 단위 하네스. 실제 React/DOM은 브라우저에서 별도로 검증한다.
const fixture = vi.hoisted(() => ({ controller: false, items: [] as CaseItem[], status: "loading",
  states: [] as unknown[], refs: [] as { current: unknown }[], effects: [] as (() => unknown)[], stateIndex: 0, refIndex: 0 }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual,
    useState: (initial: unknown) => {
      if (!fixture.controller) return actual.useState(Array.isArray(initial) && initial.length === 0 ? fixture.items : initial === "loading" ? fixture.status : initial);
      const index = fixture.stateIndex++;
      if (!(index in fixture.states)) fixture.states[index] = typeof initial === "function" ? initial() : initial;
      return [fixture.states[index], (value: unknown) => { fixture.states[index] = typeof value === "function" ? value(fixture.states[index]) : value; }];
    },
    useRef: (initial: unknown) => fixture.controller ? (fixture.refs[fixture.refIndex++] ??= { current: initial }) : actual.useRef(initial),
    useMemo: (make: () => unknown, deps: unknown[]) => fixture.controller ? make() : actual.useMemo(make, deps),
    useEffect: (effect: () => unknown, deps: unknown[]) => fixture.controller ? fixture.effects.push(effect) : actual.useEffect(effect as () => void, deps),
  };
});
afterEach(() => {
  fixture.controller = false; fixture.items = []; fixture.status = "loading"; fixture.states = []; fixture.refs = []; fixture.effects = [];
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  vi.mocked(go).mockClear();
});
function find(node: unknown, test: (item: ReactElement<Record<string, any>>) => boolean): ReactElement<Record<string, any>> | undefined {
  if (Array.isArray(node)) return node.map(item => find(item, test)).find(Boolean);
  if (!isValidElement<Record<string, any>>(node)) return;
  return test(node) ? node : find(node.props.children, test);
}
function driver(auth: { user: User | null; checked: boolean } = { user, checked: true }) {
  fixture.controller = true; fixture.states = [[examples[0]], "ready", 0, false];
  let draft = practiceDraft(examples[0], "PASS");
  const setDraft = vi.fn((update: (current: Draft) => Draft) => { draft = update(draft); });
  const onReady = vi.fn(); const onImport = vi.fn();
  const render = () => {
    fixture.stateIndex = 0; fixture.refIndex = 0; fixture.effects = [];
    return PracticePage({ caseId: "synthetic-01", ...auth, draft, setDraft, onReady, onImport });
  };
  const button = (text: string) => find(render(), item => item.type === "button" && item.props.children === text)!;
  const panel = () => find(render(), item => item.type === ResultPanel)!;
  const editPort = (port: number) => find(render(), item => item.type === FlowForm)!.props.onFlow({ ...draft.flow, dst_port: port });
  return { render, button, panel, editPort, setDraft, onReady, onImport, get draft() { return draft; } };
}

const impactResponse: ChangeImpact = { status: "OK", problems: [], limit_exceeded: false, engine_version: "test", mode: "session", services: [], changes: [],
  totals: { checks: 9, changed: 0, opened: 0, closed: 0, other: 0, not_compared: 0 } };
const changePanel = (tree: unknown) => find(tree, node => node.type === ChangePanel)!;
const editAcl = (tree: unknown, text: string) => find(tree, node => node.type === NetworkEditor)!.props.onAcls([{ name: "101", text }]);

it("실습 구성 변경·예상만 변경·통신 변경은 기준 표를 그대로 따른다", async () => {
  vi.stubGlobal("requestAnimationFrame", vi.fn()); vi.spyOn(api, "verify").mockResolvedValue(response);
  const d = driver(); await d.button("판정하기").props.onClick(); const old = toNetwork(d.draft);
  editAcl(d.render(), "deny ip any any"); await d.button("다시 판정하기").props.onClick();
  const history = changePanel(d.render()).props.history; expect(history.before.network).toEqual(old);
  find(d.render(), node => node.type === PracticeGuessPicker)!.props.onChange("DENY"); await d.button("다시 판정하기").props.onClick();
  expect(changePanel(d.render()).props.history.before).toBe(history.before);
  d.editPort(80); await d.button("다시 판정하기").props.onClick(); expect(changePanel(d.render()).props.history.before).toBeNull();
});
it("실습 영향은 직접 단추를 눌러 직전·지금 구성을 보내며 처음 상태로도 구성 변경이다", async () => {
  vi.stubGlobal("requestAnimationFrame", vi.fn()); vi.spyOn(api, "verify").mockResolvedValue(response);
  const impact = vi.spyOn(api, "changeImpact").mockResolvedValue(impactResponse); const d = driver(); await d.button("판정하기").props.onClick(); const before = toNetwork(d.draft);
  editAcl(d.render(), "deny ip any any"); await d.button("다시 판정하기").props.onClick(); expect(impact).not.toHaveBeenCalled();
  await changePanel(d.render()).props.onCalculate(); expect(impact.mock.calls[0].slice(0, 3)).toEqual([before, toNetwork(d.draft), d.draft.flow]); expect(impact.mock.calls[0][3]).toHaveLength(5);
  expect(changePanel(d.render()).props.result).toBe(impactResponse);
  const modified = toNetwork(d.draft); d.button("처음 상태로").props.onClick(); expect(changePanel(d.render()).props.history.before).not.toBeNull();
  await d.button("다시 판정하기").props.onClick(); expect(changePanel(d.render()).props.history.before.network).toEqual(modified); expect(changePanel(d.render()).props.result).toBeNull();
});
it.each(["success", "error"])("실습 영향의 늦은 %s는 편집·재판정 뒤 쓰지 않는다", async outcome => {
  vi.stubGlobal("requestAnimationFrame", vi.fn()); vi.spyOn(api, "verify").mockResolvedValue(response);
  let finish!: (value?: any) => void; vi.spyOn(api, "changeImpact").mockImplementation(() => new Promise((resolve, reject) => { finish = outcome === "success" ? resolve : reject; }));
  const d = driver(); await d.button("판정하기").props.onClick(); editAcl(d.render(), "deny ip any any"); await d.button("다시 판정하기").props.onClick();
  const pending = changePanel(d.render()).props.onCalculate(); editAcl(d.render(), "permit ip any any"); await d.button("다시 판정하기").props.onClick();
  finish(outcome === "success" ? impactResponse : new Error("late")); await pending;
  expect(changePanel(d.render()).props.result).toBeNull(); expect(changePanel(d.render()).props.error).toBeNull();
});
it("실습 실패는 기억 유지, 다른 실습의 새 마운트는 비교 없음", async () => {
  vi.stubGlobal("requestAnimationFrame", vi.fn()); const verify = vi.spyOn(api, "verify").mockResolvedValue(response);
  const d = driver(); await d.button("판정하기").props.onClick(); const last = changePanel(d.render()).props.history.last;
  editAcl(d.render(), "deny ip any any"); verify.mockRejectedValueOnce(new Error("failed")); await d.button("다시 판정하기").props.onClick();
  expect(changePanel(d.render()).props.history.last).toBe(last);
  await d.button("다시 판정하기").props.onClick(); expect(changePanel(d.render()).props.history.before).toBe(last);
  fixture.states = []; fixture.refs = []; fixture.stateIndex = 0; fixture.refIndex = 0;
  const next = PracticePage({ caseId: "synthetic-02", user, checked: true, draft: practiceDraft(examples[1]), setDraft: () => {}, onReady: () => {}, onImport: () => {} });
  expect(fixture.states).toContainEqual({ last: null, before: null }); expect(find(next, node => node.type === ChangePanel)).toBeUndefined();
});

it.each(["loading", "error", "ready"])("조회 %s는 로딩·실패·누락을 구별하고 입력을 변경하지 않는다 (SSR)", status => {
  fixture.status = status; const setDraft = vi.fn(); const onReady = vi.fn();
  const html = renderToStaticMarkup(createElement(PracticePage, { caseId: "synthetic-01", user, checked: true, setDraft, onReady, onImport: () => {} }));
  expect(html).toContain(status === "loading" ? "실습 구성을 불러오는 중" : status === "error" ? "실습 구성을 가져오지 못했습니다" : "이 실습 구성은 현재 제공되지 않습니다");
  expect(html.includes("다시 시도")).toBe(status === "error"); expect(html).not.toContain("판정기로 가져가기");
  expect(setDraft).not.toHaveBeenCalled(); expect(onReady).not.toHaveBeenCalled();
});
it.each(examples)("$id는 ①→②→③→판정하기→④ 순서와 통신만 표시한다 (SSR)", example => {
  fixture.items = examples; fixture.status = "ready";
  const html = renderToStaticMarkup(createElement(PracticePage, { caseId: example.id, user, checked: true, draft: practiceDraft(example), setDraft: () => {}, onReady: () => {}, onImport: () => {} }));
  const lesson = LESSONS.find(item => item.caseId === example.id)!;
  expect(html.match(/<h1\b/g)).toHaveLength(1); expect(html).toContain(lesson.task.title);
  expect(html).toContain(`href="#/learn/${lesson.id}"`); expect(html).toContain(lesson.guessPrompt);
  const positions = ["① 문제", "② 구성 살펴보기", "③ 내 예상", ">판정하기</button>", "④ 판정과 근거"].map(text => html.indexOf(text));
  expect(positions.every(n => n >= 0)).toBe(true); expect(positions).toEqual([...positions].sort((a,b) => a-b));
  expect(html).not.toMatch(/q-claim|claim-label|누구의 답인지|확인할 통신과 받은 답|예시를 불러와도 됩니다/);
  expect(html).toContain("③에서 예상을 고르고 판정하기를 누르세요. 예상 없이도 판정할 수 있습니다.");
  expect(html).toContain("예상은 계산에 쓰지 않고 비교만 합니다.");
  expect(html).not.toContain("고른 예상은 계산에 쓰지 않고 결과와 나란히 비교만 합니다.");
  expect(html).not.toMatch(/정답은 통과|정답은 막힘|채점|완료 표시|expect/);
});
it.each([null, "1"])("첫 안내 줄은 저장값 %s를 따른다", value => {
  vi.stubGlobal("localStorage", { getItem: () => value });
  const html = renderToStaticMarkup(createElement(PracticePage, { caseId: "synthetic-01", user, checked: true, setDraft: () => {}, onReady: () => {}, onImport: () => {} }));
  expect(html.includes("알겠어요")).toBe(value !== "1");
});
it("②의 접기 안에 확인할 것·통신·편집기만 넣고 ③은 밖에 둔다 (SSR)", () => {
  fixture.items = examples; fixture.status = "ready";
  const draft = practiceDraft(examples[0]);
  // 빈 이름·중복 이름은 raw Draft 길이가 아니라 toNetwork와 같은 셈이다.
  draft.acls.push({ name: " ", text: "" }, { ...draft.acls[0], name: " 101 " });
  const html = renderToStaticMarkup(createElement(PracticePage, { caseId: "synthetic-01", user, checked: true, draft, setDraft: () => {}, onReady: () => {}, onImport: () => {} }));
  const inside = html.slice(html.indexOf('<details class="mobile-fold'), html.indexOf("</details>"));
  expect(inside).toContain("<summary>구성 펼쳐 보기 · 장비 3대 · ACL 1개</summary>");
  expect(inside).not.toContain("확인할 것 3가지");
  expect(inside).toContain("확인할 것</h3>"); expect(inside).toContain('id="flow-title"'); expect(inside).toContain('id="network-title"');
  expect(inside).not.toContain("③ 내 예상"); expect(inside).not.toMatch(/<details[^>]*\bopen\b/);
  expect(html.indexOf('id="practice-config-title"')).toBeLessThan(html.indexOf('<details class="mobile-fold'));
  expect(html.indexOf("</details>")).toBeLessThan(html.indexOf("③ 내 예상"));
});
it("입력에서 보기는 접기를 먼저 연 뒤 ACL 줄을 선택한다", () => {
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
  const d = driver(); const tree = d.render();
  const fold = find(tree, item => item.type === "details")!.props.ref;
  fold.current = { open: false };
  const input = { value: d.draft.acls[0].text, focus: vi.fn(() => expect(fold.current.open).toBe(true)), setSelectionRange: vi.fn(), scrollIntoView: vi.fn() };
  find(tree, item => item.type === NetworkEditor)!.props.aclInputRef(0, input);
  d.panel().props.onShowAcl("101", 1);
  expect(input.focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(input.setSelectionRange).toHaveBeenCalledWith(0, input.value.indexOf("\n"));
  expect(input.scrollIntoView).toHaveBeenCalled();
  expect(find(d.render(), item => item.type === "details")!.props).not.toHaveProperty("open");
});
it("저장소 읽기 실패에도 안내 줄과 화면이 렌더링된다", () => {
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); } });
  expect(practiceIntroSeen()).toBe(false);
  const html = renderToStaticMarkup(createElement(PracticePage, { caseId: "synthetic-01", user, checked: true, setDraft: () => {}, onReady: () => {}, onImport: () => {} }));
  expect(html).toContain("알겠어요"); expect(html).toContain("① 문제");
});
it.each(["PASS", "DENY"] as const)("App의 %s 예상은 self로만 옮기고 판정기 입력·예시의 expect는 건드리지 않는다", guess => {
  const judgeDraft = blankDraft(); judgeDraft.flow.dst_port = 8443;
  const beforeJudge = JSON.stringify(judgeDraft); const beforeExamples = JSON.stringify(examples);
  const drafts = initializePracticeDrafts({}, examples[0].id, examples[0], guess);
  expect(drafts[examples[0].id].claim).toEqual({ expected: guess, kind: "self", source: "", text: "" });
  expect(drafts[examples[0].id]).not.toHaveProperty("expect");
  expect(JSON.stringify(judgeDraft)).toBe(beforeJudge); expect(JSON.stringify(examples)).toBe(beforeExamples);
  drafts[examples[0].id].flow.dst_port = 80;
  expect(initializePracticeDrafts(drafts, examples[0].id, examples[0])).toBe(drafts);
  const second = initializePracticeDrafts(drafts, examples[1].id, examples[1], "DENY");
  expect(second[examples[0].id]).toBe(drafts[examples[0].id]);
  const changed = initializePracticeDrafts(second, examples[0].id, examples[0], guess === "PASS" ? "DENY" : "PASS");
  expect(changed[examples[0].id].flow.dst_port).toBe(80);
});
it("판정기로 가져갈 입력은 중첩 객체까지 분리된 복사본이다", () => {
  const d = driver(); d.button("판정기로 가져가기").props.onClick();
  const passed = d.onImport.mock.calls[0][0] as Draft;
  expect(passed).toEqual(d.draft); expect(passed).not.toBe(d.draft);
  passed.devices[0].id = "import-edit"; passed.acls[0].text = "import-edit";
  expect(d.draft.devices[0].id).not.toBe("import-edit"); expect(d.draft.acls[0].text).not.toBe("import-edit");
  const imported = practiceImport("synthetic-01", d.draft);
  expect(imported.label).toBe("HTTPS와 입력 ACL 실습 구성을 판정기로 가져왔습니다");
  imported.draft.flow.dst_port = 123; expect(d.draft.flow.dst_port).toBe(443);
});
it("예상 라디오는 선택을 전달하고 self로 실습 입력만 바꾼다", () => {
  const onChange = vi.fn(); const picker = PracticeGuessPicker({ caseId: "synthetic-01", guess: "DENY", onChange });
  for (const label of picker.props.children[1]) label.props.children[0].props.onChange();
  expect(onChange.mock.calls).toEqual([["PASS"], ["DENY"], [undefined]]);
  const d = driver(); find(d.render(), item => item.type === PracticeGuessPicker)!.props.onChange("DENY");
  expect(d.draft.claim).toEqual({ expected: "DENY", kind: "self", source: "", text: "" });
  find(d.render(), item => item.type === PracticeGuessPicker)!.props.onChange(undefined); expect(d.draft.claim.expected).toBeNull();
});
it("실습은 verify만 호출하고 응답의 비교를 그대로 ResultPanel에 보낸다", async () => {
  const verify = vi.spyOn(api, "verify").mockResolvedValue({ ...response, comparison: "AGREE" });
  const others = [vi.spyOn(api, "aclAudit"), vi.spyOn(api, "suggest"), vi.spyOn(api, "createCase")];
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  const d = driver(); await d.button("판정하기").props.onClick();
  expect(verify).toHaveBeenCalledOnce(); expect(verify.mock.calls[0][2]).toEqual(d.draft.claim); expect(verify.mock.calls[0][1]).not.toBe(d.draft.flow);
  const panel = d.panel(); expect(panel.props.verdict.comparison).toBe("AGREE"); expect(panel.props.claim.expected).toBe("PASS");
  const html = renderToStaticMarkup(createElement(ResultPanel, panel.props as Parameters<typeof ResultPanel>[0]));
  expect(html).toContain("같습니다"); expect(html).not.toContain("다릅니다"); for (const spy of others) expect(spy).not.toHaveBeenCalled();
});
it("편집 후 이전 결과를 표시하고 처음 상태·되돌리기는 예상을 유지한다", async () => {
  vi.spyOn(api, "verify").mockResolvedValue(response); vi.stubGlobal("requestAnimationFrame", vi.fn());
  const d = driver(); await d.button("판정하기").props.onClick(); d.editPort(80);
  expect(d.panel().props.stale).toBe(true); d.button("처음 상태로").props.onClick();
  expect(d.draft.flow.dst_port).toBe(443); expect(d.draft.claim.expected).toBe("PASS"); d.button("되돌리기").props.onClick();
  expect(d.draft.flow.dst_port).toBe(80); expect(d.draft.claim.kind).toBe("self");
  d.button("처음 상태로").props.onClick(); d.editPort(8080); expect(d.button("되돌리기")).toBeUndefined();
});
it("변경 없는 처음 상태로는 결과와 진행 중 요청을 건드리지 않는다", async () => {
  let resolve!: (value: Verdict) => void;
  vi.spyOn(api, "verify").mockImplementation(() => new Promise(r => { resolve = r; }));
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  const d = driver(); const pending = d.button("판정하기").props.onClick();
  d.button("처음 상태로").props.onClick();
  expect(d.setDraft).not.toHaveBeenCalled(); expect(d.panel().props.loading).toBe(true);
  resolve(response); await pending;
  d.button("처음 상태로").props.onClick();
  expect(d.panel().props.verdict).toEqual(response); expect(d.panel().props.stale).toBe(false);
  expect(d.button("되돌리기")).toBeUndefined(); expect(d.setDraft).not.toHaveBeenCalled();
});
it.each(["장비", "인터페이스", "경로", "ACL"])("%s 삭제는 한 단계 되돌리고 직접 편집하면 알림을 없앤다", kind => {
  const d = driver();
  if (kind === "경로") { const devices = structuredClone(d.draft.devices); devices[1].routes = [{ prefix: "0.0.0.0/0", next_hop: "10.20.20.5" }]; d.setDraft(() => ({ ...d.draft, devices })); }
  const before = structuredClone(d.draft);
  const editor = find(d.render(), item => item.type === NetworkEditor)!;
  editor.props.onBeforeRemove(`${kind} 삭제`);
  if (kind === "ACL") editor.props.onAcls([]);
  else {
    const devices = structuredClone(d.draft.devices);
    if (kind === "장비") devices.splice(0, 1);
    else if (kind === "인터페이스") devices[0].interfaces = [];
    else devices[1].routes = [];
    editor.props.onDevices(devices);
  }
  expect(d.draft).not.toEqual(before); expect(d.button("되돌리기")).toBeDefined();
  d.button("되돌리기").props.onClick(); expect(d.draft).toEqual(before);
  editor.props.onBeforeRemove(`${kind} 삭제`); editor.props.onAcls([]);
  d.editPort(80); expect(d.button("되돌리기")).toBeUndefined();
});
it.each(["edit", "edit-reset", "unmount"])("계산 중 %s 뒤 도착한 응답은 결과·포커스를 쓰지 않는다", async action => {
  let resolve!: (v: Verdict) => void;
  vi.spyOn(api, "verify").mockImplementation(() => new Promise(r => { resolve = r; }));
  const focus = vi.fn(); vi.stubGlobal("requestAnimationFrame", focus);
  const d = driver(); const pending = d.button("판정하기").props.onClick();
  if (action === "unmount") (fixture.effects[0]() as () => void)();
  else { d.editPort(80); if (action === "edit-reset") d.button("처음 상태로").props.onClick(); d.render(); }
  resolve(response); await pending; expect(d.panel().props.verdict).toBeNull(); expect(focus).not.toHaveBeenCalled();
});
it("실패 응답은 오류만 표시하고 완료 포커스 경로를 재사용한다", async () => {
  vi.spyOn(api, "verify").mockRejectedValue(new Error("verify failed"));
  const focus = vi.fn(); vi.stubGlobal("requestAnimationFrame", focus);
  const d = driver(); await d.button("판정하기").props.onClick();
  expect(d.panel().props.error).toBe("verify failed"); expect(d.panel().props.verdict).toBeNull(); expect(d.panel().props.loading).toBe(false); expect(focus).toHaveBeenCalledOnce();
});
it("알겠어요는 스크롤 없이 ② 제목으로 포커스를 넘긴다", () => {
  const d = driver(); const title = find(d.render(), item => item.props.id === "practice-config-title")!;
  const focus = vi.fn(); title.props.ref.current = { focus };
  expect(title.props.tabIndex).toBe(-1);
  d.button("알겠어요").props.onClick();
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
});
it("안내 닫기의 저장이 실패해도 이번 방문 메모리에서는 숨긴다", () => {
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
  const d = driver(); d.button("알겠어요").props.onClick(); expect(d.button("알겠어요")).toBeUndefined();
  expect(() => rememberPracticeIntro()).not.toThrow(); expect(practiceIntroSeen()).toBe(true);
});

const record = (tree: unknown) => find(tree, node => node.type === "section" && node.props["aria-labelledby"] === "practice-record-title");
const recordHtml = (tree: unknown) => renderToStaticMarkup(record(tree)!);
const recordTitle = (tree: unknown) => find(record(tree), node => node.type === "input")!;
const savedNotice = (tree: unknown) => find(tree, node => node.type === "p" && node.props.role === "status");

it("⑤는 판정 전·입력 변경 뒤에는 없고 로그인 전에는 보존 경계를 안내한다", async () => {
  vi.spyOn(api, "verify").mockResolvedValue(response); vi.stubGlobal("requestAnimationFrame", vi.fn());
  const d = driver({ user: null, checked: true });
  expect(record(d.render())).toBeUndefined();
  await d.button("판정하기").props.onClick();
  const markup = recordHtml(d.render());
  expect(markup).toContain("⑤ 기록하기"); expect(markup).toContain('href="#/login"');
  expect(markup).toContain("로그인하러 다녀와도 구성과 예상은 남습니다");
  expect(markup).toContain("판정은 돌아와서 다시 해야"); expect(markup).toContain("새로고침하면 입력이 사라집니다");
  expect(d.button("저장")).toBeUndefined();
  d.editPort(80); expect(record(d.render())).toBeUndefined();
});
it("로그인 확인 전에는 저장과 로그인 진입을 모두 보류한다", async () => {
  vi.spyOn(api, "verify").mockResolvedValue(response); vi.stubGlobal("requestAnimationFrame", vi.fn());
  const d = driver({ user, checked: false }); await d.button("판정하기").props.onClick();
  expect(recordHtml(d.render())).toContain("로그인 여부를 확인하는 중");
  expect(recordHtml(d.render())).not.toContain('href="#/login"'); expect(d.button("저장")).toBeUndefined();
});
it("저장은 실습 입력의 복사본으로 1번 요청하고 상세로 이동한다", async () => {
  vi.spyOn(api, "verify").mockResolvedValue(response); vi.stubGlobal("requestAnimationFrame", vi.fn());
  let finish!: (saved: CaseDetail) => void;
  const create = vi.spyOn(api, "createCase").mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const d = driver(); await d.button("판정하기").props.onClick();
  const input = recordTitle(d.render()); expect(input.props.maxLength).toBe(80);
  expect(input.props.value).toBe("HTTPS와 입력 ACL 실습 · 내 예상 통과");
  input.props.onChange({ target: { value: "  My practice  " } });
  const before = structuredClone(d.draft); const save = d.button("저장");
  const pending = save.props.onClick(); await save.props.onClick();
  expect(create).toHaveBeenCalledExactlyOnceWith("My practice", toNetwork(before), before.flow, before.claim);
  expect(create.mock.calls[0][2]).not.toBe(d.draft.flow); expect(create.mock.calls[0][3].kind).toBe("self");
  expect(d.button("저장 중…").props.disabled).toBe(true);
  expect(recordTitle(d.render()).props.disabled).toBe(true);
  finish({ id: 42 } as CaseDetail); await pending;
  expect(go).toHaveBeenCalledExactlyOnceWith("/cases/42"); expect(d.draft).toEqual(before);
});
it("빈 제목은 저장하지 않고 실패 시 제목·구성·예상을 유지하며 재시도한다", async () => {
  vi.spyOn(api, "verify").mockResolvedValue(response); vi.stubGlobal("requestAnimationFrame", vi.fn());
  const create = vi.spyOn(api, "createCase").mockRejectedValueOnce(new Error("save failed")).mockResolvedValue({ id: 43 } as CaseDetail);
  const d = driver(); await d.button("판정하기").props.onClick(); const before = structuredClone(d.draft);
  recordTitle(d.render()).props.onChange({ target: { value: "   " } });
  expect(d.button("저장").props.disabled).toBe(true); await d.button("저장").props.onClick(); expect(create).not.toHaveBeenCalled();
  recordTitle(d.render()).props.onChange({ target: { value: "Retry title" } });
  await d.button("저장").props.onClick();
  expect(recordHtml(d.render())).toContain("save failed"); expect(go).not.toHaveBeenCalled();
  expect(d.draft).toEqual(before); expect(recordTitle(d.render()).props.value).toBe("Retry title");
  expect(d.button("저장").props.disabled).toBe(false);
  await d.button("저장").props.onClick(); expect(go).toHaveBeenCalledExactlyOnceWith("/cases/43");
});
it.each(["edit", "edit-reset", "rejudge", "unmount"])("저장 중 %s 뒤 늦은 응답은 이동 없이 저장 사실을 알린다", async action => {
  vi.spyOn(api, "verify").mockResolvedValue(response); vi.stubGlobal("requestAnimationFrame", vi.fn());
  let finish!: (saved: CaseDetail) => void;
  vi.spyOn(api, "createCase").mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const d = driver(); await d.button("판정하기").props.onClick(); const pending = d.button("저장").props.onClick();
  if (action === "unmount") (fixture.effects[0]() as () => void)();
  else if (action === "rejudge") await d.button("판정하기").props.onClick();
  else { d.editPort(80); if (action === "edit-reset") d.button("처음 상태로").props.onClick(); d.render(); }
  const beforeResponse = [...fixture.states];
  finish({ id: 42 } as CaseDetail); await pending; expect(go).not.toHaveBeenCalled();
  if (action === "unmount") {
    expect(fixture.states).toEqual(beforeResponse); expect(savedNotice(d.render())).toBeUndefined();
  } else {
    const notice = renderToStaticMarkup(savedNotice(d.render())!);
    expect(notice).toContain('role="status"'); expect(notice).toContain('href="#/cases/42"');
    expect(notice).toContain("사례 #42"); expect(notice).toContain("으로 저장했습니다.");
    expect(notice).toContain("저장한 뒤 바꾼 입력·판정은 저장되지 않았습니다.");
    if (action !== "rejudge") {
      expect(record(d.render())).toBeUndefined();
      await d.button("다시 판정하기").props.onClick();
    }
    expect(savedNotice(d.render())).toBeDefined(); expect(d.button("저장").props.disabled).toBe(false);
  }
});
it.each(["PASS", "DENY", undefined] as const)("기본 제목은 예상 %s를 표시하고 예상 없음도 저장할 수 있다", async expected => {
  vi.spyOn(api, "verify").mockResolvedValue(response); vi.stubGlobal("requestAnimationFrame", vi.fn());
  const create = vi.spyOn(api, "createCase").mockResolvedValue({ id: 44 } as CaseDetail);
  const d = driver(); find(d.render(), node => node.type === PracticeGuessPicker)!.props.onChange(expected);
  await d.button("판정하기").props.onClick();
  expect(recordTitle(d.render()).props.value).toBe(`HTTPS와 입력 ACL 실습 · 내 예상 ${expected === "PASS" ? "통과" : expected === "DENY" ? "막힘" : "없음"}`);
  await d.button("저장").props.onClick(); expect(create.mock.calls[0][3]).toEqual(d.draft.claim);
});
it.each(["edit", "unmount"])("저장 중 %s 뒤 늦은 오류는 표시하지 않는다", async action => {
  vi.spyOn(api, "verify").mockResolvedValue(response); vi.stubGlobal("requestAnimationFrame", vi.fn());
  let reject!: (error: Error) => void;
  vi.spyOn(api, "createCase").mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  const d = driver(); await d.button("판정하기").props.onClick(); const pending = d.button("저장").props.onClick();
  if (action === "unmount") (fixture.effects[0]() as () => void)(); else { d.editPort(80); d.render(); }
  reject(new Error("late save error")); await pending; expect(go).not.toHaveBeenCalled();
  if (action === "edit") {
    await d.button("다시 판정하기").props.onClick(); expect(recordHtml(d.render())).not.toContain("late save error");
  }
});
it("첫 저장 응답이 지연되는 동안 새 입력을 재판정해도 요청은 겹치지 않는다", async () => {
  vi.spyOn(api, "verify").mockResolvedValue(response); vi.stubGlobal("requestAnimationFrame", vi.fn());
  let finish!: (saved: CaseDetail) => void;
  const create = vi.spyOn(api, "createCase").mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValue({ id: 46 } as CaseDetail);
  const d = driver(); await d.button("판정하기").props.onClick(); const pending = d.button("저장").props.onClick();
  d.editPort(80); await d.button("다시 판정하기").props.onClick();
  await d.button("저장 중…").props.onClick(); expect(create).toHaveBeenCalledOnce();
  finish({ id: 45 } as CaseDetail); await pending; expect(go).not.toHaveBeenCalled();
  await d.button("저장").props.onClick(); expect(create).toHaveBeenCalledTimes(2); expect(go).toHaveBeenCalledExactlyOnceWith("/cases/46");
  expect(create.mock.calls[1][2].dst_port).toBe(80);
});
