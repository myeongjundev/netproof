import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppHeader } from "./AppHeader";
import type { User } from "../types";

const user: User = { id: 1, nickname: "동기", role: "user", role_name: "사용자" };
it.each([{ page: "practice", caseId: "synthetic-01" }, { page: "fix", id: "fix-01" }] as const)("실습·고치기 화면은 학습실 탭만 현재 화면으로 표시한다: $page", route => {
  const html = renderToStaticMarkup(createElement(AppHeader, { route, user: null, checked: true, onLogout: () => {} }));
  expect(html).toContain('href="#/learn" class="tab on" aria-current="page"');
  expect(html).not.toContain('href="#/" class="tab on"');
});
it("첫 헤더는 홈 로고·학습실·기존 판정기와 접힌 메뉴를 제공한다", () => {
  const html = renderToStaticMarkup(createElement(AppHeader, { route: { page: "home" }, user: null, checked: true, onLogout: () => {} }));
  expect(html).toContain('href="#/home"');
  expect(html).toContain('aria-label="NetProof 홈" aria-current="page"');
  expect(html).toContain('href="#/"');
  expect(html).toContain('href="#/learn"');
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain('aria-controls=');
  expect(html).not.toContain("내 실습");
});
it("메뉴 단추는 nav보다 앞에 있어 펼친 항목으로 Tab 이동할 수 있다", () => {
  const html = renderToStaticMarkup(createElement(AppHeader, { route: { page: "home" }, user: null, checked: true, onLogout: () => {} }));
  const brand = html.indexOf('class="brand"');
  const button = html.indexOf('class="ghost header-menu-toggle"');
  const nav = html.indexOf("<nav ");
  const account = html.indexOf('class="who header-account"');
  for (const index of [brand, button, nav, account]) expect(index).toBeGreaterThanOrEqual(0);
  expect(brand).toBeLessThan(button);
  expect(button).toBeLessThan(nav);
  expect(nav).toBeLessThan(account);
});
it.each(["user", "reviewer"] as const)("대시보드는 검토자에게만, 로그인 표시는 기존대로: %s", role => {
  const html = renderToStaticMarkup(createElement(AppHeader, { route: { page: "judge" }, user: { ...user, role }, checked: true, onLogout: () => {} }));
  expect(html.includes('href="#/dashboard"')).toBe(role === "reviewer");
  expect(html).toContain("동기"); expect(html).toContain("로그아웃");
});
it("사례 상세에서는 게시판 링크가 활성이고 로그인 확인은 동작을 막지 않는다", () => {
  const html = renderToStaticMarkup(createElement(AppHeader, { route: { page: "case", id: 1 }, user: null, checked: false, onLogout: () => {} }));
  expect(html).toContain('href="#/cases" class="tab on" aria-current="page"');
  expect(html).toContain("로그인 확인 중");
  expect(html).toContain("학습실");
});
