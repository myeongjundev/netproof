export type Theme = "system" | "light" | "dark";

const KEY = "netproof-theme";

/** 이 브라우저에 저장된 테마. 저장소를 못 쓰는 창(사생활 보호 등)이면 시스템을 따른다. */
export function savedTheme(): Theme {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

/** <html data-theme>만 바꾼다. 색은 styles.css의 light-dark()가 고른다. */
export function applyTheme(theme: Theme) {
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    if (theme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // 저장하지 못해도 지금 화면에는 적용된다.
  }
}
