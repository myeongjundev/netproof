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
  AGREE: { mark: "=", line: "받은 답과 계산이 같습니다." },
  DISAGREE: { mark: "≠", line: "받은 답과 계산이 다릅니다." },
  NOT_COMPARABLE: { mark: "?", line: "계산이 판정을 못 해 비교하지 않았습니다." },
} as const;

const ANSWER_TEXT = { PASS: "된다", DENY: "안 된다" } as const;

function claimLabel(claim: Claim): string {
  const who = claim.kind === "ai" ? "AI 답" : claim.kind === "self" ? "내 예상" : "받은 답";
  return claim.source ? `${who} · ${claim.source}` : who;
}

const DROP_TEXT: Record<Hop["step"], string> = {
  send: "보내지 못함",
  acl_in: "들어올 때 ACL",
  route: "경로 없음",
  acl_out: "나갈 때 ACL",
  deliver: "받지 못함",
};

export interface PathNode {
  device: string;
  ifs: string;
  drop: Hop | null;
}

/** 같은 장비에서 이어진 단계(ACL 들어옴 → 경로 → ACL 나감)를 장비 하나로 묶는다. */
export function pathNodes(hops: Hop[]): PathNode[] {
  const groups: Hop[][] = [];
  for (const hop of hops) {
    const last = groups.at(-1);
    if (last && last[0].device === hop.device) last.push(hop);
    else groups.push([hop]);
  }
  return groups.map((group) => ({
    device: group[0].device,
    ifs: [group[0].in_if, [...group].reverse().find((hop) => hop.out_if)?.out_if].filter(Boolean).join(" → "),
    drop: group.find((hop) => hop.result === "drop") ?? null,
  }));
}

/** 경로 그림. 아래 목록과 같은 내용이라 화면 읽기 프로그램에는 목록만 읽힌다. */
function Strip({ trace }: { trace: Trace }) {
  return (
    <ol className="strip" aria-hidden="true">
      {pathNodes(trace.hops).map((node, i) => (
        <li key={i} className={node.drop ? "node drop" : "node"}>
          <span className="led" />
          <strong>{node.device}</strong>
          {node.ifs && <span className="ifs">{node.ifs}</span>}
          {node.drop && <span className="drop-at">{DROP_TEXT[node.drop.step]}</span>}
        </li>
      ))}
    </ol>
  );
}

function Path({ title, trace, decisive }: { title: string; trace: Trace; decisive: Hop | null }) {
  return (
    <div className="path">
      <h3>{title}</h3>
      <Strip trace={trace} />
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
            {verdict.comparison === "NO_CLAIM" || !claim.expected ? (
              <p className="verdict-title">{RESULT_TEXT[verdict.result].title}</p>
            ) : (
              <>
                <div className="versus">
                  <p className="side claim-side">
                    <span className="side-label">{claimLabel(claim)}</span>
                    <strong>{ANSWER_TEXT[claim.expected]}</strong>
                  </p>
                  <span className="vs-mark" aria-hidden="true">
                    {COMPARISON_TEXT[verdict.comparison].mark}
                  </span>
                  <p className="side">
                    <span className="side-label">NetProof 계산</span>
                    <strong>{RESULT_TEXT[verdict.result].title}</strong>
                  </p>
                </div>
                <p className={`verdict-line ${verdict.comparison.toLowerCase()}`}>{COMPARISON_TEXT[verdict.comparison].line}</p>
              </>
            )}
            <p>{verdict.reason}</p>
            <p className="verdict-note">{RESULT_TEXT[verdict.result].note}</p>
          </div>
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
