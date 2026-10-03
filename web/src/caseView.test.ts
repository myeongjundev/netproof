import { describe, expect, it } from "vitest";
import { appliedFilterText, claimKindText, comparisonCaption, flowText, networkView } from "./caseView";
import { emptyCaseFilters } from "./caseSearch";
import { blankDraft, toNetwork } from "./draft";
import type { Claim, Comparison, Flow, Network } from "./types";

describe("받은 답 표시", () => {
  it.each([["ai", "AI 답"], ["self", "사람 예상"], [null, "받은 답"], [undefined, "받은 답"]] as const)("종류 %s", (kind, text) => {
    expect(claimKindText(kind)).toBe(text);
  });
  it.each([
    ["AGREE", "ai", "AI 답과 계산"], ["DISAGREE", "self", "사람 예상과 계산"],
    ["NOT_COMPARABLE", null, "받은 답과 계산"], ["AGREE", null, "받은 답과 계산"],
    ["DISAGREE", "ai", "AI 답과 계산"],
  ] as [Comparison, Claim["kind"], string][])("비교 %s/%s", (comparison, kind, text) => {
    expect(comparisonCaption({ comparison, claim_kind: kind ?? null })).toBe(text);
  });
  it.each(["ai", "self", null] as const)("NO_CLAIM은 종류 %s와 무관", (claim_kind) => {
    expect(comparisonCaption({ comparison: "NO_CLAIM", claim_kind })).toBe("받은 답 없음");
  });
});

describe("통신 표시", () => {
  const base: Flow = { src: "10.0.0.1", dst: "10.0.1.1", proto: "tcp", dst_port: 443 };
  it.each([
    [base, "TCP 443 · 왕복"], [{ ...base, proto: "udp", dst_port: 53 }, "UDP 53 · 왕복"],
    [{ ...base, proto: "icmp", icmp: "echo", dst_port: undefined }, "ICMP echo · 왕복"],
    [{ ...base, proto: "icmp", dst_port: undefined }, "ICMP · 왕복"],
    [{ ...base, mode: "one-way" }, "TCP 443 · 한 방향"],
    [{ ...base, dst_port: undefined, mode: "session" }, "TCP · 왕복"],
  ] as [Flow, string][])("프로토콜/방향 %#", (flow, suffix) => {
    expect(flowText(flow)).toBe(`10.0.0.1 → 10.0.1.1 · ${suffix}`);
  });
});

describe("저장된 네트워크 표시", () => {
  it("처음 구성과 빈 ACL", () => {
    const view = networkView(toNetwork(blankDraft()));
    expect(view.devices.map(({ id, kind }) => [id, kind])).toEqual([["PC1", "호스트"], ["R1", "라우터"], ["SRV", "호스트"]]);
    expect(view.devices[0].gateway).toBe("10.10.10.1");
    expect(view.devices[1].routes).toEqual([]);
    expect(view.acls).toEqual([]);
  });
  it("누락된 routes/acls와 빈 값은 표시 값만 비운다", () => {
    expect(networkView({ devices: [{ id: "H", kind: "host", gateway: "  ", interfaces: [{ name: "eth0", ip: "x", acl_in: "", acl_out: null }] }] })).toEqual({
      devices: [{ id: "H", kind: "호스트", gateway: null, interfaces: [{ name: "eth0", ip: "x", aclIn: null, aclOut: null }], routes: [] }], acls: [],
    });
  });
  it("경로의 두 값·각 한 값·누락을 순서대로 표시", () => {
    const routes = [{ prefix: "a", next_hop: "hop", out_if: "if" }, { prefix: "b", next_hop: "hop" }, { prefix: "c", out_if: "if" }, { prefix: "d" }];
    expect(networkView({ devices: [{ id: "R", kind: "router", interfaces: [], routes }] }).devices[0].routes).toEqual([
      { prefix: "a", via: "hop (if)" }, { prefix: "b", via: "hop" }, { prefix: "c", via: "if" }, { prefix: "d", via: "—" },
    ]);
  });
  it("공유 ACL의 in/out 부착과 빈 줄 번호·미부착 ACL을 보존", () => {
    const view = networkView({ devices: [{ id: "R1", kind: "router", interfaces: [
      { name: "g0/0", ip: "a", acl_in: "shared", acl_out: "shared" }, { name: "g0/1", ip: "b", acl_out: "shared" },
    ] }], acls: { shared: ["permit ip any any", "", "  remark 원문  "], unused: [] } });
    expect(view.acls).toEqual([
      { name: "shared", attachedTo: ["R1 g0/0 들어올 때", "R1 g0/0 나갈 때", "R1 g0/1 나갈 때"], lines: [
        { line: 1, raw: "permit ip any any" }, { line: 2, raw: "" }, { line: 3, raw: "  remark 원문  " },
      ] }, { name: "unused", attachedTo: [], lines: [] },
    ]);
  });
  it("없는 ACL 참조로 가짜 ACL을 만들지 않는다", () => {
    const view = networkView({ devices: [{ id: "R", kind: "router", interfaces: [{ name: "g0", ip: "x", acl_in: "missing" }] }], acls: {} });
    expect(view.devices[0].interfaces[0].aclIn).toBe("missing");
    expect(view.acls).toEqual([]);
  });
  it("깊이 동결한 입력을 변경하거나 출력과 참조를 공유하지 않는다", () => {
    const input: Network = { devices: [{ id: "R", kind: "router", interfaces: [{ name: "g0", ip: "x", acl_in: "A" }], routes: [{ prefix: "p", out_if: "g0" }] }], acls: { A: [""] } };
    function freeze(value: object) {
      Object.values(value).forEach((child) => { if (child && typeof child === "object") freeze(child); });
      Object.freeze(value);
    }
    const before = structuredClone(input);
    freeze(input);
    const view = networkView(input);
    view.devices[0].interfaces[0].name = "changed";
    view.acls[0].lines[0].raw = "changed";
    expect(input).toEqual(before);
  });
});

describe("적용 조건의 사실 표시", () => {
  it("접힌 필터 개수는 일곱 선택 조건만 세고 검색어·내 사례만은 바깥에 표시한다", () => {
    const filters = { ...emptyCaseFilters, q: "query", mine: true, confirmed: "0" as const, source: "none" as const, actual: "none" as const };
    expect(appliedFilterText({ ...filters, mine: false })).toHaveLength(3);
    expect(appliedFilterText(filters)).toEqual(["내 사례만", "검토 확인 미확인", "실제 결과 출처 출처 없음", "실제 결과 미정"]);
    expect(filters.mine).toBe(true);
    expect(appliedFilterText({ ...emptyCaseFilters, q: "query", mine: false })).toHaveLength(0);
    expect(appliedFilterText({ q: "", mine: false, result: "PASS", comparison: "AGREE", confirmed: "1", source: "ping", actual: "PASS", claim_kind: "self", claim_expected: "PASS" })).toHaveLength(7);
  });
  it("빈 조건과 검색어만 있으면 별도 표시", () => {
    expect(appliedFilterText(emptyCaseFilters)).toEqual([]);
    expect(appliedFilterText({ ...emptyCaseFilters, q: "query" })).toEqual([]);
  });
  it("모든 조건의 순서와 선택지 문구", () => {
    expect(appliedFilterText({ q: "ignored", mine: true, result: "DENY", comparison: "DISAGREE", confirmed: "1", source: "none", actual: "PASS", claim_kind: "ai", claim_expected: "DENY" })).toEqual([
      "내 사례만", "판정 차단", "받은 답과 판정 불일치", "검토 확인 확인됨", "실제 결과 출처 출처 없음", "실제 결과 통과", "받은 답 종류 AI 답", "받은 답 차단",
    ]);
  });
  it("미확인·미정·종류 없음도 조건이며 점수를 만들지 않는다", () => {
    expect(appliedFilterText({ ...emptyCaseFilters, confirmed: "0", actual: "none", claim_kind: "none" })).toEqual(["검토 확인 미확인", "실제 결과 미정", "받은 답 종류 종류 없음"]);
  });
});
