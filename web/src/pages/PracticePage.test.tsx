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
import type { CaseItem, Draft, Verdict } from "../types";
import case01 from "../../../cases/synthetic-01-https-acl.json";
import case02 from "../../../cases/synthetic-02-missing-return-route.json";
import case03 from "../../../cases/synthetic-03-acl-out.json";

const examples = [case01, case02, case03] as CaseItem[];
const response: Verdict = { result: "DENY", comparison: "DISAGREE", reason: "engine response", problems: [], forward: null, return: null, decisive: null };
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
});
function find(node: unknown, test: (item: ReactElement<Record<string, any>>) => boolean): ReactElement<Record<string, any>> | undefined {
  if (Array.isArray(node)) return node.map(item => find(item, test)).find(Boolean);
  if (!isValidElement<Record<string, any>>(node)) return;
  return test(node) ? node : find(node.props.children, test);
}
function driver() {
  fixture.controller = true; fixture.states = [[examples[0]], "ready", 0, false];
  let draft = practiceDraft(examples[0], "PASS");
  const setDraft = vi.fn((update: (current: Draft) => Draft) => { draft = update(draft); });
  const onReady = vi.fn(); const onImport = vi.fn();
  const render = () => {
    fixture.stateIndex = 0; fixture.refIndex = 0; fixture.effects = [];
    return PracticePage({ caseId: "synthetic-01", draft, setDraft, onReady, onImport });
  };
  const button = (text: string) => find(render(), item => item.type === "button" && item.props.children === text)!;
  const panel = () => find(render(), item => item.type === ResultPanel)!;
  const editPort = (port: number) => find(render(), item => item.type === FlowForm)!.props.onFlow({ ...draft.flow, dst_port: port });
  return { render, button, panel, editPort, setDraft, onReady, onImport, get draft() { return draft; } };
}

it.each(["loading", "error", "ready"])("조회 %s는 로딩·실패·누락을 구별하고 입력을 변경하지 않는다 (SSR)", status => {
  fixture.status = status; const setDraft = vi.fn(); const onReady = vi.fn();
  const html = renderToStaticMarkup(createElement(PracticePage, { caseId: "synthetic-01", setDraft, onReady, onImport: () => {} }));
  expect(html).toContain(status === "loading" ? "실습 구성을 불러오는 중" : status === "error" ? "실습 구성을 가져오지 못했습니다" : "이 실습 구성은 현재 제공되지 않습니다");
  expect(html.includes("다시 시도")).toBe(status === "error"); expect(html).not.toContain("판정기로 가져가기");
  expect(setDraft).not.toHaveBeenCalled(); expect(onReady).not.toHaveBeenCalled();
});
it.each(examples)("$id는 ①→②→③→판정하기→④ 순서와 통신만 표시한다 (SSR)", example => {
  fixture.items = examples; fixture.status = "ready";
  const html = renderToStaticMarkup(createElement(PracticePage, { caseId: example.id, draft: practiceDraft(example), setDraft: () => {}, onReady: () => {}, onImport: () => {} }));
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
  const html = renderToStaticMarkup(createElement(PracticePage, { caseId: "synthetic-01", setDraft: () => {}, onReady: () => {}, onImport: () => {} }));
  expect(html.includes("알겠어요")).toBe(value !== "1");
});
it("②의 접기 안에 확인할 것·통신·편집기만 넣고 ③은 밖에 둔다 (SSR)", () => {
  fixture.items = examples; fixture.status = "ready";
  const draft = practiceDraft(examples[0]);
  // 빈 이름·중복 이름은 raw Draft 길이가 아니라 toNetwork와 같은 셈이다.
  draft.acls.push({ name: " ", text: "" }, { ...draft.acls[0], name: " 101 " });
  const html = renderToStaticMarkup(createElement(PracticePage, { caseId: "synthetic-01", draft, setDraft: () => {}, onReady: () => {}, onImport: () => {} }));
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
  const html = renderToStaticMarkup(createElement(PracticePage, { caseId: "synthetic-01", setDraft: () => {}, onReady: () => {}, onImport: () => {} }));
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
