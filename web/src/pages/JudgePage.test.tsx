import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JudgePage, acceptJudgeImport, focusJudgeResult } from "./JudgePage";
import { FlowForm } from "../components/FlowForm";
import { blankDraft, toNetwork } from "../draft";
import { api } from "../api";
import type { CaseItem, Draft } from "../types";

// SSR는 문구를, 훅 단위 하네스는 실제 load/restore 콜백을 검사한다.
// DOM·포커스·React 생명주기 통합 검증은 별도 실제 브라우저 QA에서 한다.
const fixture = vi.hoisted(() => ({ items: null as CaseItem[] | null, controller: false,
  states: [] as unknown[], refs: [] as { current: unknown }[], effects: [] as (() => unknown)[], stateIndex: 0, refIndex: 0 }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual,
    useState: (initial: unknown) => {
      if (!fixture.controller) return actual.useState(Array.isArray(initial) && initial.length === 0 && fixture.items ? fixture.items : initial);
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
  fixture.items = null; fixture.controller = false; fixture.states = []; fixture.refs = []; fixture.effects = [];
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function find(node: unknown, test: (item: ReactElement<Record<string, any>>) => boolean): ReactElement<Record<string, any>> | undefined {
  if (Array.isArray(node)) return node.map(item => find(item, test)).find(Boolean);
  if (!isValidElement<Record<string, any>>(node)) return;
  return test(node) ? node : find(node.props.children, test);
}

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
