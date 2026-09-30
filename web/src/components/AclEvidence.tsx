import type { Network, Verdict } from "../types";

type LineState = "걸림-차단" | "걸림-허용" | "불일치" | "도달 안 함";
export interface AclBlock {
  title: string;
  acl: string;
  ruleLine: number | null;
  implicitDeny: boolean;
  lines: { number: number; text: string; state: LineState }[];
}

/** 규칙을 해석하지 않고 엔진의 줄 위치와 결과를 표시 상태로 바꾼다. */
export function aclEvidence(verdict: Verdict, acls: Network["acls"]): AclBlock[] {
  const blocks: AclBlock[] = [];
  for (const [direction, trace] of [["가는 길", verdict.forward], ["돌아오는 길", verdict.return]] as const) {
    for (const hop of trace?.hops ?? []) {
      if ((hop.step !== "acl_in" && hop.step !== "acl_out") || hop.acl == null || hop.rule_line === undefined) continue;
      const lines = Object.hasOwn(acls, hop.acl) ? acls[hop.acl] : undefined;
      if (!lines || (hop.rule_line !== null && (!Number.isInteger(hop.rule_line) || hop.rule_line < 1 || hop.rule_line > lines.length))) continue;
      const implicitDeny = hop.rule_line === null && hop.result === "drop";
      if (hop.rule_line === null && !implicitDeny) continue;
      const ruleLine = hop.rule_line;
      blocks.push({
        title: `${direction} · ${hop.device} ${hop.step === "acl_in" ? hop.in_if : hop.out_if} ${hop.step === "acl_in" ? "들어올 때" : "나갈 때"} · ACL ${hop.acl}`,
        acl: hop.acl,
        ruleLine: hop.rule_line,
        implicitDeny,
        lines: lines.map((text, index) => ({
          number: index + 1,
          text,
          state: ruleLine === null || index + 1 < ruleLine ? "불일치"
            : index + 1 > ruleLine ? "도달 안 함"
            : hop.result === "drop" ? "걸림-차단" : "걸림-허용",
        })),
      });
    }
  }
  return blocks;
}

/** toNetwork가 빈 줄을 제외한 뒤의 1-based 위치를 textarea의 문자 범위로 되돌린다. */
export function aclSelection(text: string, sentLine: number | null): { start: number; end: number } | null {
  // 암묵적 deny는 특정 규칙이 없으므로 ACL 전체를 선택한다.
  if (sentLine === null) return { start: 0, end: text.length };
  if (!Number.isInteger(sentLine) || sentLine < 1) return null;
  let count = 0;
  let start = 0;
  for (const line of text.split("\n")) {
    if (line.trim()) count += 1;
    if (line.trim() && count === sentLine) return { start, end: start + line.length };
    start += line.length + 1;
  }
  return null;
}

const classes: Record<LineState, string> = {
  "걸림-차단": "acl-hit-deny", "걸림-허용": "acl-hit-permit", "불일치": "acl-miss", "도달 안 함": "acl-unvisited",
};

export function AclEvidence({ verdict, acls, stale, onShow }: {
  verdict: Verdict; acls: Network["acls"]; stale: boolean;
  onShow?: (acl: string, line: number | null) => void;
}) {
  const blocks = aclEvidence(verdict, acls);
  if (!blocks.length) return null;
  return <section className="acl-evidence" aria-label="ACL 근거">
    <h3>ACL 근거</h3>
    {blocks.map((block, index) => <section className="acl-block" key={index} aria-label={block.title}>
      <h4>{block.title}</h4>
      <ol>
        {block.lines.map((line) => <li key={line.number} className={classes[line.state]}>
          <span>{line.number}번 줄 · {line.state}</span><code>{line.text || "(빈 줄)"}</code>
        </li>)}
        {block.implicitDeny && <li className="acl-hit-deny">암묵적 deny — 모든 줄이 맞지 않음</li>}
      </ol>
      {onShow && <button type="button" className="ghost small" disabled={stale}
        onClick={() => onShow(block.acl, block.ruleLine)}>입력에서 보기</button>}
    </section>)}
  </section>;
}
