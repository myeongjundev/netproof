import { useEffect, useRef, useState } from "react";
import { api, message } from "../api";
import { ActualBadge } from "../components/Badges";
import { ResultPanel } from "../components/ResultPanel";
import { EMPTY_CLAIM, fromCase } from "../draft";
import { cloneTitle } from "../practice";
import { applyObservation } from "../observe";
import { go } from "../router";
import type { ActualSource, CaseDetail, Draft, Observation, User } from "../types";

const SOURCES: Record<ActualSource, string> = { nmap: "Nmap 스캔", ping: "ping·접속 결과", device: "장비 재현", other: "기타" };
const OBSERVED: Record<Observation["observed"], string> = {
  reply: "손실 없이 응답", no_reply: "응답 없음", partial: "부분 손실", open: "포트 열림",
  closed: "포트 닫힘", filtered: "필터링·열림 여부 미정", unknown: "알 수 없음",
};

interface Props {
  id: number;
  user: User;
  onOpenInJudge: (draft: Draft, saveTitle?: string) => void;
}

export function CaseDetailPage({ id, user, onOpenInJudge }: Props) {
  const [item, setItem] = useState<CaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actual, setActual] = useState<CaseDetail["actual"]>({ result: null, source: null, note: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [candidate, setCandidate] = useState<Observation | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const parseRevision = useRef(0);

  useEffect(() => () => { parseRevision.current += 1; }, []);

  const parseOutput = async () => {
    if (!item) return;
    const started = ++parseRevision.current;
    setCandidate(null);
    setParseError(null);
    setParsing(true);
    try {
      const parsed = await api.observe(output, item.flow);
      if (started === parseRevision.current) setCandidate(parsed);
    } catch (e) {
      if (started === parseRevision.current) setParseError(message(e));
    } finally {
      if (started === parseRevision.current) setParsing(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.getCase(id).then(
      (loaded) => {
        if (!active) return;
        setItem(loaded);
        setActual(loaded.actual);
      },
      (e) => { if (active) setError(message(e)); },
    );
    return () => { active = false; };
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!item) return <p className="hint">불러오는 중…</p>;

  const isOwner = item.owner_id === user.id;
  const isReviewer = user.role === "reviewer";
  const run = async (action: () => Promise<CaseDetail>, done: string) => {
    setNotice(null);
    try {
      const next = await action();
      setItem(next);
      setActual(next.actual);
      setNotice(done);
    } catch (e) {
      setNotice(message(e));
    }
  };
  const actualChanged =
    actual.result !== item.actual.result || actual.source !== item.actual.source || actual.note !== item.actual.note;

  return (
    <div className="detail">
      <section className="panel">
        <p className="crumb">
          <a href="#/cases">사례 게시판</a>
        </p>
        <h2 className="detail-title">{item.title}</h2>
        <p className="meta">
          {item.author} · {new Date(item.created_at).toLocaleString("ko-KR")} · 계산 엔진 {item.engine_version}
        </p>
        <div className="row-actions">
          <button type="button" className="ghost small" onClick={() => onOpenInJudge(fromCase({ ...item, id: String(item.id), source: "" }))}>
            판정기에서 열기
          </button>
          <button type="button" className="ghost small" onClick={() => {
            const next = fromCase({ ...item, id: String(item.id), source: "" });
            onOpenInJudge({ ...next, claim: { ...EMPTY_CLAIM } }, cloneTitle(item.title));
          }}>
            복제해 다시 풀기
          </button>
          {(isOwner || isReviewer) && (
            <button
              type="button"
              className="ghost small danger"
              onClick={async () => {
                if (!window.confirm("이 사례를 지울까요? 되돌릴 수 없습니다.")) return;
                try {
                  await api.deleteCase(item.id);
                  go("/cases");
                } catch (e) {
                  setNotice(message(e));
                }
              }}
            >
              삭제
            </button>
          )}
        </div>
        <p className="hint below">복제는 받은 답을 비운 새 초안입니다. 다시 판정해 저장하면 실제 결과·확인 상태를 물려받지 않는 별개 사례가 됩니다.</p>
      </section>

      <div className="layout detail-grid">
        <ResultPanel
          verdict={{ ...item.verdict, comparison: item.comparison }}
          claim={item.claim ?? EMPTY_CLAIM}
          stale={false}
          error={null}
          loading={false}
          network={item.network}
        />

        <section className="panel" aria-labelledby="actual-title">
          <h2 id="actual-title">실제 결과</h2>
          <p className="hint">실습망에서 실제로 된 결과입니다. 작성자가 적고, 검토자가 확인합니다. 확인된 뒤 내용이 바뀌면 확인이 풀립니다.</p>
          <p>
            <ActualBadge item={item} />
            {item.confirmed && (
              <span className="meta">
                {" "}
                {item.confirmed_by} · {item.confirmed_at && new Date(item.confirmed_at).toLocaleString("ko-KR")}
              </span>
            )}
          </p>

          {isOwner ? (
            <div className="stack">
              <details className="observation">
                <summary>출력 붙여넣기</summary>
                <p className="hint">관측은 판정이 아닙니다. 붙여넣은 출력은 실제로 본 것이고, PASS/DENY 판정은 계산 엔진이 정합니다.</p>
                <p className="hint">응답이 없는 것(시간 초과·filtered)은 막혔다는 증거가 아닙니다. 막혔다고 볼지는 사람이 정합니다.</p>
                <p className="hint">출발지는 출력에 없습니다. 이 출력을 어느 장비에서 실행했는지 직접 확인하세요.</p>
                <p className="hint">장비 이름·내부 주소가 담긴 원문은 필요한 줄만 붙여넣으세요. 원문은 저장되지 않습니다.</p>
                <p className="hint">출력만으로 실행 여부를 증명할 수 없습니다. 확인했다고 적는 책임은 사람에게 있습니다.</p>
                <label className="block">
                  <span>ping·Nmap 출력</span>
                  <textarea rows={5} maxLength={4000} value={output} spellCheck={false} onChange={(e) => {
                    parseRevision.current += 1;
                    setOutput(e.target.value);
                    setCandidate(null);
                    setParseError(null);
                    setParsing(false);
                  }} />
                </label>
                <button type="button" className="ghost" onClick={parseOutput} disabled={!output.trim() || parsing}>
                  {parsing ? "후보 만드는 중…" : "후보 만들기"}
                </button>
                {parseError && <p className="error" role="alert">{parseError}</p>}
                {candidate && (
                  <div className="observation-candidate" role="status" aria-live="polite">
                    {candidate.status === "OK" && <>
                      <h3>관측: {OBSERVED[candidate.observed]} · {candidate.target}</h3>
                      <p>{candidate.result ? "실제 결과 후보: 됐다(PASS)" : "실제 결과 후보: 미정 — 적용해도 기존 결과 선택은 유지됩니다."}</p>
                      <pre>{candidate.evidence.join("\n")}</pre>
                    </>}
                    {candidate.problems.map((problem) => <p key={problem} className="hint">{problem}</p>)}
                    {candidate.status === "OK" && <>
                      <p className="hint">메모에 관측 요약을 덧붙입니다. 적용 후 입력을 확인하고 실제 결과 저장을 눌러야 저장됩니다.</p>
                      <button type="button" className="ghost" onClick={() => {
                        setActual((current) => applyObservation(current, candidate));
                        setCandidate(null);
                        setNotice("입력칸에 적용했습니다. 내용을 확인하고 실제 결과 저장을 눌러 주세요.");
                      }}>입력칸에 적용</button>
                    </>}
                  </div>
                )}
              </details>
              <div className="grid">
                <label>
                  <span>실제로</span>
                  <select value={actual.result ?? ""} onChange={(e) => setActual({ ...actual, result: (e.target.value || null) as CaseDetail["actual"]["result"] })}>
                    <option value="">아직 모름</option>
                    <option value="PASS">됐다(PASS)</option>
                    <option value="DENY">안 됐다(DENY)</option>
                  </select>
                </label>
                <label>
                  <span>어떻게 확인했나</span>
                  <select value={actual.source ?? ""} onChange={(e) => setActual({ ...actual, source: (e.target.value || null) as ActualSource | null })}>
                    <option value="">고르지 않음</option>
                    {(Object.keys(SOURCES) as ActualSource[]).map((key) => (
                      <option key={key} value={key}>
                        {SOURCES[key]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                <span>메모(명령, 날짜, 무엇을 봤는지)</span>
                <textarea rows={3} maxLength={1000} value={actual.note} onChange={(e) => setActual({ ...actual, note: e.target.value })} />
              </label>
              <div>
                <button type="button" className="ghost" disabled={!actualChanged} onClick={() => run(() => api.updateCase(item.id, { actual }), "실제 결과를 저장했습니다")}>
                  실제 결과 저장
                </button>
              </div>
            </div>
          ) : (
            <dl className="facts">
              <dt>실제로</dt>
              <dd>{item.actual.result ?? "아직 모름"}</dd>
              <dt>확인 방법</dt>
              <dd>{item.actual.source ? SOURCES[item.actual.source] : "없음"}</dd>
              <dt>메모</dt>
              <dd>{item.actual.note || "없음"}</dd>
            </dl>
          )}

          {isReviewer && (
            <div className="reviewer">
              <h3>검토자</h3>
              {item.confirmed ? (
                <button type="button" className="ghost" onClick={() => run(() => api.unconfirm(item.id), "확인을 거뒀습니다")}>
                  확인 거두기
                </button>
              ) : (
                <button type="button" className="ghost" onClick={() => run(() => api.confirm(item.id), "실제 결과를 확인했습니다")}>
                  실제 결과 확인
                </button>
              )}
              {item.confirmed && (
                <button
                  type="button"
                  className="ghost"
                  onClick={async () => {
                    try {
                      setExported(JSON.stringify(await api.exportCase(item.id), null, 2));
                    } catch (e) {
                      setNotice(message(e));
                    }
                  }}
                >
                  기준 사례 JSON 만들기
                </button>
              )}
              {exported && (
                <label className="block">
                  <span>cases/ 폴더에 넣으면 기준 사례 테스트가 됩니다</span>
                  <textarea readOnly rows={8} value={exported} spellCheck={false} />
                </label>
              )}
            </div>
          )}
          {notice && (
            <p className="notice" role="status">
              {notice}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
