import type { CaseFilters, CaseSummary, Claim, Flow, Network } from "./types";

/** 저장된 사실의 표시만 담당한다. 판정·규칙 해석은 하지 않는다. */
export function claimKindText(kind: Claim["kind"]): string {
  return kind === "ai" ? "AI 답" : kind === "self" ? "사람 예상" : "받은 답";
}

export function comparisonCaption(item: Pick<CaseSummary, "comparison" | "claim_kind">): string {
  return item.comparison === "NO_CLAIM" ? "받은 답 없음" : `${claimKindText(item.claim_kind)}과 계산`;
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
    kind: device.kind === "host" ? "호스트" : "라우터",
    gateway: present(device.gateway),
    interfaces: device.interfaces.map((iface) => ({
      name: iface.name, ip: iface.ip, aclIn: present(iface.acl_in), aclOut: present(iface.acl_out),
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
  const result = { PASS: "통과", DENY: "차단", UNSUPPORTED: "지원 범위 밖", INVALID: "잘못된 입력" };
  const comparison = { AGREE: "일치", DISAGREE: "불일치", NOT_COMPARABLE: "비교 불가", NO_CLAIM: "받은 답 없음" };
  const source = { nmap: "Nmap", ping: "ping", device: "장비", other: "기타", none: "출처 없음" };
  const actual = { PASS: "통과", DENY: "차단", none: "미정" };
  const kind = { ai: "AI 답", self: "사람 예상", none: "종류 없음" };
  return [
    ...(filters.mine ? ["내 사례만"] : []),
    ...(filters.result ? [`판정 ${result[filters.result]}`] : []),
    ...(filters.comparison ? [`받은 답과 판정 ${comparison[filters.comparison]}`] : []),
    ...(filters.confirmed ? [`검토 확인 ${filters.confirmed === "1" ? "확인됨" : "미확인"}`] : []),
    ...(filters.source ? [`실제 결과 출처 ${source[filters.source]}`] : []),
    ...(filters.actual ? [`실제 결과 ${actual[filters.actual]}`] : []),
    ...(filters.actual_mismatch ? ["계산과 실제 결과 다름"] : []),
    ...(filters.claim_kind ? [`받은 답 종류 ${kind[filters.claim_kind]}`] : []),
    ...(filters.claim_expected ? [`받은 답 ${result[filters.claim_expected]}`] : []),
  ];
}
