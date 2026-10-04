import { describe, expect, it } from "vitest";
import type { Claim, Verdict } from "./types";
import { comparisonBanner, statusLine } from "./verdictView";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResultPanel } from "./components/ResultPanel";
import { AclAudit } from "./components/AclAudit";
import { SuggestPanel } from "./components/SuggestPanel";
import type { AclAudit as AuditResult } from "./types";

const claim: Claim = { expected: "PASS", source: "not in banner", text: "" };
const verdict: Verdict = { result: "DENY", comparison: "AGREE", reason: "verbatim", problems: [], forward: null, return: null, decisive: null };
describe("engine comparison presentation", () => {
  describe.each(["ai", "self", null, undefined] as const)("kind=%s", kind => {
    it.each(["PASS", "DENY"] as const)("uses the engine comparison, expected=%s", expected => {
      const who = kind === "ai" ? "AI 답" : kind === "self" ? "내 예상" : "받은 답";
      const answer = `${who}(${expected === "PASS" ? "통과" : "막힘"})과`;
      for (const result of ["PASS", "DENY"] as const) {
        // Deliberately includes PASS/PASS/DISAGREE and PASS/DENY/AGREE.
        expect(comparisonBanner({ ...verdict, result, comparison: "AGREE" }, { ...claim, kind, expected })).toEqual({ tone: "agree", text: `= ${answer} NetProof 계산이 같습니다` });
        const banner = comparisonBanner({ ...verdict, result, comparison: "DISAGREE" }, { ...claim, kind, expected });
        expect(banner).toEqual({ tone: "disagree", text: `≠ ${answer} NetProof 계산(${result === "PASS" ? "통과" : "막힘"})이 다릅니다`, hint: "아래 경로와 ACL 근거에서 이유를 확인해 보세요." });
        expect(banner!.text).not.toMatch(/✓|✕|틀렸습니다|맞았습니다/);
        for (const comparison of ["AGREE", "DISAGREE"] as const) {
          const state = statusLine({ ...verdict, result, comparison }, { ...claim, kind, expected }, false);
          expect(state).toContain(`${answer} NetProof 계산`);
          expect(state).not.toContain(")와");
        }
      }
    });
  });
  it.each(["NO_CLAIM", "NOT_COMPARABLE", undefined] as const)("has no banner for %s", (comparison) => {
    expect(comparisonBanner({ ...verdict, comparison } as Verdict, claim)).toBeNull();
  });
  it.each(["INVALID", "UNSUPPORTED"] as const)("does not compare %s", (result) => {
    expect(comparisonBanner({ ...verdict, result }, claim)).toBeNull();
  });
  it("has no banner without a claim or verdict", () => {
    expect(comparisonBanner(verdict, { ...claim, expected: null })).toBeNull();
    expect(comparisonBanner(null, claim)).toBeNull();
  });
  it("announces only the short state", () => {
    expect(statusLine(verdict, claim, true)).toBe("계산 중…");
    expect(statusLine(verdict, claim, false)).toBe("= 받은 답(통과)과 NetProof 계산이 같습니다 · NetProof 계산 막힘");
    expect(statusLine({ ...verdict, comparison: "DISAGREE" }, claim, false)).toBe("≠ 받은 답(통과)과 NetProof 계산(막힘)이 다릅니다 · NetProof 계산 막힘");
    expect(statusLine({ ...verdict, comparison: "NO_CLAIM" }, claim, false)).toBe("NetProof 계산 막힘");
    expect(statusLine({ ...verdict, result: "INVALID" }, claim, false)).toBe("NetProof 계산 입력 오류");
    expect(statusLine({ ...verdict, result: "UNSUPPORTED" }, claim, false)).toBe("NetProof 계산 판정 불가");
    expect(statusLine(null, claim, false)).toBe("");
  });
});

describe("rendered result contract", () => {
  const render = (patch: Partial<Verdict> = {}, stale = false) => renderToStaticMarkup(createElement(ResultPanel, { verdict: { ...verdict, ...patch }, claim, stale, error: null, loading: false }));
  it("places neutral comparison before versus with a short live region", () => {
    const html = render();
    expect(html).toContain("verdict deny compared");
    expect(html.indexOf('class="comparison-banner')).toBeLessThan(html.indexOf('class="versus"'));
    expect(html).toContain('role="status"');
    expect(html).not.toContain('aria-live="polite"');
    expect(html).not.toContain("아래 경로와 ACL 근거에서 이유를 확인해 보세요.");
  });
  it("renders the hint only under the disagreement banner, not in the live region", () => {
    const html = render({ comparison: "DISAGREE" });
    expect(html).toContain('<small>아래 경로와 ACL 근거에서 이유를 확인해 보세요.</small>');
    expect(html.match(/아래 경로와 ACL 근거에서 이유를 확인해 보세요\./g)).toHaveLength(1);
    expect(html.match(/<p[^>]*role="status"[^>]*>(.*?)<\/p>/)![1]).not.toContain("아래 경로");
  });
  it.each(["INVALID", "UNSUPPORTED"] as const)("puts %s problems before engine reason without versus", (result) => {
    const html = render({ result, problems: ["engine problem"], reason: "engine reason" });
    expect(html).not.toContain('class="versus"');
    expect(html).not.toContain('class="comparison-banner');
    expect(html).toContain("받은 답과는 비교하지 않았습니다.");
    expect(html.indexOf("engine problem")).toBeLessThan(html.indexOf("engine reason"));
  });
  it("marks stale results without rewriting engine content", () => {
    const html = render({}, true);
    expect(html).toContain("이전 결과");
    expect(html).toContain("compared outdated");
    expect(html).toContain("verbatim");
  });
  it.each([null, "shadowed", "undetermined"] as const)("opens audit only for findings: %s", (finding) => {
    const audit: AuditResult = { status: "OK", problems: [], engine_version: "test", totals: { shadowed: 0, redundant_earlier: 0, redundant_later: 0, never_matches: 0, undetermined: 0 }, acls: [{ name: "101", unchecked_from: null, lines: [{ line: 1, raw: "permit ip any any", kind: "rule", action: "permit", finding, by: [], implicit_deny: false, undetermined_reason: finding === "undetermined" ? "limit" : null, open: [], catch_all: true }] }] };
    const html = renderToStaticMarkup(createElement(AclAudit, { result: audit, error: null, stale: false, loading: false, onShow: () => {} }));
    expect(html.includes('<details open=""')).toBe(finding !== null);
    expect(html).toContain("앞 줄에 걸리지 않은 모든 통신을 허용합니다.");
    expect(html).toContain('aria-label="ACL 101 1번 줄 입력에서 보기"');
  });
  it("starts suggestions closed and labels targets without changing their values", () => {
    const html = renderToStaticMarkup(createElement(SuggestPanel, { target: null, result: null, error: null, loading: false, stale: false, onShow: () => {}, onTarget: () => {}, onCalculate: () => {} }));
    expect(html).toContain("<details>");
    expect(html).not.toContain("<details open");
    expect(html).toContain('value="PASS"');
    expect(html).toContain("통과");
    expect(html).toContain("막힘");
  });
});
