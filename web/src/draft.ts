import type { CaseItem, Draft, FirewallRule, Network } from "./types";

export const EMPTY_CLAIM = { expected: null, source: "", text: "" } as const;

export function blankDraft(): Draft {
  return {
    devices: [
      { id: "PC1", kind: "host", interfaces: [{ name: "eth0", ip: "10.10.10.10/24" }], gateway: "10.10.10.1" },
      {
        id: "R1",
        kind: "router",
        interfaces: [
          { name: "g0/0", ip: "10.10.10.1/24" },
          { name: "g0/1", ip: "10.20.20.1/24" },
        ],
        routes: [],
      },
      { id: "SRV", kind: "host", interfaces: [{ name: "eth0", ip: "10.20.20.5/24" }], gateway: "10.20.20.1" },
    ],
    acls: [],
    flow: { src: "10.10.10.10", dst: "10.20.20.5", proto: "tcp", dst_port: 443, mode: "session" },
    claim: { ...EMPTY_CLAIM },
  };
}

export function toNetwork(draft: Draft): Network {
  const acls: Record<string, string[]> = {};
  for (const acl of draft.acls) {
    const name = acl.name.trim();
    if (!name) continue;
    acls[name] = acl.text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  const devices = draft.devices.map((device) => ({
    ...device,
    gateway: device.kind === "host" && device.gateway?.trim() ? device.gateway.trim() : undefined,
    routes: device.kind === "router" ? (device.routes ?? []).filter((r) => r.prefix.trim()) : undefined,
    // 상태 추적 장비는 acl 키가 있으면 엔진이 INVALID로 거절한다. 라우터일 때 고른 ACL은 입력에만 남긴다.
    interfaces: device.interfaces.map((iface) => device.stateful ? {
      name: iface.name,
      ip: iface.ip.trim(),
      // 저장된 사례는 형식이 틀릴 수 있다. 목록이 아니면 그대로 보내 엔진이 INVALID로 알린다.
      ...(iface.rules_in && { rules_in: Array.isArray(iface.rules_in) ? iface.rules_in.map(sendRule) : iface.rules_in }),
      ...(iface.default_in && { default_in: iface.default_in }),
    } : {
      name: iface.name,
      ip: iface.ip.trim(),
      // 이름이 비어 사라진 ACL을 가리키면 엔진이 INVALID로 알려 준다. 빈 선택만 걸러 낸다.
      acl_in: iface.acl_in ? iface.acl_in : null,
      acl_out: iface.acl_out ? iface.acl_out : null,
    }),
  }));
  return { devices, acls };
}

/** 빈 포트 칸은 "제한 없음"이라 뺀다. 모르는 키는 지우지 않아 엔진이 판정 불가로 알린다. */
function sendRule(rule: FirewallRule): FirewallRule {
  if (typeof rule !== "object" || rule === null) return rule;
  const sent = { ...rule };
  for (const key of ["src", "dst"] as const) if (typeof sent[key] === "string") sent[key] = sent[key].trim();
  for (const key of ["src_port", "dst_port"] as const) {
    const port = sent[key];
    if (typeof port === "string" && port.trim()) sent[key] = port.trim();
    else if (typeof port !== "number") delete sent[key];
  }
  return sent;
}

export function fromCase(item: CaseItem): Draft {
  return {
    devices: structuredClone(item.network.devices).map((device) => ({ ...device, routes: device.routes ?? [] })),
    acls: Object.entries(item.network.acls ?? {}).map(([name, lines]) => ({ name, text: lines.join("\n") })),
    flow: { mode: "session", ...item.flow },
    claim: {
      expected: item.claim?.expected ?? null,
      source: item.claim?.source ?? "",
      text: item.claim?.text ?? "",
      ...(item.claim && "kind" in item.claim ? { kind: item.claim.kind } : {}),
    },
  };
}

/** 흐름 입력의 자동 완성 목록: 모든 인터페이스 주소. */
export function endpoints(draft: Draft): { ip: string; label: string }[] {
  return draft.devices.flatMap((device) =>
    device.interfaces
      .map((iface) => ({ ip: iface.ip.split("/")[0].trim(), label: `${device.id} ${iface.name}` }))
      .filter((item) => item.ip),
  );
}

export function caseJson(draft: Draft): string {
  const { flow, claim } = draft;
  return JSON.stringify(
    {
      id: "new-case",
      source: "사례 출처를 적으세요(누구의 실습인지는 익명으로)",
      network: toNetwork(draft),
      flow,
      claim: claim.expected ? claim : undefined,
    },
    null,
    2,
  );
}
