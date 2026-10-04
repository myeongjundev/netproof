import { useEffect, useState } from "react";
import { lessonById, lessonByCaseId } from "./learning";

export type Route =
  | { page: "home" }
  | { page: "learn"; lessonId?: string }
  | { page: "judge"; share?: string }
  | { page: "practice"; caseId: string }
  | { page: "matrix" }
  | { page: "login" }
  | { page: "cases"; query?: string }
  | { page: "case"; id: number }
  | { page: "dashboard" }
  | { page: "settings" }
  | { page: "missing" };

/** 해시 주소(#/cases/3)를 화면 이름으로 바꾼다. 서버 설정 없이 새로고침·뒤로 가기가 된다. */
export function parseRoute(hash: string): Route {
  if (hash === "" || hash === "#") return { page: "home" };
  const path = hash.replace(/^#/, "") || "/";
  if (path === "/home") return { page: "home" };
  if (path === "/learn") return { page: "learn" };
  if (path.startsWith("/learn/") && lessonById(path.slice(7))) return { page: "learn", lessonId: path.slice(7) };
  if (path.startsWith("/practice/") && lessonByCaseId(path.slice(10))) return { page: "practice", caseId: path.slice(10) };
  if (path === "/") return { page: "judge" };
  if (path === "/matrix") return { page: "matrix" };
  if (path.startsWith("/s/") && path.length > 3) return { page: "judge", share: path.slice(3) };
  if (path === "/login") return { page: "login" };
  if (path === "/cases") return { page: "cases" };
  if (path.startsWith("/cases?")) return { page: "cases", query: path.slice(7) };
  if (path === "/dashboard") return { page: "dashboard" };
  if (path === "/settings") return { page: "settings" };
  const match = path.match(/^\/cases\/(\d+)$/);
  if (match) return { page: "case", id: Number(match[1]) };
  return { page: "missing" };
}

export function go(path: string) {
  window.location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
