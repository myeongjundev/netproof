import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JudgePage, PracticeGuessPicker, focusJudgeResult, focusPractice, practiceHint } from "./JudgePage";
import { lessonByCaseId } from "../learning";
import { blankDraft, toNetwork } from "../draft";
import type { CaseItem } from "../types";

const examplesState = vi.hoisted(() => ({ items: null as CaseItem[] | null }));
// SSR에는 API 효과가 없으므로 예시 배열 상태만 주입한다. 실제 클릭은 브라우저에서 확인한다.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual, useState: (initial: unknown) => actual.useState(Array.isArray(initial) && initial.length === 0 && examplesState.items ? examplesState.items : initial) };
});

it.each([undefined, "synthetic-01"])("예시 조회 상태를 넣은 SSR 단추는 결론 대신 주제 이름만 쓴다: %s", practiceId => {
  const draft = blankDraft();
  const titles = ["HTTPS가 ACL에 막힘", "돌아오는 경로 없음", "ACL을 나가는 방향으로 붙임", "알 수 없는 예시의 정답은 막힘"];
  examplesState.items = titles.map((title, i) => ({ id: `synthetic-0${i + 1}`, title, source: "test", network: toNetwork(draft), flow: draft.flow }));
  try {
    const html = renderToStaticMarkup(createElement(JudgePage, { user: null, draft, setDraft: () => {}, practiceId }));
    const buttons = html.match(/<div class="examples" aria-label="예시 불러오기">([\s\S]*?)<\/div>/)![1];
    const labels = [...buttons.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map(([, text]) => text.trim());
    expect(labels).toEqual(["예시 01 · HTTPS와 입력 ACL", "예시 02 · 왕복 경로", "예시 03 · 출력 ACL", "예시 04", "처음 구성"]);
    for (const title of titles) expect(buttons).not.toContain(title);
  } finally { examplesState.items = null; }
});

it.each(["synthetic-01", "synthetic-02", "synthetic-03"])("%s 진입은 로딩 안내만 렌더링하고 입력을 고치지 않는다 (SSR)", practiceId => {
  const draft = blankDraft(); draft.flow.src = "10.10.10.12";
  const setDraft = vi.fn();
  const html = renderToStaticMarkup(createElement(JudgePage, { user: null, draft, setDraft, practiceId }));
  expect(html).toContain("지금 입력은 아직 바꾸지 않았습니다");
  expect(html).toContain("연습용 네트워크 실습");
  expect(html).not.toContain("학습실에서 선택한 실습");
  expect(html).toContain("실습 구성을 불러오는 중");
  expect(html).toContain("disabled");
  expect(html).toContain(lessonByCaseId(practiceId)!.guessPrompt);
  expect(html.match(/class="panel practice-entry"[\s\S]*?<\/section>/)![0]).not.toContain(lessonByCaseId(practiceId)!.task.question);
  expect(setDraft).not.toHaveBeenCalled();
  expect(draft.flow.src).toBe("10.10.10.12");
});
it("기존 판정기는 선택 실습 질문을 추가하지 않는다", () => {
  const html = renderToStaticMarkup(createElement(JudgePage, { user: null, draft: blankDraft(), setDraft: () => {} }));
  expect(html).not.toContain("학습실에서 선택한 실습");
  expect(html).toContain("판정하기");
});
it.each(["PASS", "DENY", undefined] as const)("%s 예상 진입은 선택 묶음만 표시하고 입력을 아직 쓰지 않는다 (SSR)", practiceGuess => {
  const draft = blankDraft(); const before = JSON.stringify(draft);
  const setDraft = vi.fn(); const onPracticeLoaded = vi.fn();
  const html = renderToStaticMarkup(createElement(JudgePage, { user: null, draft, setDraft, practiceId: "synthetic-01", practiceGuess, onPracticeLoaded }));
  expect(html).toContain("<legend>내 예상</legend>");
  const labels = [...html.matchAll(/<label><input type="radio"([^>]*)\/>((?:통과할 것 같다|막힐 것 같다|예상 없이))<\/label>/g)];
  expect(labels).toHaveLength(3);
  expect(labels.filter(([, attrs]) => attrs.includes("checked")).map(([, , label]) => label)).toEqual([practiceGuess === "PASS" ? "통과할 것 같다" : practiceGuess === "DENY" ? "막힐 것 같다" : "예상 없이"]);
  expect(html).toContain("실습 없이 계속하기"); expect(html).not.toContain("판정기로 이동");
  expect(html).toContain(practiceGuess ? `구성을 불러오면 받은 답이 &quot;${practiceGuess === "PASS" ? "된다" : "안 된다"}(내 예상)&quot;로 들어갑니다.` : "예상 없이 불러오면 받은 답은 &quot;비교 안 함&quot;입니다.");
  expect(html).toContain("구성 불러오기"); expect(html).not.toContain("실습 구성 불러오기");
  expect(setDraft).not.toHaveBeenCalled(); expect(onPracticeLoaded).not.toHaveBeenCalled();
  expect(JSON.stringify(draft)).toBe(before);
});
describe("완료 요청의 결과 포커스", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([true, false])("결과·오류 공용 완료 경로: 휴대폰=%s", mobile => {
    const heading = { tabIndex: 0, focus: vi.fn(), scrollIntoView: vi.fn() };
    let frame!: () => void;
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { frame = callback; });
    vi.stubGlobal("document", { getElementById: vi.fn(() => heading) });
    vi.stubGlobal("window", { matchMedia: vi.fn(query => ({ matches: query === "(max-width: 900px)" && mobile })) });
    focusJudgeResult(() => true);
    expect(heading.focus).not.toHaveBeenCalled();
    frame();
    expect(heading.tabIndex).toBe(-1);
    expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
    if (mobile) expect(heading.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    else expect(heading.scrollIntoView).not.toHaveBeenCalled();
  });
  it("예약 뒤 revision이 바뀐 응답은 DOM을 건드리지 않는다", () => {
    let current = true; let frame!: () => void;
    const getElementById = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { frame = callback; });
    vi.stubGlobal("document", { getElementById });
    focusJudgeResult(() => current);
    current = false; frame();
    expect(getElementById).not.toHaveBeenCalled();
  });
  it("결과 제목이 없는 화면에는 초점을 옮기지 않는다", () => {
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => callback());
    const getElementById = vi.fn(() => null);
    vi.stubGlobal("document", { getElementById });
    focusJudgeResult(() => true);
    expect(getElementById).toHaveBeenCalledWith("result-title");
  });
});
describe("불러오기 후 실습 포커스", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each([true, false])("실습 제목으로 이동: 휴대폰=%s", mobile => {
    let frame!: () => void;
    const heading = { tabIndex: 0, focus: vi.fn(), scrollIntoView: vi.fn() };
    const getElementById = vi.fn(() => heading);
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { frame = callback; });
    vi.stubGlobal("document", { getElementById });
    vi.stubGlobal("window", { matchMedia: (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" || mobile }) });
    focusPractice(() => true); frame();
    expect(getElementById).toHaveBeenCalledWith("practice-title");
    expect(heading.tabIndex).toBe(-1);
    expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
    if (mobile) expect(heading.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
    else expect(heading.scrollIntoView).not.toHaveBeenCalled();
  });
  it("예약 뒤 다른 입력을 불러오면 포커스도 버린다", () => {
    let frame!: () => void; let current = true;
    const getElementById = vi.fn();
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => { frame = callback; });
    vi.stubGlobal("document", { getElementById });
    focusPractice(() => current); current = false; frame();
    expect(getElementById).not.toHaveBeenCalled();
  });
});
it.each(["PASS", "DENY", null] as const)("실습 안내는 현재 받은 답 유무를 따른다: %s", expected => {
  expect(practiceHint({ expected, source: "", text: "" })).toBe(expected
    ? "정답은 들어 있지 않습니다. 판정하면 받은 답과 NetProof 계산을 비교합니다."
    : "정답은 들어 있지 않습니다. 직접 판정하고, 받은 답이나 내 예상을 적어 비교하세요.");
});
it("진입 라디오 이벤트는 App 예상 콜백만 호출하고 Draft를 고치지 않는다", () => {
  const draft = blankDraft(); const before = JSON.stringify(draft); const setDraft = vi.fn(); const onChange = vi.fn();
  renderToStaticMarkup(createElement(JudgePage, { user: null, draft, setDraft, practiceId: "synthetic-03", onPracticeGuessChange: onChange }));
  const tree = PracticeGuessPicker({ caseId: "synthetic-03", guess: "DENY", onChange });
  for (const label of tree.props.children[1]) label.props.children[0].props.onChange();
  expect(onChange.mock.calls).toEqual([["synthetic-03", "PASS"], ["synthetic-03", "DENY"], ["synthetic-03", undefined]]);
  expect(setDraft).not.toHaveBeenCalled(); expect(JSON.stringify(draft)).toBe(before);
});
