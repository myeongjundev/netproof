import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspaceNav } from "./WorkspaceNav";
import { api } from "../api";
import type { Route } from "../router";
import type { User } from "../types";

it.each<{ route: Route; href: string }>([
  { route: { page: "home" }, href: "#/home" },
  { route: { page: "learn", lessonId: "roundtrip" }, href: "#/learn" },
  { route: { page: "practice", caseId: "synthetic-02" }, href: "#/learn" },
  { route: { page: "fix", id: "fix-01" }, href: "#/learn" },
  { route: { page: "breach", id: "breach-01" }, href: "#/learn" },
  { route: { page: "judge" }, href: "#/" },
  { route: { page: "matrix" }, href: "#/matrix" },
  { route: { page: "cases" }, href: "#/cases" },
  { route: { page: "case", id: 1 }, href: "#/cases" },
])("작업 공간의 현재 위치는 기존 화면 주소 하나를 가리킨다: $route.page", ({ route, href }) => {
  const html = renderToStaticMarkup(createElement(WorkspaceNav, { route, user: null }));
  const current = [...html.matchAll(/<a href="([^"]+)" aria-current="page"/g)].map(match => match[1]);
  expect(current).toEqual([href]);
});

it.each([null, "user", "reviewer"] as const)("검토자 탐색은 기존 권한별 표시만 제공한다: %s", role => {
  const user: User | null = role ? { id: 1, nickname: "private-nickname", role, role_name: "QA" } : null;
  const spies = [vi.spyOn(api, "searchCases"), vi.spyOn(api, "examples"), vi.spyOn(api, "verify")];
  try {
    const html = renderToStaticMarkup(createElement(WorkspaceNav, { route: { page: "dashboard" }, user }));
    expect(html.includes('href="#/dashboard"')).toBe(role === "reviewer");
    expect(html.includes('aria-current="page"')).toBe(role === "reviewer");
    expect(html).not.toContain("private-nickname");
    expect(html).not.toMatch(/PASS|DENY|정답|점수|완료|성공|%|button/);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  } finally { for (const spy of spies) spy.mockRestore(); }
});
