import type { CaseFilters, CaseSummary, Flow, Network } from "./types";
import { ACTUAL_TEXT, ANSWER_TEXT, COMPARISON_TEXT, RESULT_TEXT, claimComparisonText, claimKindText } from "./displayText";

import { DEFAULT_TEXT, firewallRuleText } from "./firewall";

export { claimKindText } from "./displayText";

export function comparisonCaption(item: Pick<CaseSummary, "comparison" | "claim_kind">): string {
  return item.comparison === "NO_CLAIM" ? COMPARISON_TEXT.NO_CLAIM : `${claimComparisonText(item.claim_kind, "stored")}과 계산`;
}

export function flowText(flow: Flow): string {
  const protocol = flow.proto === "icmp"
    ? `ICMP${flow.icmp ? ` ${flow.icmp}` : ""}`
    : `${flow.proto.toUpperCase()}${flow.dst_port !== undefined ? ` ${flow.dst_port}` : ""}`;
  return `${flow.src} → ${flow.dst} · ${protocol} · ${flow.mode === "one-way" ? "한 방향" : "왕복"}`;
}

const present = (value?: string | null): string | null => value?.trim() || null;

export function networkView(network: Pick<Network, "devices"> & Partial<Pick<Network, "acls">>) {
  const devices = network.devices.map((device) => ({
    id: device.id,
    kind: device.stateful ? "방화벽(상태 추적)" : device.kind === "host" ? "호스트" : "라우터",
    gateway: present(device.gateway),
    interfaces: device.interfaces.map((iface) => ({
      name: iface.name, ip: iface.ip, aclIn: present(iface.acl_in), aclOut: present(iface.acl_out),
      // 저장된 입력을 그대로 보인다. 형식이 틀린 규칙 목록도 숨기지 않고 원문으로 보인다.
      ...(device.stateful && {
        rules: Array.isArray(iface.rules_in) ? iface.rules_in.map(firewallRuleText) : iface.rules_in == null ? [] : [JSON.stringify(iface.rules_in)],
        defaultIn: DEFAULT_TEXT[iface.default_in ?? "unknown"] ?? String(iface.default_in),
      }),
    })),
    routes: (device.routes ?? []).map((route) => ({
      prefix: route.prefix,
      via: route.next_hop && route.out_if ? `${route.next_hop} (${route.out_if})` : route.next_hop || route.out_if || "—",
    })),
  }));
  const acls = Object.entries(network.acls ?? {}).map(([name, rules]) => ({
    name,
    lines: rules.map((raw, index) => ({ line: index + 1, raw })),
    attachedTo: devices.flatMap((device) => device.interfaces.flatMap((iface) => [
      ...(iface.aclIn === name ? [`${device.id} ${iface.name} 들어올 때`] : []),
      ...(iface.aclOut === name ? [`${device.id} ${iface.name} 나갈 때`] : []),
    ])),
  }));
  return { devices, acls };
}

export function appliedFilterText(filters: CaseFilters): string[] {
  const source = { nmap: "Nmap", ping: "ping", device: "장비", other: "기타", none: "출처 없음" };
  const actual = { ...ACTUAL_TEXT, none: "미정" };
  const kind = { ai: claimKindText("ai"), self: claimKindText("self"), none: claimKindText(null) };
  return [
    ...(filters.mine ? ["내 사례만"] : []),
    ...(filters.result ? [`판정 ${RESULT_TEXT[filters.result]}`] : []),
    ...(filters.comparison ? [`받은 답과 판정 ${COMPARISON_TEXT[filters.comparison]}`] : []),
    ...(filters.confirmed ? [`검토 확인 ${filters.confirmed === "1" ? "확인됨" : "미확인"}`] : []),
    ...(filters.source ? [`실제 결과 출처 ${source[filters.source]}`] : []),
    ...(filters.actual ? [`실제 결과 ${actual[filters.actual]}`] : []),
    ...(filters.actual_mismatch ? ["계산과 실제 결과 다름"] : []),
    ...(filters.claim_kind ? [`받은 답 종류 ${kind[filters.claim_kind]}`] : []),
    ...(filters.claim_expected ? [`받은 답 ${ANSWER_TEXT[filters.claim_expected]}`] : []),
  ];
}
