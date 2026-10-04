import { useEffect, useId, useRef, useState } from "react";
import type { Route } from "../router";
import type { User } from "../types";

export function AppHeader({ route, user, checked, onLogout }: { route: Route; user: User | null; checked: boolean; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); }, [route]);
  const tab = (name: string, href: string, active: boolean, extra = "") => <a href={href} className={`tab${active ? " on" : ""}${extra}`} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>{name}</a>;
  return <header className="top app-header" onKeyDown={event => {
    if (event.key === "Escape" && open) { setOpen(false); menuButton.current?.focus(); }
  }}>
    <a href="#/home" className="brand" aria-label="NetProof 홈" aria-current={route.page === "home" ? "page" : undefined} onClick={() => setOpen(false)}>NetProof <span>Verify before you trust.</span></a>
    <button type="button" ref={menuButton} className="ghost header-menu-toggle" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}>메뉴</button>
    <nav id={menuId} className={`tabs header-nav${open ? " is-open" : ""}`} aria-label="주요 화면">
      {tab("학습실", "#/learn", route.page === "learn" || route.page === "practice")}
      {tab("판정기", "#/", route.page === "judge")}
      {tab("정책 검증", "#/matrix", route.page === "matrix")}
      {tab("사례 게시판", "#/cases", route.page === "cases" || route.page === "case")}
      {user?.role === "reviewer" && tab("대시보드", "#/dashboard", route.page === "dashboard")}
      {tab("설정", "#/settings", route.page === "settings", " header-mobile-settings")}
    </nav>
    <div className="who header-account">
      {tab("설정", "#/settings", route.page === "settings", " header-desktop-settings")}
      {!checked ? <span className="header-checking">로그인 확인 중…</span> : user ? <>
        <span className="header-nickname">{user.nickname}</span>
        <span className={`badge ${user.role === "reviewer" ? "accent" : "plain"}`}>{user.role_name}</span>
        <button type="button" className="ghost small" onClick={() => { setOpen(false); onLogout(); }}>로그아웃</button>
      </> : <a href="#/login" className="ghost-link" onClick={() => setOpen(false)}>로그인</a>}
    </div>
  </header>;
}
