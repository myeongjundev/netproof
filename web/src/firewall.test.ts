import verdicts from "./testFixtures/topology-verdicts.json";
import { firewallNote, firewallRuleText, hopRuleText, withoutLimitation } from "./firewall";
import type { Hop, Verdict } from "./types";

const verdictOf = (id: string) => verdicts.find((item) => item.id === id)!.verdict as unknown as Verdict;
const hops = (verdict: Verdict) => [...(verdict.forward?.hops ?? []), ...(verdict.return?.hops ?? [])];

describe("firewallRuleText", () => {
  it.each([
    [{ action: "pass", proto: "tcp", src: "any", dst: "10.20.20.5", dst_port: "443" }, "통과 · TCP · any → 10.20.20.5:443"],
    [{ action: "block", proto: "ip", src: "10.10.10.0/24", dst: "any" }, "차단 · 모든 프로토콜 · 10.10.10.0/24 → any"],
    [{ action: "pass", proto: "udp", src: "any", src_port: 5353, dst: "any", dst_port: "any" }, "통과 · UDP · any:5353 → any"],
  ])("%j → %s", (rule, text) => expect(firewallRuleText(rule)).toBe(text));

  it.each([
    { action: "pass", proto: "tcp", src: "any", dst: "any", log: true },
    { action: "reject", proto: "tcp", src: "any", dst: "any" },
    { action: "pass", proto: "tcp", src: 1, dst: "any" },
    "pass any",
  ])("모르는 모양은 해석하지 않고 원문 JSON을 보인다: %j", (rule) => {
    expect(firewallRuleText(rule)).toBe(JSON.stringify(rule));
  });
});

describe("엔진 응답 표시", () => {
  it("방화벽 규칙 근거는 한 줄로, ACL 규칙은 원문 그대로 보인다", () => {
    const [allow] = hops(verdictOf("synthetic-stateful")).filter((hop) => hop.step === "firewall_in");
    expect(hopRuleText(allow)).toBe("통과 · 모든 프로토콜 · any → any");
    const acl = hops(verdictOf("synthetic-01-https-acl")).find((hop) => hop.rule)!;
    expect(hopRuleText(acl)).toBe(acl.rule);
    expect(hopRuleText({ ...allow, rule: "{깨진 JSON" } as Hop)).toBe("{깨진 JSON");
  });

  it("단계·이유 끝의 미대조 문장만 떼고, 그런 문장이 있었는지 알려 준다", () => {
    const verdict = verdictOf("synthetic-stateful");
    const [allow, state] = hops(verdict).filter((hop) => hop.step === "firewall_in" || hop.step === "state");
    expect(withoutLimitation(allow.detail)).toBe("g0/0 in: 1번 규칙에서 허용");
    expect(withoutLimitation(state.detail)).toBe("g0/1 in: 이 session의 정방향 상태로 허용됨");
    for (const hop of hops(verdict).filter((hop) => hop !== allow && hop !== state)) expect(withoutLimitation(hop.detail)).toBe(hop.detail);
    expect(firewallNote(verdict)).toBe(true);
    expect(withoutLimitation(verdictOf("synthetic-unsupported").reason)).toBe("R1 g0/0 in: 일치 규칙이 없고 기본·자동 규칙을 모릅니다(default_in 미확인)");
    expect(firewallNote(verdictOf("synthetic-unsupported"))).toBe(true);
    expect(firewallNote(verdictOf("synthetic-01-https-acl"))).toBe(false);
    expect(withoutLimitation("다른 문장. 제한된 상태 추적 모델이며 실제 pfSense 장비와 대조하지 않았습니다 덧붙임")).toContain("덧붙임");
  });
});
