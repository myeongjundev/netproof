import { describe, expect, it } from "vitest";
import { auditBlocks, auditLineText } from "./aclAudit";
import type { AclAudit, AuditLine } from "./types";

function line(patch: Partial<AuditLine> = {}): AuditLine {
  return { line: 3, raw: "permit ip any any", kind: "rule", action: "permit", finding: null,
    by: [], implicit_deny: false, undetermined_reason: null, open: [], catch_all: false, ...patch };
}
function result(lines: AuditLine[], unchecked: number | null = null): AclAudit {
  return { status: "OK", problems: [], engine_version: "test", acls: [{ name: "101", lines, unchecked_from: unchecked }],
    totals: { shadowed: 0, redundant_earlier: 0, redundant_later: 0, never_matches: 0, undetermined: 0 } };
}

describe("ACL audit presentation", () => {
  it.each([
    ["shadowed", "가려짐"], ["redundant_earlier", "같은 동작으로 먼저"],
    ["redundant_later", "지워도"], ["never_matches", "포트 1~65535"], ["undetermined", "계산 한도"],
  ] as const)("describes %s without recomputing it", (finding, text) => {
    expect(auditLineText(line({ finding, by: [1, 2] }))).toContain(text);
  });
  it("names causal lines and implicit deny", () => {
    expect(auditLineText(line({ finding: "shadowed", by: [1, 2] }))).toContain("1번 · 2번");
    expect(auditLineText(line({ finding: "redundant_later", implicit_deny: true }))).toContain("암묵적 deny");
    expect(auditLineText(line({ finding: "undetermined", undetermined_reason: "unread_below" }))).toContain("해석하지 못한 줄");
    expect(auditLineText(line())).toBeNull();
  });
  it("counts unknowns separately from clean lines and remarks", () => {
    const block = auditBlocks(result([
      line({ finding: "shadowed" }), line({ line: 4, finding: "redundant_earlier" }),
      line({ line: 5, finding: "redundant_later" }), line({ line: 6, finding: "never_matches" }),
      line({ line: 7, finding: "undetermined" }), line({ line: 8, kind: "unread" }),
      line({ line: 9, kind: "unchecked" }), line({ line: 10 }), line({ line: 11, kind: "remark" }),
    ], 8))[0];
    expect(block.counts).toEqual({ shadowed: 1, redundant: 2, never: 1, unknown: 3, clean: 1 });
    expect(block.issues.at(-1)?.text).toContain("8번 줄부터 점검하지 않았습니다");
    expect(block.summary).toContain("점검 못 함 3");
  });
  it("shows open facts and catch-all separately from findings", () => {
    const blocks = auditBlocks(result([
      line({ catch_all: true, open: ["src", "dst", "proto"] }),
      line({ line: 4, open: ["src", "dst", "proto", "dst_port", "icmp_type"] }),
    ]));
    expect(blocks[0].opened[0].text).toBe("3번 줄 · 나머지 전부 허용");
    expect(blocks[0].opened[1].text).toBe("4번 줄 · 열린 범위: 출발지 전체 · 목적지 전체 · 모든 프로토콜 · 모든 목적지 포트 · 모든 ICMP 종류");
    expect(blocks[0].issues).toEqual([]);
  });
  it("has no blocks for an empty ACL list", () => {
    expect(auditBlocks({ ...result([]), acls: [] })).toEqual([]);
  });
});
