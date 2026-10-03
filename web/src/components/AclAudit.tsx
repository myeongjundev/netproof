import { auditBlocks } from "../aclAudit";
import type { AclAudit as AuditResult } from "../types";

export function AclAudit({ result, error, stale, loading, onShow }: {
  result: AuditResult | null; error: string | null; stale: boolean; loading: boolean;
  onShow: (name: string, line: number) => void;
}) {
  const blocks = result ? auditBlocks(result) : [];
  const hasIssues = blocks.some(({ counts }) => counts.shadowed + counts.redundant + counts.never + counts.unknown > 0);
  const summary = loading ? "점검 중…" : error ? "점검 실패" : result?.status === "INVALID" ? "입력 오류" :
    result ? blocks.map((block) => `${blocks.length > 1 ? `ACL ${block.name} · ` : ""}${block.summary}`).join(" / ") || "문제 없음" : "점검 대기";
  return <section className="panel acl-audit" aria-labelledby="acl-audit-title">
    <details key={JSON.stringify(result)} open={hasIssues || !!error || result?.status === "INVALID"}>
    <summary id="acl-audit-title">ACL 점검 · {summary}</summary>
    <p className="hint">이 점검은 판정이 아닙니다. 흐름·경로와 상관없이 ACL 규칙만 계산합니다.</p>
    {loading && <p role="status">ACL 점검 중…</p>}
    {stale && <p role="status">이전 입력의 점검 결과입니다. 다시 판정해 주세요.</p>}
    {error && <p className="error" role="alert">ACL 점검 실패: {error}</p>}
    {result?.status === "INVALID" && <p className="error">{result.problems.join(" · ")}</p>}
    {blocks.map((block) => <section key={block.name} className="audit-block">
      <h3>ACL {block.name}</h3>
      <p>{block.summary}</p>
      <ul>{block.issues.map((item) => <li key={item.line}>
        <p>{item.text}</p><button type="button" className="ghost small" aria-label={`ACL ${block.name} ${item.line}번 줄 입력에서 보기`} disabled={stale || loading} onClick={() => onShow(block.name, item.line)}>입력에서 보기</button>
      </li>)}</ul>
      <p className="hint">문제를 찾지 못한 줄 {block.counts.clean}개</p>
      <ul>{block.opened.map((item) => <li key={item.line}>
        <p>{item.text}</p>
        {result?.acls.find((acl) => acl.name === block.name)?.lines.find((line) => line.line === item.line)?.catch_all && <p className="hint">앞 줄에 걸리지 않은 모든 통신을 허용합니다.</p>}
        <button type="button" className="ghost small" aria-label={`ACL ${block.name} ${item.line}번 줄 입력에서 보기`} disabled={stale || loading} onClick={() => onShow(block.name, item.line)}>입력에서 보기</button>
      </li>)}</ul>
    </section>)}
    </details>
  </section>;
}
