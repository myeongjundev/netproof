import type { Route } from "../router";
import type { User } from "../types";

/** 화면 이동만 제공한다. 실습 상태나 사례를 읽지 않는다. */
export function WorkspaceNav({ route, user }: { route: Route; user: User | null }) {
  const link = (label: string, href: string, active: boolean) => <a href={href} aria-current={active ? "page" : undefined}>{label}</a>;
  return <aside className="workspace-sidebar">
    <nav aria-label="작업 공간">
      <p className="workspace-label">작업 공간</p>
      {link("홈", "#/home", route.page === "home")}
      {link("학습실", "#/learn", route.page === "learn" || route.page === "practice" || route.page === "fix" || route.page === "breach")}
      {link("판정기", "#/", route.page === "judge")}
      {link("정책 검증", "#/matrix", route.page === "matrix")}
      {link("사례 게시판", "#/cases", route.page === "cases" || route.page === "case")}
      {user?.role === "reviewer" && link("대시보드", "#/dashboard", route.page === "dashboard")}
    </nav>
    <p className="workspace-note">설정<br />예상<br />경로<br />근거</p>
  </aside>;
}
