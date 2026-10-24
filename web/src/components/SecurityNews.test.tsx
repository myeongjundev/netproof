import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SecurityNewsPanel } from "./SecurityNews";
import type { SecurityNews } from "../types";

const data: SecurityNews = {
  source: "CISA KEV", catalog_version: "2026.10.23", catalog_url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
  fetched_at: "2026-10-24T10:00:00+00:00", stale: false, vendors: Array.from({ length: 16 }, (_, i) => `V${i}`), total: 314,
  items: [
    { cve: "CVE-2026-9002", vendor: "Fortinet", product: "FortiOS", name: "Fortinet FortiOS Path Traversal Vulnerability", date_added: "2026-10-16",
      description: "Fortinet FortiOS contains a path traversal <b>vulnerability</b>.", ransomware: true, nvd: "https://nvd.nist.gov/vuln/detail/CVE-2026-9002" },
    { cve: "CVE-2026-9003", vendor: "Netgate", product: "pfSense", name: "Netgate pfSense Command Injection Vulnerability", date_added: "2026-10-01",
      description: "pfSense contains a command injection vulnerability.", ransomware: false, nvd: "https://nvd.nist.gov/vuln/detail/CVE-2026-9003" },
  ],
};
const render = (state: Parameters<typeof SecurityNewsPanel>[0]["state"]) =>
  renderToStaticMarkup(createElement(SecurityNewsPanel, { state, onRetry: () => {} }));

it("받은 자료: 업체·제품·지정일·랜섬웨어 표시·NVD 새 창 링크와 출처·판·받은 시각·영어 원문 안내를 보인다", () => {
  const html = render({ status: "ready", data });
  expect(html).toContain("네트워크 장비 보안 소식 · CISA KEV");
  expect(html.match(/<li\b/g)).toHaveLength(2);
  expect(html).toContain("Fortinet FortiOS"); expect(html).toContain("2026-10-16 지정");
  expect(html.match(/랜섬웨어 악용 알려짐/g)).toHaveLength(1);
  expect(html).toContain('href="https://nvd.nist.gov/vuln/detail/CVE-2026-9002" target="_blank" rel="noopener noreferrer"');
  expect(html).toContain("&lt;b&gt;vulnerability&lt;/b&gt;"); // 원문은 글자로만 보이고 HTML로 해석하지 않는다
  expect(html).toContain('lang="en"');
  expect(html).toContain("카탈로그 판 2026.10.23");
  expect(html).toContain("네트워크·보안 장비 16개 업체 314건 가운데 최신 2건");
  expect(html).toContain("설명은 영어 원문입니다");
  expect(html).toContain("NetProof는 이 취약점을 계산하지 않습니다");
  expect(html).not.toContain("이전에 받은 자료");
  expect(html).not.toMatch(/점수|정답|완료|안전합니다/);
});

it("오래된 자료는 따로 알리고, 실패는 오류와 다시 불러오기, 불러오는 중은 상태로 보인다", () => {
  expect(render({ status: "ready", data: { ...data, stale: true } })).toContain("새로 받지 못해 이전에 받은 자료를 보여 줍니다");
  const failed = render({ status: "error", message: "보안 소식을 가져오지 못했습니다. 잠시 뒤 다시 시도하세요" });
  expect(failed).toContain('role="alert"'); expect(failed).toContain("다시 불러오기");
  expect(failed).not.toContain("<li");
  expect(render({ status: "loading" })).toContain("불러오는 중");
});
