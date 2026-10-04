import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { blankDraft } from "../draft";
import { HomePage } from "./HomePage";
import { api } from "../api";
import type { User } from "../types";

it.each([
  [false, [["1", "왜 통과하고,어디서 막힐까요?"], ["2", "먼저 예상해 보세요"]]],
  [true, [["1", "작성하던 입력이 있어요"], ["2", "다음 실습: HTTPS와 입력 ACL"], ["3", "먼저 예상해 보세요"]]],
] as const)("두 얼굴의 퍼즐 제목은 상위 제목 다음 단계다: 이어서 하기=%s", (resume, expected) => {
  const draft = blankDraft();
  if (resume) draft.flow.dst_port = 8443;
  const html = renderToStaticMarkup(createElement(HomePage, { draft, user: null, checked: true, onGuess: () => {} }));
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map(([, level, title]) => [level, title.replace(/<[^>]*>/g, "")]);
  expect(headings.slice(0, expected.length)).toEqual(expected);
});

it.each([false, true])("공개 첫 얼굴은 선택되지 않은 예상 퍼즐과 모델 밖 구간을 보인다: %s", checked => {
  const spies = [vi.spyOn(api, "searchCases"), vi.spyOn(api, "examples"), vi.spyOn(api, "verify")];
  const onGuess = vi.fn();
  const html = renderToStaticMarkup(createElement(HomePage, { draft: blankDraft(), user: null, checked, onGuess }));
  expect(html.match(/<h1\b/g)).toHaveLength(1);
  expect(html).toContain("먼저 예상해 보세요");
  expect(html).toContain("통과할 것 같다"); expect(html).toContain("막힐 것 같다");
  expect(html.match(/<button\b/g)).toHaveLength(2);
  expect(html).not.toMatch(/aria-pressed="true"|checked|PASS|DENY|expect|정답/);
  expect(html).toContain("NetProof 계산 범위"); expect(html).toContain("실제 장비");
  expect(html).not.toContain("NetProof는 모델 안에서 계산합니다");
  expect(html).not.toContain("판정기:");
  expect(html.match(/<button type="button" class="primary">/g)).toHaveLength(2);
  const hero = html.split("</section>")[0];
  expect(hero.match(/<a /g)).toHaveLength(1); expect(hero).not.toContain("학습실 전체 보기");
  expect(html).toContain('href="#/learn"'); expect(html).toContain("판정기 바로 열기");
  expect(html).not.toContain("작성하던 입력이 있어요"); expect(onGuess).not.toHaveBeenCalled();
  for (const spy of spies) { expect(spy).not.toHaveBeenCalled(); spy.mockRestore(); }
});
it("작성 중 얼굴은 요약·이어서 하기를 먼저 보이고 새 퍼즐은 h2 아래다", () => {
  const draft = blankDraft(); draft.flow.dst_port = 444;
  draft.claim = { expected: "DENY", kind: "self", source: "", text: "" };
  const before = JSON.stringify(draft);
  const html = renderToStaticMarkup(createElement(HomePage, { draft, user: null, checked: true, onGuess: () => {} }));
  expect(html.match(/<h1\b/g)).toHaveLength(1); expect(html).toContain("작성하던 입력이 있어요</h1>");
  expect(html).toContain("TCP 444 · 내 예상 막힘 · 장비 3대 · ACL 0개");
  expect(html).toContain('href="#/"'); expect(html).toContain("이어서 하기");
  expect(html).toContain("새로고침하면 입력이 사라집니다");
  expect(html.indexOf("이어서 하기")).toBeLessThan(html.indexOf("다음 실습: HTTPS와 입력 ACL</h2>"));
  expect(html.indexOf("다음 실습: HTTPS와 입력 ACL</h2>")).toBeLessThan(html.indexOf("먼저 예상해 보세요"));
  expect(html).not.toContain("home-resume");
  expect(html).not.toMatch(/PASS|DENY|expect|정답|NetProof 계산 통과|NetProof 계산 막힘/);
  expect(JSON.stringify(draft)).toBe(before);
});
it.each([
  ["synthetic-01", "HTTPS와 입력 ACL", "왕복 경로"],
  ["synthetic-02", "왕복 경로", "출력 ACL"],
  ["synthetic-03", "출력 ACL", "HTTPS와 입력 ACL"],
  [null, null, "HTTPS와 입력 ACL"],
  ["unknown", null, "HTTPS와 입력 ACL"],
] as const)("이어서 하기의 출발 맥락과 다음 퍼즐: %s", (practiceCaseId, started, next) => {
  const draft = blankDraft(); draft.flow.dst_port = 444;
  const before = JSON.stringify(draft);
  const html = renderToStaticMarkup(createElement(HomePage, { draft, user: null, checked: true, onGuess: () => {}, practiceCaseId }));
  expect(html).toContain(started ? `${started} 실습` : "네트워크 설정 검증 실습실");
  expect(html).toContain(`다음 실습: ${next}</h2>`);
  expect(html).not.toMatch(/expect|정답|NetProof 계산 통과|NetProof 계산 막힘/);
  expect(JSON.stringify(draft)).toBe(before);
});
it.each(["practice-only", "judge-only", "both"])("이어서 하기 입력·주소는 실습과 판정기를 구분한다: %s", mode => {
  const draft = blankDraft();
  if (mode !== "practice-only") draft.flow.dst_port = 8443;
  const practiceDraft = blankDraft(); practiceDraft.flow.dst_port = 22;
  const practiceCaseId = mode === "judge-only" ? null : "synthetic-03";
  const html = renderToStaticMarkup(createElement(HomePage, { draft, practiceDraft, practiceCaseId, user: null, checked: true, onGuess: () => {} }));
  const hero = html.split("</section>")[0];
  if (practiceCaseId) {
    expect(hero).toContain("하던 실습이 있어요");
    expect(hero).toContain('href="#/practice/synthetic-03">실습 이어서 하기');
    expect(hero).toContain("TCP 22"); expect(hero).not.toContain("TCP 8443");
    expect(hero.includes("판정기 입력 이어서 하기")).toBe(mode === "both");
  } else {
    expect(hero).toContain("작성하던 입력이 있어요");
    expect(hero).toContain('href="#/">이어서 하기');
    expect(hero).toContain("TCP 8443"); expect(hero).not.toContain("TCP 22");
  }
});
it("홈은 계정명이나 사례 내용을 싣지 않고 주제별 구성도와 같은 동작명을 쓴다", () => {
  const user: User = { id: 1, nickname: "private-nickname", role: "user", role_name: "사용자" };
  const html = renderToStaticMarkup(createElement(HomePage, { draft: blankDraft(), user, checked: true, onGuess: () => {} }));
  expect(html).toContain("실제 결과 확인 상태"); expect(html).not.toContain(user.nickname);
  expect(html.match(/path-strip-small/g)).toHaveLength(3); expect(html).toContain("실습 열기");
  expect(html).not.toContain("살펴보기");
});
it("하던 실습의 입력이 없으면 준비 중이 아닌 미불러오기 사실을 쓴다", () => {
  const html = renderToStaticMarkup(createElement(HomePage, { draft: blankDraft(), practiceCaseId: "synthetic-01", user: null, checked: true, onGuess: () => {} }));
  expect(html).toContain("실습 구성을 아직 불러오지 않았습니다.");
  expect(html).not.toContain("실습 입력을 준비하고 있습니다.");
});
