import { auditBlocks } from "../aclAudit";
import type { AclAudit as AuditResult } from "../types";

export function AclAudit({ result, error, stale, loading, onShow }: {
  result: AuditResult | null; error: string | null; stale: boolean; loading: boolean;
  onShow: (name: string, line: number) => void;
}) {
  return <section className="panel acl-audit" aria-labelledby="acl-audit-title">
    <h2 id="acl-audit-title">ACL 점검</h2>
    <p className="hint">이 점검은 판정이 아닙니다. 흐름·경로와 상관없이 ACL 규칙만 계산합니다.</p>
    {loading && <p role="status">ACL 점검 중…</p>}
    {stale && <p role="status">이전 입력의 점검 결과입니다. 다시 판정해 주세요.</p>}
    {error && <p className="error" role="alert">ACL 점검 실패: {error}</p>}
    {result?.status === "INVALID" && <p className="error">{result.problems.join(" · ")}</p>}
    {result && auditBlocks(result).map((block) => <section key={block.name} className="audit-block">
      <h3>ACL {block.name}</h3>
      <p>{block.summary}</p>
      <ul>{block.issues.map((item) => <li key={item.line}>
        <p>{item.text}</p><button type="button" className="ghost small" disabled={stale || loading} onClick={() => onShow(block.name, item.line)}>입력에서 보기</button>
      </li>)}</ul>
      <p className="hint">문제를 찾지 못한 줄 {block.counts.clean}개</p>
      <ul>{block.opened.map((item) => <li key={item.line}>
        <p>{item.text}</p><button type="button" className="ghost small" disabled={stale || loading} onClick={() => onShow(block.name, item.line)}>입력에서 보기</button>
      </li>)}</ul>
    </section>)}
  </section>;
}
