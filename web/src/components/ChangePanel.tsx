import type { ChangeHistory } from "../changeView";
import type { ChangeImpact } from "../types";

const RESULT = { PASS: "통과", DENY: "막힘", INVALID: "입력 오류", UNSUPPORTED: "판정 불가" };

export function ChangePanel({ history, result, error, loading, stale, disabled, onCalculate }: {
  history: ChangeHistory; result: ChangeImpact | null; error: string | null; loading: boolean;
  stale: boolean; disabled: boolean; onCalculate: () => void;
}) {
  if (!history.before || !history.last) return null;
  const { before, last } = history;
  const flow = last.flow;
  const service = flow.proto === "icmp" ? `ICMP ${flow.icmp ?? "echo"}` : `${flow.proto.toUpperCase()}/${flow.dst_port}`;
  return <section className="panel change-panel" aria-labelledby="change-title">
    <h2 id="change-title">변경 전/후</h2>
    <p>{flow.src} → {flow.dst} · {service}</p>
    <p>변경 전: {RESULT[before.verdict.result]} — {before.verdict.reason}</p>
    <p>변경 후: {RESULT[last.verdict.result]} — {last.verdict.reason}</p>
    {stale && <p className="hint">이전 입력의 비교입니다. 다시 판정해 주세요.</p>}
    <button type="button" className="ghost" disabled={stale || disabled || loading} onClick={onCalculate}>다른 통신 영향 계산</button>
    {loading && <p role="status">계산 중…</p>}
    {error && <p className="error" role="alert">{error}</p>}
    {result && <div aria-live="polite">
      {result.status === "INVALID" ? <p className="error">{result.problems.join(" · ")}</p> : <>
        <p>새로 열린 통신 {result.totals.opened}개 · 새로 막힌 통신 {result.totals.closed}개 · 그 밖의 변화 {result.totals.other}개</p>
        <p className="hint">검사 {result.totals.checks}건 · {result.services.map(s => s.label || s.key).join("·")} · {result.mode === "session" ? "왕복" : "한 방향"}
          {result.totals.not_compared > 0 && ` · 끝점이 바뀌어 비교하지 않은 통신 ${result.totals.not_compared}건`}</p>
        {result.totals.changed === 0 ? <p>검사한 범위에서 결과가 바뀐 다른 통신이 없습니다.</p> : <>
          <ol className="change-list">{result.changes.slice(0, 30).map((change, index) => <li key={index}>
            <p>{change.src_device}({change.src}) → {change.dst_device}({change.dst}) · {result.services.find(s => s.key === change.service)?.label || change.service}: {RESULT[change.before.result]} → {RESULT[change.after.result]}</p>
            <p className="hint">{change.after.reason}</p>
          </li>)}</ol>
          {result.totals.changed > 30 && <p>외 {result.totals.changed - 30}건</p>}
        </>}
      </>}
      <p className="hint">검사한 서비스와 호스트 쌍만 계산했습니다. 바뀐 통신이 없어도 안전을 보장하지 않으며, 실제 장비 결과가 아닙니다.</p>
    </div>}
  </section>;
}
