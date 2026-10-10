import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LearningPage } from "./LearningPage";
import { LESSONS } from "../learning";
import { TOOL_TOPICS, TOOL_NOTICE, SECURITY_EXAMPLE, SECURITY_DOC } from "../toolTopics";
import { EXERCISES } from "../exercises";

it("학습실 고치기 과제에는 합성 안내·제목·설명·시작 링크만 있다", () => {
  const html = renderToStaticMarkup(createElement(LearningPage, { onGuess: () => {} }));
  const section = html.slice(html.indexOf("<h2>고치기 과제"), html.indexOf("<h2>수업 도구"));
  expect(section).toContain("합성 구성"); expect(section.match(/시작하기 →/g)).toHaveLength(3);
  for (const exercise of EXERCISES) { expect(section).toContain(exercise.title); expect(section).toContain(exercise.prompt); expect(section).toContain(`href="#/fix/${exercise.id}"`); }
  expect(section).not.toMatch(/완료|성공|정답|점수|%|badge|access-list/);
});

it("목록의 세 연습 주제는 축소 구성도와 상세 링크를 보인다", () => {
  const html = renderToStaticMarkup(createElement(LearningPage, { onGuess: () => {} }));
  expect(html).toContain("주제를 선택하세요"); expect(html).not.toContain('href="#/practice/');
  expect(html.match(/path-strip-small/g)).toHaveLength(3);
  for (const lesson of LESSONS) expect(html).toContain(lesson.title);
});
it.each(LESSONS)("$id는 제목→부제→구성도→예상 질문→실습 링크→설명→다른 주제다", lesson => {
  const html = renderToStaticMarkup(createElement(LearningPage, { lessonId: lesson.id, onGuess: () => {} }));
  expect(html).toContain(`<h1 id="lesson-title">${lesson.title}</h1>`); expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain(`href="#/practice/${lesson.caseId}"`); expect(html).toContain("예상 없이 실습 열기");
  expect(html).not.toContain("이동만으로는 지금 입력이 바뀌지 않습니다");
  expect(html.indexOf('class="learning-question"')).toBeLessThan(html.indexOf('class="path-strip path-strip-bounded"'));
  expect(html.indexOf('class="path-strip path-strip-bounded"')).toBeLessThan(html.indexOf("먼저 예상해 보세요"));
  expect(html.indexOf("막힐 것 같다")).toBeLessThan(html.indexOf("예상 없이 실습 열기"));
  expect(html).toContain(lesson.guessPrompt); expect(html).toContain("NetProof 계산 범위");
  expect(html).toContain(`이 실습에서 볼 것: ${lesson.focus}`);
  expect(html).not.toContain(lesson.task.question);
  expect(html.split(lesson.guessPrompt)).toHaveLength(2);
  expect(html.match(/\?/g)).toHaveLength(1);
  expect(html.indexOf("예상 없이 실습 열기")).toBeLessThan(html.indexOf("개념</h2>"));
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

it("실습 카드 뒤의 수업 도구 카드 세 개는 그림 없이 공부 링크를 보인다", () => {
  const html = renderToStaticMarkup(createElement(LearningPage, { onGuess: () => {} }));
  expect(html.indexOf("수업 도구</h2>")).toBeGreaterThan(html.indexOf("실습 열기 →"));
  expect(html).toContain('aria-label="수업 도구"');
  for (const topic of TOOL_TOPICS) {
    expect(html).toContain(`href="#/learn/${topic.id}"`);
    expect(html).toContain(topic.title);
    expect(html).toContain(topic.description);
  }
  expect(html.match(/공부하기 →/g)).toHaveLength(3);
  expect(html.match(/path-strip-small/g)).toHaveLength(3);
});

it.each(TOOL_TOPICS)("$id 도구 화면은 승인 원고·절·출처만 보이고 실습 UI는 없다", topic => {
  const html = renderToStaticMarkup(createElement(LearningPage, { lessonId: topic.id, onGuess: () => { throw new Error("unexpected guess"); } }));
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>(.*?)<\/h\1>/g)].map(([, level, title]) => [level, title]);
  expect(headings).toEqual([["1", topic.title], ["2", "개념"], ["2", "쉬운 비유"], ["2", topic.id === "n8n" ? "NetProof로 해 보기" : "NetProof 로그로 해 보기"], ["2", topic.example.title], ["2", "확인할 것"], ["2", "다른 주제"]]);
  expect(html).toContain(`학습실 · ${topic.category}`);
  expect(html).toContain(`이 주제에서 볼 것: ${topic.focus}`);
  expect(html).toContain(TOOL_NOTICE);
  expect(html).toContain(`문서 기준: ${topic.version}, ${topic.checked} 확인.`);
  expect(html).toContain(`href="${topic.doc.href}" target="_blank" rel="noreferrer"`);
  expect(html).toContain(`${topic.doc.label} ↗`);
  if (topic.id !== "n8n") {
    expect(topic.doc.href).toBe(SECURITY_DOC); expect(topic.example.text).toBe(SECURITY_EXAMPLE);
  }
  const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
  expect(html).toContain(`<pre><code>${escape(topic.example.text)}</code></pre>`);
  for (const point of [...topic.concepts, ...topic.steps, ...topic.checkpoints, topic.analogy]) expect(html).toContain(escape(point));
  for (const source of topic.sources) expect(html).toContain(`href="${source.href}" target="_blank" rel="noreferrer"`);
  expect(html).not.toMatch(/path-strip|home-puzzle|실습 열기|예상 없이|type="radio"/);
  for (const item of [...LESSONS, ...TOOL_TOPICS]) expect(html).toContain(`href="#/learn/${item.id}"`);
});

it.each(LESSONS)("$id 실습의 다른 주제에도 도구 링크가 있다", lesson => {
  const html = renderToStaticMarkup(createElement(LearningPage, { lessonId: lesson.id, onGuess: () => {} }));
  for (const topic of TOOL_TOPICS) expect(html).toContain(`href="#/learn/${topic.id}"`);
});

it("F26 CSS는 휴대폰에만 적용하고 로그아웃 단추 최소 높이 44px를 유지한다", async () => {
  const { readFileSync } = await vi.importActual<{ readFileSync(path: URL, encoding: "utf8"): string }>("node:fs");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const mobile = css.split("@media (max-width: 960px) {")[1].split("@media (max-width: 720px) {")[0];
  expect(mobile).toContain("flex-wrap: nowrap;");
  expect(mobile).toContain(".app-header .header-nickname { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }");
  expect(mobile).toContain(".app-header .header-account > button { flex-shrink: 0; }");
  expect(css.split("@media (max-width: 720px) {")[1]).toContain(".app-header .header-account .badge { display: none; }");
  expect(css).toContain(".app-header .header-menu-toggle, .app-header .header-account > .ghost-link, .app-header .header-account > button { min-height: 44px; }");
});
