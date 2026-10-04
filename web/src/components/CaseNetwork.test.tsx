import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CaseNetwork } from "./CaseNetwork";
import case01 from "../../../cases/synthetic-01-https-acl.json";
import type { Flow, Network } from "../types";

it("통신은 접기 밖, 장비와 ACL 원문은 같은 접기 안에 둔다 (SSR)", () => {
  const html = renderToStaticMarkup(createElement(CaseNetwork, { network: case01.network as Network, flow: case01.flow as Flow }));
  const start = html.indexOf('<details class="mobile-fold">');
  const outside = html.slice(0, start); const inside = html.slice(start, html.lastIndexOf("</details>"));
  expect(outside).toContain('id="network-title"'); expect(outside).toContain("확인할 통신"); expect(outside).toContain("TCP 443");
  expect(outside).not.toContain('class="case-devices"');
  expect(inside).toContain("구성 펼쳐 보기 · 장비 3대 · ACL 1개");
  expect(inside).toContain('class="case-devices"'); expect(inside).toContain("ACL 원문");
  expect(inside).toContain('<details class="case-raw-acl"'); expect(inside).toContain("access-list 101 deny tcp");
  expect(inside).not.toMatch(/<details[^>]*\bopen\b/);
});
it("없는 장비·ACL도 개수를 표시하고 기존 ACL 없음 안내를 유지한다", () => {
  const html = renderToStaticMarkup(createElement(CaseNetwork, { network: { devices: [], acls: {} }, flow: case01.flow as Flow }));
  expect(html).toContain("장비 0대 · ACL 0개"); expect(html).toContain("ACL 없음");
});
