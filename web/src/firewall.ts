import type { DefaultIn, FirewallRule, Hop, Verdict } from "./types";

/** 엔진 firewall.py의 LIMITATION과 같은 문장. 단계·이유마다 붙는 이 끝 문장만 화면에서 떼고 결과 아래 한 번 보인다. */
export const FIREWALL_LIMITATION = "제한된 상태 추적 모델이며 실제 pfSense 장비와 대조하지 않았습니다";
export const ACTION_TEXT: Record<FirewallRule["action"], string> = { pass: "통과", block: "차단" };
export const PROTO_TEXT: Record<FirewallRule["proto"], string> = { ip: "모든 프로토콜", tcp: "TCP", udp: "UDP", icmp: "ICMP" };
export const DEFAULT_TEXT: Record<DefaultIn, string> = { block: "차단", pass: "통과", unknown: "모름(판정 불가)" };
const RULE_KEYS = ["action", "proto", "src", "dst", "src_port", "dst_port"];

const endpoint = (address: string, port: unknown) => port == null || port === "" || port === "any" ? address : `${address}:${port}`;

/** 규칙을 읽기 쉬운 한 줄로 바꾼다. 평가하지 않으며, 모르는 모양이면 원문 JSON을 그대로 보인다. */
export function firewallRuleText(rule: unknown): string {
  if (typeof rule !== "object" || rule === null) return JSON.stringify(rule);
  const r = rule as Record<string, unknown>;
  if (!Object.keys(r).every((key) => RULE_KEYS.includes(key)) || typeof r.src !== "string" || typeof r.dst !== "string" ||
      !Object.hasOwn(ACTION_TEXT, String(r.action)) || !Object.hasOwn(PROTO_TEXT, String(r.proto))) return JSON.stringify(rule);
  const { action, proto } = r as unknown as FirewallRule;
  return `${ACTION_TEXT[action]} · ${PROTO_TEXT[proto]} · ${endpoint(r.src, r.src_port)} → ${endpoint(r.dst, r.dst_port)}`;
}

/** 방화벽 단계의 규칙 원문(JSON)만 한 줄로 바꾼다. ACL 줄은 그대로다. */
export function hopRuleText(hop: Hop): string | null {
  if (!hop.rule || hop.step !== "firewall_in") return hop.rule;
  try { return firewallRuleText(JSON.parse(hop.rule)); } catch { return hop.rule; }
}

const SUFFIX = `. ${FIREWALL_LIMITATION}`;
export const withoutLimitation = (text: string) => text.endsWith(SUFFIX) ? text.slice(0, -SUFFIX.length) : text;
/** 문장마다 뗀 미대조 문장을 대신해 결과 아래에 한 번 보이는 안내. */
export const FIREWALL_NOTE = "방화벽 단계는 제한된 상태 추적 모델로 계산했습니다. 실제 pfSense 장비와 대조하지 않았습니다.";
export const limitationNote = (texts: string[]) => texts.some((text) => text.endsWith(SUFFIX));

/** 방화벽 기본 차단(원인 태그 firewall_default와 같은 기준): 어느 규칙에도 맞지 않아 막혔고, 막는 규칙이 따로 있지 않다. */
export const DEFAULT_BLOCK_NOTE = "어느 규칙에도 맞지 않아 기본 차단이 적용됐습니다. 이 통신을 막는 차단 규칙이 따로 있는 것은 아닙니다.";
export const defaultBlock = (verdict: Verdict) => verdict.result === "DENY" && verdict.decisive?.step === "firewall_in" && verdict.decisive.rule_seq == null;

/** 이유나 단계에 미대조 문장이 붙어 있었는지. 있으면 결과 아래에 한 번 보인다. */
export function firewallNote(verdict: Verdict): boolean {
  const hops = [...(verdict.forward?.hops ?? []), ...(verdict.return?.hops ?? [])];
  return limitationNote([verdict.reason, ...hops.map((hop) => hop.detail)]);
}
