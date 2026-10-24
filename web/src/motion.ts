/** 움직임 줄이기 설정을 모든 안내 스크롤에서 따른다. */
export function scrollTo(element: HTMLElement, block: ScrollLogicalPosition = "start") {
  element.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block });
}

/** 방금 바뀐 결과가 화면에서 먼 곳에 생길 때, 다음 그림에서 그 요소로 스크롤한다. */
export function scrollToId(id: string) {
  requestAnimationFrame(() => {
    const element = document.getElementById(id);
    if (element) scrollTo(element);
  });
}
