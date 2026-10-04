import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { blankDraft } from "../draft";
import { HomePage } from "./HomePage";
import { api } from "../api";
import type { User } from "../types";
import { vi } from "vitest";

it.each([false, true])("로그인 확인 중이어도 공개 홈과 실습 링크가 있다: %s", (checked) => {
  const spy = vi.spyOn(api, "searchCases");
  const html = renderToStaticMarkup(createElement(HomePage, { draft: blankDraft(), user: null, checked }));
  expect(html).toContain("첫 실습 둘러보기");
  expect(html).toContain('href="#/learn/https-acl"');
  expect(html).toContain('href="#/"');
  expect(html).not.toContain("작성 중인 입력이 있습니다");
  expect(html).not.toMatch(/정답률|진도율|완료 배지|PASS|DENY/);
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});

it("현재 입력으로 돌아가기는 유지 기간을 사실대로 설명한다", () => {
  const draft = blankDraft(); draft.flow.dst_port = 444;
  const html = renderToStaticMarkup(createElement(HomePage, { draft, user: null, checked: true }));
  expect(html).toContain("현재 입력으로 돌아가기");
  expect(html).toContain("새로고침하면 입력은 사라집니다");
  expect(html).toContain("이전 판정 결과는 복원하지 않습니다");
  expect(draft.flow.dst_port).toBe(444);
});

it("홈은 로그인 상태를 안내하지만 계정명이나 사례 내용을 싣지 않는다", () => {
  const user: User = { id: 1, nickname: "private-nickname", role: "user", role_name: "사용자" };
  const html = renderToStaticMarkup(createElement(HomePage, { draft: blankDraft(), user, checked: true }));
  expect(html).toContain("실제 결과 확인 상태");
  expect(html).not.toContain(user.nickname);
});
