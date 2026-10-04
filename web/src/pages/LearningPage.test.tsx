import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LearningPage } from "./LearningPage";
import { LESSONS } from "../learning";

it("목록의 세 연습 주제는 축소 구성도와 상세 링크를 보인다", () => {
  const html = renderToStaticMarkup(createElement(LearningPage, { onGuess: () => {} }));
  expect(html).toContain("주제를 선택하세요"); expect(html).not.toContain('href="#/practice/');
  expect(html.match(/path-strip-small/g)).toHaveLength(3);
  for (const lesson of LESSONS) expect(html).toContain(lesson.title);
});
it.each(LESSONS)("$id는 제목→부제→구성도→예상 질문→판정기 링크→설명→다른 주제다", lesson => {
  const html = renderToStaticMarkup(createElement(LearningPage, { lessonId: lesson.id, onGuess: () => {} }));
  expect(html).toContain(`<h1 id="lesson-title">${lesson.title}</h1>`); expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain(`href="#/practice/${lesson.caseId}"`); expect(html).toContain("판정기에서 열기");
  expect(html).toContain("이동만으로는 지금 입력이 바뀌지 않습니다");
  expect(html.indexOf('class="learning-question"')).toBeLessThan(html.indexOf('class="path-strip path-strip-bounded"'));
  expect(html.indexOf('class="path-strip path-strip-bounded"')).toBeLessThan(html.indexOf("먼저 예상해 보세요"));
  expect(html.indexOf("막힐 것 같다")).toBeLessThan(html.indexOf("예상 없이 판정기에서 열기"));
  expect(html).toContain(lesson.guessPrompt); expect(html).toContain("NetProof 계산 범위");
  expect(html).toContain(`이 실습에서 볼 것: ${lesson.focus}`);
  expect(html).not.toContain(lesson.task.question);
  expect(html.split(lesson.guessPrompt)).toHaveLength(2);
  expect(html.match(/\?/g)).toHaveLength(1);
  expect(html.indexOf("판정기에서 열기")).toBeLessThan(html.indexOf("개념</h2>"));
  expect(html.indexOf("개념</h2>")).toBeLessThan(html.indexOf("쉬운 비유</h2>"));
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>(.*?)<\/h\1>/g)].map(([, level, title]) => [level, title]);
  expect(headings).toEqual([["1", lesson.title], ["2", "먼저 예상해 보세요"], ["2", "개념"], ["2", "쉬운 비유"], ["2", "확인할 것"], ["2", "다른 주제"]]);
  expect(html.indexOf("계산 결과는 실제 장비 동작을 보장하지 않습니다")).toBeLessThan(html.indexOf("다른 주제</h2>"));
  expect(html).toContain('aria-current="page"'); expect(html).toContain("· 보는 중");
  for (const point of lesson.task.checkpoints) expect(html).toContain(point);
  expect(html).not.toMatch(/PASS|DENY|살펴보기|합성 실습|정답은 통과|정답은 막힘/);
});
it("없는 주제도 학습실 틀 안에서 복귀 경로를 보인다", () => {
  const html = renderToStaticMarkup(createElement(LearningPage, { lessonId: "missing", onGuess: () => {} }));
  expect(html).toContain('class="learning-page"'); expect(html).toContain("<h1>없는 학습 주제");
  expect(html).toContain('href="#/learn"'); expect(html).not.toContain("HTTPS");
});
