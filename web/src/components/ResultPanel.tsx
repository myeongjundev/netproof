import type { Claim, Hop, Trace, Verdict } from "../types";

const RESULT_TEXT = {
  PASS: { title: "통과", note: "모델 안에서 계산한 결과, 이 통신은 됩니다." },
  DENY: { title: "막힘", note: "모델 안에서 계산한 결과, 이 통신은 막힙니다." },
  UNSUPPORTED: { title: "판정 불가", note: "지원 범위 밖이라 추측하지 않고 멈췄습니다." },
  INVALID: { title: "입력 오류", note: "입력이 성립하지 않아 계산하지 않았습니다." },
} as const;

const STEP_TEXT: Record<Hop["step"], string> = {
  send: "보냄",
  acl_in: "ACL 들어옴",
  route: "경로",
  acl_out: "ACL 나감",
  deliver: "도착",
};

const COMPARISON_TEXT = {
  AGREE: "받은 답과 일치",
  DISAGREE: "받은 답과 다름",
  NOT_COMPARABLE: "판정을 못 해 비교하지 않음",
  NO_CLAIM: "",
} as const;

function Path({ title, trace, decisive }: { title: string; trace: Trace; decisive: Hop | null }) {
  return (
    <div className="path">
      <h3>{title}</h3>
      <ol>
        {trace.hops.map((hop, i) => {
          const isDecisive = decisive !== null && i === trace.hops.length - 1 && hop.result === "drop";
          return (
            <li key={i} className={`hop ${hop.result}${isDecisive ? " decisive" : ""}`}>
              <span className="mark" aria-hidden="true">
                {hop.result === "ok" ? "✓" : "✗"}
              </span>
              <span className="sr-only">{hop.result === "ok" ? "통과" : "막힘"}</span>
              <div>
                <p className="hop-head">
                  <strong>{hop.device}</strong> <span className="tag">{STEP_TEXT[hop.step]}</span>
                </p>
                <p>{hop.detail}</p>
                {hop.rule && <code className="rule">{hop.rule}</code>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface Props {
  verdict: Verdict | null;
  claim: Claim;
  stale: boolean;
  error: string | null;
  loading: boolean;
}

export function ResultPanel({ verdict, claim, stale, error, loading }: Props) {
  return (
    <section className="panel result" aria-labelledby="result-title" aria-live="polite" aria-busy={loading}>
      <h2 id="result-title">판정</h2>
      {error && <p className="error">{error}</p>}
      {!verdict && !error && <p className="hint">구성과 통신을 적고 판정하기를 누르세요. 예시를 불러와도 됩니다.</p>}
      {verdict && (
        <>
          {stale && <p className="stale">입력이 바뀌었습니다. 다시 판정하세요.</p>}
          <div className={`verdict ${verdict.result.toLowerCase()}`}>
            <p className="verdict-title">
              {verdict.result} <span>{RESULT_TEXT[verdict.result].title}</span>
            </p>
            <p>{verdict.reason}</p>
            <p className="verdict-note">{RESULT_TEXT[verdict.result].note}</p>
          </div>
          {verdict.comparison !== "NO_CLAIM" && (
            <p className={`comparison ${verdict.comparison.toLowerCase()}`}>
              {claim.source || "받은 답"}: {claim.expected} → <strong>{COMPARISON_TEXT[verdict.comparison]}</strong>
            </p>
          )}
          {verdict.problems.length > 0 && (
            <ul className="problems">
              {verdict.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
          {verdict.forward && <Path title="가는 길" trace={verdict.forward} decisive={verdict.decisive} />}
          {verdict.return && <Path title="돌아오는 길" trace={verdict.return} decisive={verdict.decisive} />}
        </>
      )}
    </section>
  );
}
