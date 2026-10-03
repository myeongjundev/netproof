import type { Suggestion, SuggestionTarget } from "../types";
import { afterDescription, DISCLAIMER, editDescription, sharedDescription, suggestionStatus, TRUNCATED } from "../suggest";

interface Props {
  target: SuggestionTarget | null; result: Suggestion | null; error: string | null;
  loading: boolean; stale: boolean; onTarget: (target: SuggestionTarget) => void;
  onCalculate: () => void; onShow: (acl: string, line: number | null) => void;
}
export function SuggestPanel({ target, result, error, loading, stale, onTarget, onCalculate, onShow }: Props) {
  return <section className="panel suggest" aria-labelledby="suggest-title">
    <details>
    <summary id="suggest-title">수정 후보 — 무엇을 넣으면 결과가 바뀌나</summary>
    <p className="hint">{DISCLAIMER}</p>
    {stale && <p role="status">이전 결과입니다. 입력이 바뀌었으므로 다시 판정해 주세요.</p>}
    <fieldset disabled={stale}>
      <legend>목표 결과 직접 선택</legend>
      {(["PASS", "DENY"] as const).map((value) => <label key={value}>
        <input type="radio" name="suggest-target" value={value} checked={target === value} onChange={() => onTarget(value)} /> {value === "PASS" ? "통과" : "막힘"}
      </label>)}
    </fieldset>
    <button type="button" className="ghost" disabled={!target || stale || loading} onClick={onCalculate}>
      {loading ? "후보 계산 중…" : "수정 후보 계산"}
    </button>
    {error && <p className="error" role="alert">{error}</p>}
    {result && <div aria-live="polite">
      <p>{suggestionStatus(result)}</p>
      {result.truncated && <p>{TRUNCATED}</p>}
      {result.candidates.map((candidate) => <article key={candidate.id}>
        <h3>후보 {candidate.id}</h3>
        {candidate.edits.map((edit, index) => <div key={index} className="suggest-edit">
          <p>{editDescription(edit)}</p>
          <pre><code>{edit.raw}</code></pre>
          <p className="hint">{sharedDescription(edit)}</p>
          {edit.anchor_before !== null && <button type="button" className="ghost small" aria-label={`ACL ${edit.acl} ${edit.anchor_before}번 줄 보기`} disabled={stale} onClick={() => onShow(edit.acl, edit.anchor_before)}>원래 줄 보기</button>}
        </div>)}
        <p>{afterDescription(candidate.after)}</p>
      </article>)}
    </div>}
    </details>
  </section>;
}
