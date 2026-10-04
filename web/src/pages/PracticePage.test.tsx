import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PracticePage, PracticeGuessPicker, practiceIntroSeen, rememberPracticeIntro } from "./PracticePage";
import { initializePracticeDrafts, practiceImport } from "../App";
import { FlowForm } from "../components/FlowForm";
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
  expect(html).toContain("고른 예상은 계산에 쓰지 않고 결과와 나란히 비교만 합니다.");
  expect(html).not.toMatch(/정답은 통과|정답은 막힘|채점|완료 표시|expect/);
});
it.each([null, "1"])("첫 안내 줄은 저장값 %s를 따른다", value => {
  vi.stubGlobal("localStorage", { getItem: () => value });
  const html = renderToStaticMarkup(createElement(PracticePage, { caseId: "synthetic-01", setDraft: () => {}, onReady: () => {}, onImport: () => {} }));
  expect(html.includes("알겠어요")).toBe(value !== "1");
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
it("안내 닫기의 저장이 실패해도 이번 방문 메모리에서는 숨긴다", () => {
  vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
  const d = driver(); d.button("알겠어요").props.onClick(); expect(d.button("알겠어요")).toBeUndefined();
  expect(() => rememberPracticeIntro()).not.toThrow(); expect(practiceIntroSeen()).toBe(true);
});
