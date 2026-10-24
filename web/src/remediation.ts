import { reach, serviceName, keepText, type BreachScenario } from "./breach";
import { DEFAULT_TEXT, FIREWALL_NOTE, firewallRuleText, limitationNote } from "./firewall";
import type { Device, Iface, MatrixCell, Network, PolicyMatrix } from "./types";

/** 처음 닿던 연결이 지금 어떤가. 판정 불가는 막힘으로 세지 않고, 목적지가 지금 없으면 주소 사라짐이다. */
export type RecheckStatus = "blocked" | "open" | "unknown" | "missing" | "opened";
export interface RecheckRow { device: string; dst: string; service: string; status: RecheckStatus }
export interface Report {
  title: string; breached: string; role: string; engineVersion: string;
  before: { places: number; services: number }; after: { places: number; services: number };
  recheck: RecheckRow[]; opened: RecheckRow[];
  counts: { blocked: number; open: number; unknown: number; missing: number; opened: number };
  keeps: { label: string; text: string }[]; changes: string[]; limits: string[];
}

export const RECHECK_TEXT: Record<RecheckStatus, string> = {
  blocked: "막힘", open: "아직 닿음", unknown: "판정 불가", missing: "주소 사라짐", opened: "새로 닿음",
};
const RANK = { open: 2, unknown: 1, blocked: 0 } as const;
type Seen = keyof typeof RANK;

/** 뚫린 장비 출발 칸을 (목적지, 서비스)로 모은다. 출발 주소가 여럿이면 닿음 > 판정 불가 > 막힘. */
function outcomes(matrix: PolicyMatrix, breached: string) {
  const owner = new Map(matrix.endpoints.map((endpoint) => [endpoint.ip, endpoint.device]));
  const sources = new Set(matrix.endpoints.filter((endpoint) => endpoint.device === breached).map((endpoint) => endpoint.ip));
  const seen = new Map<string, { cell: MatrixCell; status: Seen }>();
  for (const cell of matrix.cells) {
    if (!sources.has(cell.src) || owner.get(cell.dst) === breached) continue;
    const status: Seen = cell.result === "PASS" ? "open" : cell.result === "UNSUPPORTED" || cell.result === "INVALID" ? "unknown" : "blocked";
    const key = `${cell.dst}/${cell.service}`, old = seen.get(key);
    if (!old || RANK[status] > RANK[old.status]) seen.set(key, { cell, status });
  }
  return { owner, seen };
}

/**
 * 침해 가정의 수복 기록(docs/v1-final-design.md §3). 이미 받은 처음·지금 매트릭스와 입력 구성만 쓴다.
 * 판정을 다시 하지 않고, 점수·완료·안전 판정을 만들지 않는다.
 */
export function remediationReport(scenario: BreachScenario, start: PolicyMatrix | null, now: PolicyMatrix | null, first: Network, current: Network): Report | null {
  const before = reach(start, scenario.breached), after = reach(now, scenario.breached);
  if (!start || !now || !before?.found || !after?.found) return null;
  const old = outcomes(start, scenario.breached), fresh = outcomes(now, scenario.breached);
  const row = (cell: MatrixCell, owner: Map<string, string>, status: RecheckStatus): RecheckRow =>
    ({ device: owner.get(cell.dst) ?? cell.dst, dst: cell.dst, service: serviceName(scenario.services, cell.service), status });
  const recheck = [...old.seen].filter(([, value]) => value.status === "open")
    .map(([key, value]) => row(value.cell, old.owner, fresh.seen.get(key)?.status ?? "missing"));
  const opened = [...fresh.seen].filter(([key, value]) => value.status === "open" && old.seen.get(key)?.status !== "open")
    .map(([, value]) => row(value.cell, fresh.owner, "opened"));
  const count = (status: RecheckStatus) => recheck.filter((item) => item.status === status).length;
  const keepCell = (keep: BreachScenario["keep"][number]) => now.cells.find((cell) => cell.src === keep.src && cell.dst === keep.dst && cell.service === keep.service);
  return {
    title: scenario.title, breached: scenario.breached, role: scenario.roles[scenario.breached] ?? "", engineVersion: now.engine_version,
    before: { places: before.targets.length, services: before.count }, after: { places: after.targets.length, services: after.count },
    recheck, opened,
    counts: { blocked: count("blocked"), open: count("open"), unknown: count("unknown"), missing: count("missing"), opened: opened.length },
    keeps: scenario.keep.map((keep) => ({ label: keep.label, text: keepText(keepCell(keep)) })),
    changes: configChanges(first, current),
    limits: [
      "닿음은 방화벽과 경로가 막지 않아 연결을 시작할 수 있다는 뜻입니다. 서비스가 열려 있는지·취약한지는 계산하지 않았습니다.",
      `검사한 서비스 ${scenario.services.length}개와 호스트 쌍만 계산했습니다. 검사하지 않은 통신은 알 수 없습니다.`,
      ...(limitationNote(now.cells.map((cell) => cell.reason)) ? [FIREWALL_NOTE] : []),
      "이 기록은 NetProof 모델 계산입니다. 실제 장비 결과나 운영 효과가 아닙니다.",
    ],
  };
}

const rulesText = (iface?: Iface) => iface?.rules_in?.length ? iface.rules_in.map(firewallRuleText).join("; ") : "규칙 없음";
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** 처음 구성과 지금 구성의 차이를 입력 그대로 적는다. 엔진을 부르지 않는다. */
export function configChanges(first: Network, current: Network): string[] {
  const lines: string[] = [];
  const now = new Map(current.devices.map((device) => [device.id, device]));
  for (const device of first.devices) {
    const next = now.get(device.id);
    if (!next) { lines.push(`${device.id} 장비 삭제`); continue; }
    if (device.kind !== next.kind || !!device.stateful !== !!next.stateful) lines.push(`${device.id} 종류 변경`);
    lines.push(...interfaceChanges(device, next));
    if (!same(device.gateway, next.gateway)) lines.push(`${device.id} 기본 게이트웨이 ${device.gateway || "없음"} → ${next.gateway || "없음"}`);
    if (!same(device.routes, next.routes)) lines.push(`${device.id} 정적 경로 변경`);
  }
  const known = new Set(first.devices.map((device) => device.id));
  for (const device of current.devices) if (!known.has(device.id)) lines.push(`${device.id} 장비 추가`);
  for (const name of new Set([...Object.keys(first.acls), ...Object.keys(current.acls)])) {
    if (!(name in current.acls)) lines.push(`ACL ${name} 삭제`);
    else if (!(name in first.acls)) lines.push(`ACL ${name} 추가`);
    else if (!same(first.acls[name], current.acls[name])) lines.push(`ACL ${name} 변경`);
  }
  return lines;
}

function interfaceChanges(device: Device, next: Device): string[] {
  const lines: string[] = [];
  const now = new Map(next.interfaces.map((iface) => [iface.name, iface]));
  for (const iface of device.interfaces) {
    const after = now.get(iface.name), where = `${device.id} ${iface.name}`;
    if (!after) { lines.push(`${where} ${iface.ip} 삭제`); continue; }
    if (iface.ip !== after.ip) lines.push(`${where} 주소 ${iface.ip} → ${after.ip}`);
    if (!same(iface.acl_in, after.acl_in)) lines.push(`${where} 입력 ACL ${iface.acl_in || "없음"} → ${after.acl_in || "없음"}`);
    if (!same(iface.acl_out, after.acl_out)) lines.push(`${where} 출력 ACL ${iface.acl_out || "없음"} → ${after.acl_out || "없음"}`);
    if (!same(iface.rules_in, after.rules_in)) lines.push(`${where} 들어오는 규칙 — 처음: ${rulesText(iface)} / 지금: ${rulesText(after)}`);
    if (!same(iface.default_in, after.default_in)) lines.push(`${where} 기본 동작 ${DEFAULT_TEXT[iface.default_in ?? "unknown"]} → ${DEFAULT_TEXT[after.default_in ?? "unknown"]}`);
  }
  const known = new Set(device.interfaces.map((iface) => iface.name));
  for (const iface of next.interfaces) if (!known.has(iface.name)) lines.push(`${device.id} ${iface.name} ${iface.ip} 추가`);
  return lines;
}

const place = (row: RecheckRow) => `${row.device}(${row.dst})`;

/** 화면과 같은 데이터로 Markdown을 만든다. when을 주면 작성 시각을 적는다. */
export function reportMarkdown(report: Report, when?: Date): string {
  const { counts } = report;
  const lines = [
    `# ${report.title} · 수복 기록`, "",
    `합성 구성 · NetProof 모델 계산(실제 장비 결과 아님) · 계산 엔진 ${report.engineVersion}${when ? ` · 작성 ${when.toLocaleString("ko-KR")}` : ""}`, "",
    "## 가정한 사건", `- 뚫렸다고 가정한 장비: ${report.breached}${report.role ? `(${report.role})` : ""}`, "",
    "## 피해 범위",
    `- 처음 구성 ${report.before.places}곳 · 서비스 ${report.before.services}개 → 지금 ${report.after.places}곳 · 서비스 ${report.after.services}개`, "",
    "## 다시 막히는지 대조",
    `처음 닿던 ${report.recheck.length}개 가운데 막힘 ${counts.blocked} · 아직 닿음 ${counts.open} · 판정 불가 ${counts.unknown} · 주소 사라짐 ${counts.missing}, 새로 닿음 ${counts.opened}`, "",
    "| 목적지 | 서비스 | 지금 |", "| --- | --- | --- |",
    ...report.recheck.map((row) => `| ${place(row)} | ${row.service} | ${RECHECK_TEXT[row.status]} |`), "",
    ...(report.opened.length ? ["### 새로 닿음", ...report.opened.map((row) => `- ${place(row)} · ${row.service}`), ""] : []),
    "## 지켜야 할 서비스", ...report.keeps.map((keep) => `- ${keep.label}: ${keep.text}`), "",
    "## 바꾼 구성", ...(report.changes.length ? report.changes.map((line) => `- ${line}`) : ["- 처음 구성과 같습니다"]), "",
    "## 남은 위험과 한계", ...report.limits.map((line) => `- ${line}`), "",
  ];
  return lines.join("\n");
}
