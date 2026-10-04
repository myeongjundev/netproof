import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LearningPage } from "./LearningPage";
import { LESSONS } from "../learning";

it("목록의 세 연습 주제는 축소 구성도와 상세 링크를 보인다", () => {
  const html = renderToStaticMarkup(createElement(LearningPage, {}));
  expect(html).toContain("주제를 선택하세요"); expect(html).not.toContain('href="#/practice/');
  expect(html.match(/path-strip-small/g)).toHaveLength(3);
  for (const lesson of LESSONS) expect(html).toContain(lesson.title);
});
it.each(LESSONS)("$id는 제목→질문→구성도→판정기 링크→설명→다른 주제다", lesson => {
  const html = renderToStaticMarkup(createElement(LearningPage, { lessonId: lesson.id }));
  expect(html).toContain(`<h1 id="lesson-title">${lesson.title}</h1>`); expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain(`href="#/practice/${lesson.caseId}"`); expect(html).toContain("판정기에서 열기");
  expect(html).toContain("이동만으로는 지금 입력이 바뀌지 않습니다");
  expect(html.indexOf('class="learning-question"')).toBeLessThan(html.indexOf('class="path-strip"'));
  expect(html.indexOf('class="path-strip"')).toBeLessThan(html.indexOf("판정기에서 열기"));
  expect(html.indexOf("판정기에서 열기")).toBeLessThan(html.indexOf("개념</h2>"));
  expect(html.indexOf("개념</h2>")).toBeLessThan(html.indexOf("쉬운 비유</h2>"));
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>(.*?)<\/h\1>/g)].map(([, level, title]) => [level, title]);
  expect(headings).toEqual([["1", lesson.title], ["2", "개념"], ["2", "쉬운 비유"], ["2", "확인할 것"], ["2", "다른 주제"]]);
  expect(html.indexOf("계산 결과는 실제 장비 동작을 보장하지 않습니다")).toBeLessThan(html.indexOf("다른 주제</h2>"));
  expect(html).toContain('aria-current="page"'); expect(html).toContain("· 보는 중");
  for (const point of lesson.task.checkpoints) expect(html).toContain(point);
  expect(html).not.toMatch(/PASS|DENY|살펴보기|합성 실습|정답은 통과|정답은 막힘/);
});
it("없는 주제도 학습실 틀 안에서 복귀 경로를 보인다", () => {
  const html = renderToStaticMarkup(createElement(LearningPage, { lessonId: "missing" }));
  expect(html).toContain('class="learning-page"'); expect(html).toContain("<h1>없는 학습 주제");
  expect(html).toContain('href="#/learn"'); expect(html).not.toContain("HTTPS");
});
