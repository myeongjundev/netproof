import type { Flow, MatrixCell, MatrixEndpoint, MatrixService, MatrixSpec, PolicyIntent, PolicyState } from "./types";

export const POLICY_TEXT: Record<PolicyState, string> = {
  EXPOSED: "노출", BLOCKED: "예상 밖 차단", UNDECIDED: "미판정", AGREE: "의도 일치", NO_POLICY: "의도 없음",
};
const PRIORITY: PolicyState[] = ["EXPOSED", "BLOCKED", "UNDECIDED", "AGREE", "NO_POLICY"];
export const MATRIX_STORAGE_KEY = "netproof.policy-matrix.v1";

export function defaultMatrixSpec(): MatrixSpec {
  return { mode: "session", services: [
    { proto: "tcp", dst_port: 22, label: "SSH" }, { proto: "tcp", dst_port: 80, label: "HTTP" },
    { proto: "tcp", dst_port: 443, label: "HTTPS" }, { proto: "udp", dst_port: 53, label: "DNS" },
    { proto: "icmp", icmp: "echo", label: "Ping" },
  ], intents: [] };
}

/** Storage is an input convenience, never a cached verdict. */
export function readMatrixSpec(raw: string | null): MatrixSpec {
  try {
    const value = JSON.parse(raw ?? "null") as MatrixSpec;
    if (!value || !["session", "one-way"].includes(value.mode) || !Array.isArray(value.services)
      || value.services.length < 1 || value.services.length > 8 || !Array.isArray(value.intents) || value.intents.length > 500) throw Error();
    for (const service of value.services) {
      if (!service || !["tcp", "udp", "icmp"].includes(service.proto)
        || (service.label !== undefined && (typeof service.label !== "string" || service.label.length > 80))
        || (service.proto === "icmp" ? typeof service.icmp !== "string" : !Number.isInteger(service.dst_port))) throw Error();
    }
    for (const intent of value.intents) {
      if (!intent || [intent.src, intent.dst, intent.service].some(v => typeof v !== "string")
        || !["PASS", "DENY"].includes(intent.expect) || (intent.note !== undefined && typeof intent.note !== "string")) throw Error();
    }
    return value;
  } catch { return defaultMatrixSpec(); }
}

export function serviceKey(service: MatrixService): string {
  if (service.proto !== "icmp") return `${service.proto}/${service.dst_port}`;
  const raw = service.icmp ?? "echo";
  const value = /^\d{1,3}$/.test(raw) ? String(Number(raw)) : raw;
  return `icmp/${value === "8" ? "echo" : value === "0" ? "echo-reply" : value}`;
}

export function flowForCell(cell: MatrixCell, services: (MatrixService & { key: string })[], mode: MatrixSpec["mode"]): Flow {
  const service = services.find(s => s.key === cell.service);
  if (!service) throw Error("검사한 서비스를 찾을 수 없습니다");
  return { src: cell.src, dst: cell.dst, proto: service.proto, mode,
    ...(service.proto === "icmp" ? { icmp: service.icmp } : { dst_port: service.dst_port }) };
}

/** Pivot only server-provided cells; missing pairs stay blank, never become DENY. */
export function matrixGrid(endpoints: MatrixEndpoint[], cells: MatrixCell[], service: string): (MatrixCell | null)[][] {
  const lookup = new Map(cells.filter(c => c.service === service).map(c => [JSON.stringify([c.src, c.dst]), c]));
  return endpoints.map(src => endpoints.map(dst => lookup.get(JSON.stringify([src.ip, dst.ip])) ?? null));
}

export function sortPolicyCells(cells: MatrixCell[]): MatrixCell[] {
  return [...cells].sort((a, b) => PRIORITY.indexOf(a.policy) - PRIORITY.indexOf(b.policy));
}

export function setCellIntent(intents: PolicyIntent[], cell: Pick<MatrixCell, "src" | "dst" | "service">, expect: PolicyIntent["expect"] | null): PolicyIntent[] {
  const matches = (i: PolicyIntent) => i.src === cell.src && i.dst === cell.dst && i.service === cell.service;
  const old = intents.find(matches);
  const remaining = intents.filter(i => !matches(i));
  return expect === null ? remaining : [...remaining, { src: cell.src, dst: cell.dst, service: cell.service, expect, note: old?.note ?? "" }];
}

/** Used by the page for both requests. Cleanup prevents stale success/error. */
export async function guardedRequest<T>(request: () => Promise<T>, active: () => boolean, success: (value: T) => void, failure: (error: unknown) => void): Promise<void> {
  try { const value = await request(); if (active()) success(value); }
  catch (error) { if (active()) failure(error); }
}
