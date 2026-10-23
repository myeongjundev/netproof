import { blankDraft, EMPTY_CLAIM, endpoints, fromCase, toNetwork } from "./draft";
import { firewallDraft } from "./testFixtures/firewallDraft";
import type { CaseItem } from "./types";

describe("toNetwork", () => {
  it("ACL 글상자를 줄 목록으로 바꾸고 빈 줄과 이름 없는 ACL은 뺀다", () => {
    const draft = { ...blankDraft(), acls: [{ name: "101", text: "deny ip any any\n\n  permit ip any any  " }, { name: " ", text: "x" }] };
    expect(toNetwork(draft).acls).toEqual({ "101": ["deny ip any any", "permit ip any any"] });
  });

  it("호스트에는 경로를, 라우터에는 게이트웨이를 보내지 않는다", () => {
    const network = toNetwork(blankDraft());
    expect(network.devices.find((d) => d.id === "PC1")?.routes).toBeUndefined();
    expect(network.devices.find((d) => d.id === "R1")?.gateway).toBeUndefined();
  });

  it("고르지 않은 ACL은 null로 보낸다", () => {
    const iface = toNetwork(blankDraft()).devices[1].interfaces[0];
    expect(iface.acl_in).toBeNull();
  });
});

describe("toNetwork 방화벽", () => {
  it("상태 추적 장비에는 ACL 키 없이 규칙과 기본 동작만 보내고 빈 포트는 뺀다", () => {
    const fw = toNetwork(firewallDraft()).devices[1];
    expect(fw.stateful).toBe(true);
    expect(fw.interfaces[0]).toEqual({ name: "g0/0", ip: "10.10.10.1/24", default_in: "block",
      rules_in: [{ action: "pass", proto: "tcp", src: "any", dst: "10.20.20.5", dst_port: "443" }] });
  });

  it("기본 동작을 적지 않은 인터페이스는 비운 채 보내 엔진이 모름으로 계산한다", () => {
    expect(toNetwork(firewallDraft()).devices[1].interfaces[1]).toEqual({ name: "g0/1", ip: "10.20.20.1/24" });
  });

  it("모르는 규칙 키와 숫자 포트는 바꾸지 않는다", () => {
    const draft = firewallDraft();
    draft.devices[1].interfaces[0].rules_in = [{ action: "block", proto: "udp", src: "any", dst: "any", dst_port: 53, log: true } as never];
    expect(toNetwork(draft).devices[1].interfaces[0].rules_in).toEqual([{ action: "block", proto: "udp", src: "any", dst: "any", dst_port: 53, log: true }]);
  });

  it("라우터로 되돌린 장비는 남은 규칙을 보내지 않고 ACL 연결을 다시 보낸다", () => {
    const iface = toNetwork(firewallDraft(false)).devices[1].interfaces[0];
    expect(iface).toEqual({ name: "g0/0", ip: "10.10.10.1/24", acl_in: "101", acl_out: null });
  });

  it("사례에서 불러온 방화벽 입력이 그대로 다시 나간다", () => {
    const network = JSON.parse(JSON.stringify(toNetwork(firewallDraft())));
    const opened = fromCase({ id: "fw", source: "test", network, flow: blankDraft().flow });
    expect(JSON.parse(JSON.stringify(toNetwork(opened)))).toEqual(network);
  });
});

describe("fromCase", () => {
  it.each(["ai", "self", null, undefined] as const)("사례와 JSON의 종류 %s를 추론 없이 보존하고 복제만 비운다", kind => {
    for (const expected of ["PASS", "DENY"] as const) {
      const original: CaseItem = { id: "kind", source: "test", network: toNetwork(blankDraft()), flow: blankDraft().flow,
        claim: { expected, source: "ChatGPT / 내 예상", text: "종류 추론 안 함", ...(kind !== undefined ? { kind } : {}) } };
      const before = structuredClone(original);
      for (const source of [original, JSON.parse(JSON.stringify(original))]) {
        const opened = fromCase(source);
        expect(opened.claim).toEqual(original.claim);
        expect(Object.hasOwn(opened.claim, "kind")).toBe(kind !== undefined);
        expect(opened.flow).toEqual(original.flow); expect(toNetwork(opened)).toEqual(original.network);
        expect({ ...opened, claim: { ...EMPTY_CLAIM } }.claim).toEqual({ expected: null, source: "", text: "" });
      }
      expect(original).toEqual(before);
    }
  });
  it("복제 초안에는 원본의 정답·판정·작성자·실제 결과·확인 상태를 가져오지 않는다", () => {
    const original = {
      id: "42", source: "test", title: "원본", owner_id: 7, author: "작성자",
      actual: { result: "PASS", source: "ping", note: "확인 기록" },
      confirmed: true, confirmed_by: "검토자", confirmed_at: "2026-10-02",
      verdict: { result: "PASS" }, comparison: "AGREE", engine_version: "old",
      created_at: "2026-10-01", expect: { result: "PASS" }, hand_first: "사람 기록",
      network: toNetwork(blankDraft()), flow: blankDraft().flow,
      claim: { expected: "PASS" as const, source: "받은 답", text: "메모" },
    };
    const before = structuredClone(original);
    const opened = fromCase(original);
    expect(opened.claim).toEqual(original.claim);
    const cloned = { ...fromCase(original), claim: { ...EMPTY_CLAIM } };
    expect(Object.keys(cloned).sort()).toEqual(["acls", "claim", "devices", "flow"]);
    expect(cloned.claim).toEqual({ expected: null, source: "", text: "" });
    expect(toNetwork(cloned)).toEqual(original.network);
    expect(cloned.flow).toEqual(original.flow);
    cloned.devices[0].interfaces[0].ip = "192.0.2.1/24";
    cloned.flow.dst = "192.0.2.2";
    expect(original).toEqual(before);
  });

  it("사례를 불러와도 원본을 바꾸지 않는다", () => {
    const item: CaseItem = {
      id: "t",
      source: "test",
      network: { devices: blankDraft().devices, acls: { "101": ["permit ip any any"] } },
      flow: { src: "10.10.10.10", dst: "10.20.20.5", proto: "icmp" },
    };
    const draft = fromCase(item);
    draft.devices[0].id = "바뀜";
    expect(item.network.devices[0].id).toBe("PC1");
    expect(draft.acls).toEqual([{ name: "101", text: "permit ip any any" }]);
    expect(draft.flow.mode).toBe("session");
  });
});

it("흐름 자동 완성에 모든 인터페이스 주소가 장비 이름과 함께 나온다", () => {
  expect(endpoints(blankDraft())).toContainEqual({ ip: "10.20.20.1", label: "R1 g0/1" });
});
