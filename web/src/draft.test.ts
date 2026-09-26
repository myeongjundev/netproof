import { blankDraft, endpoints, fromCase, toNetwork } from "./draft";
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

describe("fromCase", () => {
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
