import data from "./breach.json";
import { EMPTY_CLAIM, fromCase } from "./draft";
import { flowForCell, serviceKey } from "./policyMatrix";
import type { DiagramMark } from "./components/NetworkDiagram";
import type { ChangeImpact, Draft, Flow, MatrixCell, MatrixService, MatrixSpec, Network, PolicyIntent, PolicyMatrix } from "./types";

/** 지켜야 할 서비스. 정답이 아니라 실습의 요구사항이다(설계 §3.3). */
export interface BreachKeep extends PolicyIntent { label: string; why: string }
export interface BreachScenario {
  id: string; title: string; story: string; task: string; breached: string;
  roles: Record<string, string>; services: MatrixService[]; keep: BreachKeep[]; network: Network;
}
export const BREACHES = data as BreachScenario[];
export const breachById = (id: string) => BREACHES.find((item) => item.id === id);

export type Guess = "reach" | "safe";
export type DeviceStatus = "reach" | "safe" | "unknown";
export type Mark = DiagramMark;
export interface Reach {
  found: boolean; others: string[]; targets: { device: string; cells: MatrixCell[] }[];
  undecided: MatrixCell[]; unknown: string[]; count: number;
}

export function breachSpec(scenario: BreachScenario): MatrixSpec {
  return { mode: "session", services: scenario.services.map((service) => ({ ...service })),
    intents: scenario.keep.map(({ src, dst, service, expect }) => ({ src, dst, service, expect })) };
}

/** 그림 배치에만 쓰는 흐름. 뚫린 장비 주소에서 시작해야 그 장비가 구성도 첫 층에 온다. */
export function layoutFlow(draft: Pick<Draft, "devices">, breached: string): Flow {
  const ip = draft.devices.find((device) => device.id === breached)?.interfaces[0]?.ip.split("/")[0] ?? "";
  return { src: ip, dst: ip, proto: "tcp", dst_port: 443, mode: "session" };
}

export function breachDraft(scenario: BreachScenario): Draft {
  const network = structuredClone(scenario.network);
  return { ...fromCase({ id: scenario.id, source: "", network, flow: layoutFlow(network, scenario.breached) }), claim: { ...EMPTY_CLAIM } };
}

export function breachImport(id: string, draft: Draft) {
  return { draft: structuredClone(draft), label: `${breachById(id)!.title} 구성을 판정기로 가져왔습니다` };
}

export const serviceName = (services: MatrixService[], key: string) => services.find((service) => serviceKey(service) === key)?.label || key;

/** 매트릭스 칸·지켜야 할 서비스를 근거 판정·변경 영향에 넘길 왕복 흐름으로 바꾼다. */
export function cellFlow(scenario: BreachScenario, cell: Pick<MatrixCell, "src" | "dst" | "service">): Flow {
  return flowForCell(cell, scenario.services.map((service) => ({ ...service, key: serviceKey(service) })), "session");
}

/** 엔진 칸 가운데 뚫린 장비에서 시작하는 것을 고르고 목적지 장비로 묶기만 한다. 판정을 다시 하지 않는다. */
export function reach(matrix: PolicyMatrix | null, breached: string): Reach | null {
  if (!matrix || matrix.status !== "OK" || matrix.limit_exceeded) return null;
  const owner = new Map(matrix.endpoints.map((endpoint) => [endpoint.ip, endpoint.device]));
  const sources = new Set(matrix.endpoints.filter((endpoint) => endpoint.device === breached).map((endpoint) => endpoint.ip));
  const others = [...new Set(matrix.endpoints.map((endpoint) => endpoint.device))].filter((device) => device !== breached);
  const mine = sources.size ? matrix.cells.filter((cell) => sources.has(cell.src)) : [];
  const targets: Reach["targets"] = [];
  for (const cell of mine.filter((item) => item.result === "PASS")) {
    const device = owner.get(cell.dst) ?? cell.dst;
    const target = targets.find((item) => item.device === device);
    if (target) target.cells.push(cell); else targets.push({ device, cells: [cell] });
  }
  const undecided = mine.filter((cell) => cell.result === "UNSUPPORTED" || cell.result === "INVALID");
  return { found: sources.size > 0, others: sources.size ? others : [], targets, undecided,
    unknown: [...new Set(undecided.map((cell) => owner.get(cell.dst) ?? cell.dst))],
    count: targets.reduce((sum, target) => sum + target.cells.length, 0) };
}

/** 닿는 서비스가 하나라도 있으면 닿음. 판정 불가 칸만 있으면 안 닿음이 아니라 판정 불가다. */
export function deviceStatus(result: Reach, device: string): DeviceStatus {
  return result.targets.some((target) => target.device === device) ? "reach" : result.unknown.includes(device) ? "unknown" : "safe";
}

export function reachMarks(breached: string, result: Reach): Record<string, Mark> {
  const marks: Record<string, Mark> = { [breached]: { tone: "breached", text: "뚫림" } };
  for (const device of result.others) {
    const status = deviceStatus(result, device);
    const count = result.targets.find((target) => target.device === device)?.cells.length ?? 0;
    marks[device] = { tone: status, text: status === "reach" ? `닿음 · 서비스 ${count}개` : status === "unknown" ? "판정 불가" : "안 닿음" };
  }
  return marks;
}

/** 학생 예상은 처음 구성에 대한 것이다. 맞힌 수나 점수는 세지 않는다. */
export function guessText(guess: Guess | undefined, status: DeviceStatus | undefined): string {
  if (!status) return "처음 구성을 계산하지 못함";
  if (!guess) return "예상 안 함";
  if (status === "unknown") return "계산이 판정하지 못함";
  return guess === status ? "예상과 같음" : "예상과 다름";
}

export function keepText(cell?: MatrixCell): string {
  return cell?.policy === "AGREE" ? "그대로 됩니다" : cell?.policy === "BLOCKED" ? "막혔습니다" : "판정 불가";
}

/** 엔진 change_impact의 분류를 그대로 두고, 출발 장비가 뚫린 장비인지만 나눈다. */
export function splitChanges(impact: ChangeImpact | null, breached: string) {
  const changes = impact?.status === "OK" ? impact.changes : [];
  return { attacker: changes.filter((change) => change.src_device === breached), others: changes.filter((change) => change.src_device !== breached) };
}
