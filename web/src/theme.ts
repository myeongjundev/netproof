export type Theme = "system" | "light" | "dark";

const KEY = "netproof-theme";

/** 저장값이 없거나 저장소를 못 쓰면 라이트로 시작한다. */
export function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" || value === "system" ? value : "light";
  } catch {
    return "light";
  }
}

/** <html data-theme>만 바꾼다. 색은 styles.css의 light-dark()가 고른다. */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // 저장하지 못해도 지금 화면에는 적용된다.
  }
}
