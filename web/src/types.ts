export type Kind = "host" | "router";
export type Proto = "tcp" | "udp" | "icmp";
export type Mode = "session" | "one-way";
export type Result = "PASS" | "DENY" | "UNSUPPORTED" | "INVALID";
export type Comparison = "AGREE" | "DISAGREE" | "NOT_COMPARABLE" | "NO_CLAIM";

export interface Iface {
  name: string;
  ip: string;
  acl_in?: string | null;
  acl_out?: string | null;
}

export interface Route {
  prefix: string;
  next_hop?: string;
  out_if?: string;
}

export interface Device {
  id: string;
  kind: Kind;
  interfaces: Iface[];
  gateway?: string;
  routes?: Route[];
}

export interface Network {
  devices: Device[];
  acls: Record<string, string[]>;
}

export interface Flow {
  src: string;
  dst: string;
  proto: Proto;
  dst_port?: number;
  mode?: Mode;
}

export interface Claim {
  expected: "PASS" | "DENY" | null;
  kind?: "ai" | "self" | null;
  source: string;
  text: string;
}

export interface Hop {
  device: string;
  step: "send" | "acl_in" | "route" | "acl_out" | "deliver";
  result: "ok" | "drop";
  detail: string;
  in_if: string | null;
  out_if: string | null;
  rule: string | null;
  rule_seq: number | null;
  acl?: string | null;
  rule_line?: number | null;
}

export interface Trace {
  target?: { device: string; interface: string; ip: string };
  delivered: boolean;
  reason: string;
  hops: Hop[];
}

export interface Verdict {
  result: Result;
  reason: string;
  problems: string[];
  forward: Trace | null;
  return: Trace | null;
  decisive: Hop | null;
  comparison: Comparison;
}

export interface CaseItem {
  id: string;
  title?: string | null;
  source: string;
  network: Network;
  flow: Flow;
  claim?: Claim | null;
}

/** 화면에서 편집하기 쉬운 ACL 모양. 보낼 때 Network.acls로 바꾼다. */
export interface AclDraft {
  name: string;
  text: string;
}

export interface Draft {
  devices: Device[];
  acls: AclDraft[];
  flow: Flow;
  claim: Claim;
}

export interface User {
  id: number;
  nickname: string;
  role: "user" | "reviewer";
  role_name: string;
}

export type ActualSource = "nmap" | "ping" | "device" | "other";

export interface CaseSummary {
  id: number;
  title: string;
  author: string;
  result: Result;
  comparison: Comparison;
  claim_kind: "ai" | "self" | null;
  actual_result: "PASS" | "DENY" | null;
  confirmed: boolean;
  created_at: string;
}

export interface CaseFilters {
  q: string;
  mine: boolean;
  result: Result | "";
  comparison: Comparison | "";
  confirmed: "" | "0" | "1";
  source: ActualSource | "none" | "";
}

export interface CasePage {
  items: CaseSummary[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface CaseDetail extends CaseSummary {
  owner_id: number;
  network: Network;
  flow: Flow;
  claim: Claim | null;
  verdict: Omit<Verdict, "comparison">;
  engine_version: string;
  actual: { result: "PASS" | "DENY" | null; source: ActualSource | null; note: string };
  confirmed_by: string | null;
  confirmed_at: string | null;
  updated_at: string;
}

export interface Dashboard {
  total: number;
  confirmed: number;
  unsupported: number;
  invalid: number;
  confirmed_in_scope: number;
  agree: number;
  ai_confirmed: number;
  ai_wrong: number;
  mismatches: CaseSummary[];
}
