import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SectionRail, activeSection } from "./SectionRail";

const sections = [{ id: "a", label: "상황" }, { id: "b", label: "피해 범위" }, { id: "c", label: "근거" }];

it("기준선을 지난 마지막 구역이 지금 보는 구역이고, 아무것도 안 지났으면 첫 구역이다", () => {
  expect(activeSection(sections, { a: 300, b: 900, c: 1500 })).toBe("a");
  expect(activeSection(sections, { a: -400, b: 60, c: 700 })).toBe("b");
  expect(activeSection(sections, { a: -400, b: 0, c: 120 })).toBe("b"); // 짧은 구역으로 가도 다음 구역이 아니라 그 구역이다
  expect(activeSection(sections, { a: -900, b: -300, c: 20 })).toBe("c");
  expect(activeSection(sections, { a: -900, c: 20 })).toBe("c"); // 없는 구역은 건너뛴다
  expect(activeSection([], {})).toBe("");
});

it("막대는 구역 단추·맨 위로·다시 확인을 보이고, 첫 구역을 현재 위치로 표시한다", () => {
  const html = renderToStaticMarkup(createElement(SectionRail, { sections, onRecheck: () => {}, recheckDisabled: true }));
  expect(html).toContain('aria-label="이 화면의 구역"');
  expect(html.match(/<li>/g)).toHaveLength(3);
  expect(html).toContain('aria-current="location">상황</button>');
  expect(html).toContain('aria-label="맨 위로"');
  expect(html).toMatch(/aria-label="다시 확인"[^>]*disabled=""/);
  expect(html).not.toContain("href=");
});
