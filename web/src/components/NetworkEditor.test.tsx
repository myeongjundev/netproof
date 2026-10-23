import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FirewallRules, NetworkEditor } from "./NetworkEditor";
import { blankDraft } from "../draft";
import { firewallDraft } from "../testFixtures/firewallDraft";
import type { Device, FirewallRule, Iface } from "../types";

type El = ReactElement<Record<string, any>>;
function find(node: unknown, match: (el: El) => boolean): El | undefined {
  if (Array.isArray(node)) return node.map((child) => find(child, match)).find(Boolean);
  if (!isValidElement<Record<string, any>>(node)) return;
  return match(node) ? node : find(node.props.children, match);
}
const byLabel = (label: string) => (el: El) => el.props["aria-label"] === label;
const editor = (devices: Device[], onDevices = vi.fn(), onBeforeRemove = vi.fn()) =>
  NetworkEditor({ devices, acls: [], onDevices, onAcls: () => {}, onBeforeRemove });
const kindSelect = (tree: unknown, index = 1) => find(tree, (el) => el.type === "select" && el.props.value !== undefined &&
  find(el.props.children, (option) => option.props.value === "firewall") !== undefined && index-- === 0)!;

describe("구성 편집기의 방화벽 종류", () => {
  it("종류에 방화벽이 있고 상태 추적 장비는 그 값으로 보인다", () => {
    const html = renderToStaticMarkup(createElement(NetworkEditor, { devices: firewallDraft().devices, acls: [], onDevices: () => {}, onAcls: () => {} }));
    expect(html).toContain('<option value="firewall">방화벽</option>');
    expect(kindSelect(editor(firewallDraft().devices)).props.value).toBe("firewall");
    expect(html).not.toContain("R1 g0/0 들어올 때 ACL");
    expect(html).toContain("PC1 eth0 주소");
  });

  it("라우터를 방화벽으로 바꾸면 기본 동작을 보이는 차단으로 채우고 ACL 연결은 입력에 남긴다", () => {
    const onDevices = vi.fn();
    const devices = blankDraft().devices;
    devices[1].interfaces[0] = { ...devices[1].interfaces[0], acl_in: "101", default_in: "pass" };
    kindSelect(editor(devices, onDevices)).props.onChange({ target: { value: "firewall" } });
    const fw: Device = onDevices.mock.calls[0][0][1];
    expect(fw).toMatchObject({ kind: "router", stateful: true });
    expect(fw.interfaces).toEqual([
      { name: "g0/0", ip: "10.10.10.1/24", acl_in: "101", default_in: "pass", rules_in: [] },
      { name: "g0/1", ip: "10.20.20.1/24", default_in: "block", rules_in: [] },
    ]);
  });

  it("방화벽을 라우터로 되돌려도 규칙은 입력에 남아 다시 바꾸면 보인다", () => {
    const onDevices = vi.fn();
    kindSelect(editor(firewallDraft().devices, onDevices)).props.onChange({ target: { value: "router" } });
    const router: Device = onDevices.mock.calls[0][0][1];
    expect(router.stateful).toBeUndefined();
    expect(router.interfaces[0].rules_in).toHaveLength(1);
  });

  it("+ 방화벽은 기본 동작이 차단인 빈 방화벽을 더한다", () => {
    const onDevices = vi.fn();
    find(editor(blankDraft().devices, onDevices), (el) => el.type === "button" && el.props.children === "+ 방화벽")!.props.onClick();
    expect(onDevices.mock.calls[0][0].at(-1)).toEqual({ id: "FW1", kind: "router", stateful: true, routes: [],
      interfaces: [{ name: "em0", ip: "", rules_in: [], default_in: "block" }] });
  });
});

describe("들어오는 규칙 목록", () => {
  const rules: FirewallRule[] = [
    { action: "pass", proto: "tcp", src: "any", dst: "10.20.20.5", dst_port: "443" },
    { action: "block", proto: "ip", src: "10.10.10.0/24", dst: "any" },
  ];
  const view = (iface: Iface, onChange = vi.fn(), onBeforeRemove = vi.fn()) => FirewallRules({ device: "FW1", iface, onChange, onBeforeRemove });

  it("칸마다 장비·인터페이스·순서를 담은 이름이 있고, TCP·UDP가 아니면 포트를 막는다", () => {
    const html = renderToStaticMarkup(createElement(FirewallRules, { device: "FW1", iface: { name: "em0", ip: "", rules_in: rules, default_in: "block" }, onChange: () => {} }));
    for (const field of ["동작", "프로토콜", "출발지", "출발 포트", "목적지", "목적 포트"]) expect(html).toContain(`aria-label="FW1 em0 1번 규칙 ${field}"`);
    expect(html.match(/disabled=""/g)?.length).toBe(2 + 2); // 2번 규칙 포트 두 칸 + 1번 위로 + 2번 아래로
    expect(html).toContain("em0 들어오는 규칙");
  });

  it("기본 동작이 없으면 모름(판정 불가)으로 보인다", () => {
    expect(find(view({ name: "em0", ip: "" }), byLabel("FW1 em0 어느 규칙에도 안 맞으면"))!.props.value).toBe("unknown");
  });

  it("프로토콜을 ICMP로 바꾸면 포트를 지운다", () => {
    const onChange = vi.fn();
    find(view({ name: "em0", ip: "", rules_in: rules }, onChange), byLabel("FW1 em0 1번 규칙 프로토콜"))!.props.onChange({ target: { value: "icmp" } });
    expect(onChange.mock.calls[0][0].rules_in[0]).toEqual({ action: "pass", proto: "icmp", src: "any", dst: "10.20.20.5", src_port: undefined, dst_port: undefined });
  });

  it("위·아래로 순서를 바꾸고, 삭제는 되돌리기 안내를 먼저 남긴다", () => {
    const onChange = vi.fn(), onBeforeRemove = vi.fn();
    const tree = view({ name: "em0", ip: "", rules_in: rules }, onChange, onBeforeRemove);
    find(tree, byLabel("FW1 em0 2번 규칙 위로"))!.props.onClick();
    expect(onChange.mock.calls[0][0].rules_in).toEqual([rules[1], rules[0]]);
    find(tree, byLabel("FW1 em0 1번 규칙 삭제"))!.props.onClick();
    expect(onBeforeRemove).toHaveBeenCalledWith("FW1 em0 1번 규칙을 삭제했습니다");
    expect(onChange.mock.calls[1][0].rules_in).toEqual([rules[1]]);
  });

  it("+ 규칙은 pfSense 새 규칙과 같은 TCP any → any 통과를 끝에 더한다", () => {
    const onChange = vi.fn();
    find(view({ name: "em0", ip: "", rules_in: rules }, onChange), (el) => el.type === "button" && el.props.children === "+ 규칙")!.props.onClick();
    expect(onChange.mock.calls[0][0].rules_in.at(-1)).toEqual({ action: "pass", proto: "tcp", src: "any", dst: "any" });
  });
});
