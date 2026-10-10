import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActualBadge } from "./Badges";
import type { CaseSummary, Result } from "../types";

const render = (result: Result, actual_result: CaseSummary["actual_result"], confirmed = false) => renderToStaticMarkup(createElement(ActualBadge, { item: { result, actual_result, confirmed } }));
it.each(["PASS", "DENY"] as const)("확인 전 판정 %s의 같음·다름은 plain 배지에만 덧붙인다", result => {
  for (const actual of ["PASS", "DENY"] as const) {
    expect(render(result, actual)).toBe(`<span class="badge plain">확인 전 · ${actual} · 판정과 ${actual === result ? "같음" : "다름"}</span>`);
  }
});
it.each(["UNSUPPORTED", "INVALID"] as const)("확인 전 %s는 실제 결과만 보이고 같음·다름을 붙이지 않는다", result => {
  for (const actual of ["PASS", "DENY"] as const) expect(render(result, actual)).toBe(`<span class="badge plain">확인 전 · ${actual}</span>`);
});
it.each(["PASS", "DENY", "UNSUPPORTED", "INVALID"] as const)("확인된 %s의 기존 표시·스타일은 유지한다", result => {
  for (const actual of ["PASS", "DENY"] as const) {
    const expected = result === "INVALID" || result === "UNSUPPORTED" ? '<span class="badge warn">확인 · 범위 밖</span>'
      : result === actual ? '<span class="badge good">확인 · 판정과 일치</span>' : '<span class="badge bad">확인 · 판정과 다름</span>';
    expect(render(result, actual, true)).toBe(expected);
  }
});
it.each(["PASS", "DENY", "UNSUPPORTED", "INVALID"] as const)("실제 결과 없는 %s는 확인 여부와 관계없이 안 적음이다", result => {
  for (const confirmed of [false, true]) expect(render(result, null, confirmed)).toBe('<span class="badge plain">안 적음</span>');
});
