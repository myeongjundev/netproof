import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LearningPage } from "./LearningPage";
import { LESSONS } from "../learning";

it("목록에는 세 합성 주제만 있고 자동 실행 링크나 채점이 없다", () => {
  const html = renderToStaticMarkup(createElement(LearningPage, {}));
  expect(html).toContain("살펴볼 주제를 선택하세요");
  expect(html).not.toContain('href="#/practice/');
  for (const lesson of LESSONS) expect(html).toContain(lesson.title);
});
it.each(LESSONS)("$id는 질문→개념→비유→체크포인트→명시적 시작→출처다", lesson => {
  const html = renderToStaticMarkup(createElement(LearningPage, { lessonId: lesson.id }));
  expect(html).toContain(`href="#/practice/${lesson.caseId}"`);
  expect(html).toContain('aria-current="page"');
  expect(html).toContain("지금 입력은 바뀌지 않습니다");
  expect(html).toContain("계산 결과는 실제 장비 동작을 보장하지 않습니다");
  for (const point of lesson.task.checkpoints) expect(html).toContain(point);
  expect(html.indexOf("개념</h3>")).toBeLessThan(html.indexOf("쉬운 비유</h3>"));
  expect(html).not.toMatch(/PASS|DENY|정답은 통과|정답은 막힘/);
});
it("모르는 주제를 조용히 다른 실습으로 바꾸지 않는다", () => {
  const html = renderToStaticMarkup(createElement(LearningPage, { lessonId: "missing" }));
  expect(html).toContain("없는 학습 주제");
  expect(html).not.toContain("HTTPS");
});
