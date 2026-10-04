import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GuessPuzzle } from "./GuessPuzzle";
import { LESSONS } from "../learning";

it.each(LESSONS)("$id 예상 블록은 흐름 질문과 같은 무게의 선택 두 개뿐이다", lesson => {
  const onGuess = vi.fn();
  const html = renderToStaticMarkup(createElement(GuessPuzzle, { lesson, heading: "h2", primary: true, onGuess }));
  expect(html).toContain("<h2>먼저 예상해 보세요</h2>"); expect(html).toContain(lesson.guessPrompt);
  expect(html).toContain(`role="group" aria-labelledby="guess-question-${lesson.caseId}"`);
  expect(html).toContain(`id="guess-question-${lesson.caseId}"`);
  expect(html).toContain('class="home-puzzle-question"');
  expect(html).toContain("고르면 실습 화면에서 이 구성으로 계산해 봅니다.");
  expect(html.indexOf("고르면 실습 화면")).toBeGreaterThan(html.indexOf("막힐 것 같다</button>"));
  expect(html.match(/<button type="button" class="primary">/g)).toHaveLength(2);
  expect(html).not.toMatch(/aria-pressed|checked|PASS|DENY|expect|정답|NetProof 계산 통과|NetProof 계산 막힘/);
  expect(onGuess).not.toHaveBeenCalled();
  // 훅 없는 공유 컴포넌트가 렌더링한 실제 onClick을 호출해 ID/선택 전달을 확인한다.
  const tree = GuessPuzzle({ lesson, onGuess });
  const actions = tree.props.children[3] as ReactElement<{ children: ReactElement<{ onClick: () => void }>[] }>;
  actions.props.children[0].props.onClick(); actions.props.children[1].props.onClick();
  expect(onGuess.mock.calls).toEqual([[lesson.caseId, "PASS"], [lesson.caseId, "DENY"]]);
});
it("이어서 하기 얼굴의 h3와 테두리 단추를 유지한다", () => {
  const html = renderToStaticMarkup(createElement(GuessPuzzle, { lesson: LESSONS[0], onGuess: () => {} }));
  expect(html).toContain("<h3>먼저 예상해 보세요</h3>");
  expect(html.match(/<button type="button" class="ghost">/g)).toHaveLength(2);
});
