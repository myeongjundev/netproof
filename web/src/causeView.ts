import type { Cause, Result } from "./types";

export const causeNames = {
  acl_rule: "ACL 규칙에서 차단",
  acl_implicit: "ACL 암묵적 deny(일치 규칙 없음)",
  no_route: "경로 없음",
  no_gateway: "기본 게이트웨이 없음",
  no_next_hop: "다음 홉 없음",
  host_no_forward: "호스트가 전달하지 않음",
  routing_loop: "라우팅 루프",
  no_block: "막는 곳 없음(통과)",
  other: "분류 못 함",
} as const;

export function causeName(tag: string): string {
  return Object.hasOwn(causeNames, tag) ? causeNames[tag as keyof typeof causeNames] : causeNames.other;
}

export function causeRatio(count: number, denominator: number): string {
  return denominator === 0 ? "—" : `${Math.round(count / denominator * 100)}%`;
}

export function caseCauseText(result: Result, value: Cause): string | null {
  return result === "PASS" || result === "DENY" ? `원인 태그(통계): ${causeName(value.tag)}` : null;
}
