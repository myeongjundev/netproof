import type { AclAudit, AuditLine } from "./types";

export function auditLineText(line: AuditLine): string | null {
  const prefix = `${line.line}번 줄`;
  const by = line.by.map((n) => `${n}번`).join(" · ");
  switch (line.finding) {
    case "shadowed": return `${prefix} · 가려짐 — ${by} 줄이 먼저 잡고, 그중 동작이 반대인 줄이 있어 이 줄의 ${line.action}는 적용되지 않습니다.`;
    case "redundant_earlier": return `${prefix} · 중복 — ${by} 줄이 같은 동작으로 먼저 잡습니다. 지워도 결과가 같습니다.`;
    case "redundant_later": return `${prefix} · 중복 — 지워도 ${[by ? `${by} 줄` : "", line.implicit_deny ? "암묵적 deny" : ""].filter(Boolean).join(" · ")}이(가) 같은 동작을 합니다.`;
    case "never_matches": return `${prefix} · 일치 불가 — 이 줄에 맞는 패킷이 없습니다(포트 1~65535, ICMP 종류 0~255 기준).`;
    case "undetermined": return `${prefix} · 점검 못 함 — ${line.undetermined_reason === "unread_below" ? "아래 해석하지 못한 줄 때문에 판단할 수 없습니다." : "계산 한도를 넘었습니다."}`;
    default: return null;
  }
}

const openNames = { src: "출발지 전체", dst: "목적지 전체", proto: "모든 프로토콜", dst_port: "모든 목적지 포트", icmp_type: "모든 ICMP 종류" };

export function auditBlocks(result: AclAudit) {
  return result.acls.map((acl) => {
    const issues: { line: number; text: string }[] = [];
    const opened: { line: number; text: string }[] = [];
    const counts = { shadowed: 0, redundant: 0, never: 0, unknown: 0, clean: 0 };
    for (const line of acl.lines) {
      if (line.kind === "unread" || line.kind === "unchecked") { counts.unknown++; continue; }
      if (line.kind !== "rule") continue;
      if (line.finding === "shadowed") counts.shadowed++;
      else if (line.finding?.startsWith("redundant")) counts.redundant++;
      else if (line.finding === "never_matches") counts.never++;
      else if (line.finding === "undetermined") counts.unknown++;
      else counts.clean++;
      const text = auditLineText(line);
      if (text) issues.push({ line: line.line, text });
      if (line.catch_all) opened.push({ line: line.line, text: `${line.line}번 줄 · 나머지 전부 허용` });
      else if (line.open.length) opened.push({ line: line.line, text: `${line.line}번 줄 · 열린 범위: ${line.open.map((key) => openNames[key]).join(" · ")}` });
    }
    if (acl.unchecked_from !== null) issues.push({ line: acl.unchecked_from, text: `${acl.unchecked_from}번 줄부터 점검하지 않았습니다 — 해석하지 못한 줄이 있습니다.` });
    issues.sort((a, b) => a.line - b.line);
    return { name: acl.name, issues, opened, counts,
      summary: `가려짐 ${counts.shadowed} · 중복 ${counts.redundant} · 일치 불가 ${counts.never} · 점검 못 함 ${counts.unknown}` };
  });
}
