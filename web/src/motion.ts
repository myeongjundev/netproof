/** 움직임 줄이기 설정을 모든 안내 스크롤에서 따른다. */
export function scrollTo(element: HTMLElement, block: ScrollLogicalPosition = "start") {
  element.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block });
}
