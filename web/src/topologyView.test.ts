import type { Device, Flow, Network, Trace, Verdict } from "./types";
import data from "./testFixtures/topology-verdicts.json";
import { memberships, subnetOf, topologyView, traceMovements } from "./topologyView";

const fixtures = data as unknown as { id: string; network: Network; flow: Flow; verdict: Verdict }[];
const fixture = fixtures[0];
const host = (id: string, ip = "10.10.10.2/24"): Device => ({ id, kind: "host", interfaces: [{ name: "eth0", ip }] });

it.each([
  ["10.10.10.10/24", "10.10.10.0/24"], ["10.10.10.1/24", "10.10.10.0/24"],
  ["255.255.255.255/0", "0.0.0.0/0"], ["255.255.255.255/32", "255.255.255.255/32"],
  ["192.168.1.255/25", "192.168.1.128/25"], [" 10.0.0.1/08 ", "10.0.0.0/8"],
  ["", null], [" ", null], ["01.1.1.1/24", null], ["256.1.1.1/24", null], ["1.1.1.1/33", null],
  ["1.1.1.1", null], ["1.1.1.1/２４", null], ["9".repeat(100000), null],
])("%s is grouped for display as %s", (value, expected) => expect(subnetOf(value)).toBe(expected));

it("같은 구간을 묶고 겹치지만 prefix가 다른 구간과 떨어진 장비는 남긴다", () => {
  const network: Network = { devices: [host("A"), host("B", "10.10.10.1/24"), host("C", "10.10.10.3/25"), host("D", "invalid")], acls: {} };
  const view = topologyView(network, { ...fixture.flow, src: "10.10.10.3" }, null);
  expect(view.nodes.filter(node => !node.device).map(node => node.label)).toEqual(["10.10.10.0/24", "10.10.10.0/25"]);
  expect(view.layers[0]).toEqual(["device:C"]);
  expect(view.nodes.some(node => node.label === "D")).toBe(true);
  expect(view.links).toHaveLength(3);
  expect(topologyView(network, { ...fixture.flow, src: "10.10.10.3" }, null)).toEqual(view);
});
it("출발 주소 소유 장비가 유일하지 않거나 없으면 입력 순서를 따른다", () => {
  const network: Network = { devices: [host("A"), host("B")], acls: {} };
  for (const src of ["10.10.10.2", "8.8.8.8"]) expect(topologyView(network, { ...fixture.flow, src }, null).layers[0]).toEqual(["device:A"]);
});
it.each(["", "A"])("빈/중복 id %s는 그림 대신 안전한 원문 fallback", id => {
  expect(topologyView({ devices: [host("A"), host(id)], acls: {} }, fixture.flow, null).mode).toBe("invalid");
});
it.each([{}, { devices: null }, { devices: [null] }, { devices: [{ id: 1, interfaces: [] }] },
  { devices: [{ id: "A", kind: "host", interfaces: [{ name: "eth0", ip: 123 }] }] }])("형식이 없는 INVALID 입력 %j도 표시 함수는 예외 없이 원문으로 전환", raw => {
  expect(topologyView(raw as unknown as Network, fixture.flow, null).mode).toBe("invalid");
  expect(memberships(raw as unknown as Network)).toEqual([]);
});
it.each([12, 13])("장비 %i개 경계: 경로 장비만 고르고 나머지는 입력에 유지", count => {
  const network = { devices: Array.from({ length: count }, (_, i) => host(`D${i}`)), acls: {} };
  const trace = { ...fixture.verdict.forward!, hops: [{ ...fixture.verdict.forward!.hops[0], device: "D0" }], target: { device: "D1", interface: "eth0", ip: "10.10.10.2" } };
  const copy = structuredClone(network);
  const view = topologyView(network, fixture.flow, trace);
  expect(view.mode).toBe(count === 12 ? "full" : "path");
  expect(view.nodes.filter(node => node.device)).toHaveLength(count === 12 ? 12 : 2);
  expect(network).toEqual(copy);
  if (count === 13) expect(topologyView(network, fixture.flow, null).mode).toBe("list");
});
it.each([24, 25])("주소 구간 %i개 경계와 경로가 여전히 클 때 목록 전환", count => {
  const device = { ...host("A"), interfaces: Array.from({ length: count }, (_, i) => ({ name: `i${i}`, ip: `10.0.${i}.1/24` })) };
  const network = { devices: [device], acls: {} };
  const trace: Trace = { ...fixture.verdict.forward!, target: undefined, hops: [{ ...fixture.verdict.forward!.hops[0], device: "A" }] };
  expect(topologyView(network, fixture.flow, trace).mode).toBe(count === 24 ? "full" : "list");
});
it("긴 라벨과 잘못된 주소를 원래 데이터에 남기며 gateway/routes로 선을 발명하지 않는다", () => {
  const network: Network = { devices: [{ ...host("장비".repeat(200)), gateway: "1.2.3.4", routes: [{ prefix: "0.0.0.0/0", next_hop: "4.3.2.1" }] }, host("bad", "9".repeat(100000))], acls: {} };
  expect(topologyView(network, fixture.flow, null).nodes[0].label).toBe(network.devices[0].id);
  expect(memberships(network)).toHaveLength(1);
});
it.each(fixtures)("$id: 실제 단계에 기록된 이동만 강조, verdict 불변", ({ network, flow, verdict }) => {
  const copy = structuredClone(verdict);
  topologyView(network, flow, verdict.forward);
  for (const trace of [verdict.forward, verdict.return]) {
    const movements = traceMovements(network, trace, (trace?.hops.length ?? 0) - 1);
    expect(movements.every(move => move.from !== move.to)).toBe(true);
    expect(movements.every(move => move.memberships.length === 0 || move.memberships.length === 2)).toBe(true);
  }
  expect(verdict).toEqual(copy);
});
it("같은 장비의 연속 단계는 이동이 아니고, 미기록 인터페이스·없는 장비·구간 불일치는 연결하지 않는다", () => {
  const hops = fixture.verdict.forward!.hops;
  expect(traceMovements(fixture.network, fixture.verdict.forward, 0)).toEqual([]);
  expect(traceMovements(fixture.network, fixture.verdict.forward, 1)[0].memberships).toHaveLength(2);
  for (const modified of [{ ...hops[1], in_if: null }, { ...hops[1], device: "missing" }, { ...hops[1], in_if: "g0/1" }]) {
    expect(traceMovements(fixture.network, { ...fixture.verdict.forward!, hops: [hops[0], modified] }, 1)[0].memberships).toEqual([]);
  }
  const trace = { ...fixture.verdict.forward!, hops: [hops[0], { ...hops[0], step: "route" as const }, hops[1], hops[0]] };
  expect(traceMovements(fixture.network, trace, 3)).toHaveLength(2);
});
