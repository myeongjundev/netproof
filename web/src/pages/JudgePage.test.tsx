import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JudgePage } from "./JudgePage";
import { blankDraft } from "../draft";

it.each(["synthetic-01", "synthetic-02", "synthetic-03"])("%s 진입은 로딩 안내만 렌더링하고 입력을 고치지 않는다 (SSR)", practiceId => {
  const draft = blankDraft(); draft.flow.src = "10.10.10.12";
  const setDraft = vi.fn();
  const html = renderToStaticMarkup(createElement(JudgePage, { user: null, draft, setDraft, practiceId }));
  expect(html).toContain("지금 입력은 아직 바꾸지 않았습니다");
  expect(html).toContain("실습 구성을 불러오는 중");
  expect(html).toContain("disabled");
  expect(setDraft).not.toHaveBeenCalled();
  expect(draft.flow.src).toBe("10.10.10.12");
});
it("기존 판정기는 선택 실습 질문을 추가하지 않는다", () => {
  const html = renderToStaticMarkup(createElement(JudgePage, { user: null, draft: blankDraft(), setDraft: () => {} }));
  expect(html).not.toContain("학습실에서 선택한 실습");
  expect(html).toContain("판정하기");
});
it.each(["PASS", "DENY"] as const)("%s 예상 진입은 입력을 아직 쓰지 않고 한 줄만 안내한다 (SSR)", practiceGuess => {
  const draft = blankDraft(); const before = JSON.stringify(draft);
  const setDraft = vi.fn(); const onPracticeLoaded = vi.fn();
  const html = renderToStaticMarkup(createElement(JudgePage, { user: null, draft, setDraft, practiceId: "synthetic-01", practiceGuess, onPracticeLoaded }));
  expect(html).toContain(`내 예상: ${practiceGuess === "PASS" ? "통과" : "막힘"}`);
  expect(html).toContain("구성 불러오기"); expect(html).not.toContain("실습 구성 불러오기");
  expect(setDraft).not.toHaveBeenCalled(); expect(onPracticeLoaded).not.toHaveBeenCalled();
  expect(JSON.stringify(draft)).toBe(before);
});
