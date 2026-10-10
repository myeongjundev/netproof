import { useEffect, useMemo, useRef, useState } from "react";
import { api, message } from "../api";
import { EMPTY_CLAIM, toNetwork } from "../draft";
import { exerciseById, exerciseFact, exerciseSpec, EXERCISE_FACT, goalCell, goalFlow, goalText, initializeFixDrafts, outsideChanges, type ExerciseGoal } from "../exercises";
import { NetworkEditor } from "../components/NetworkEditor";
import { ResultPanel } from "../components/ResultPanel";
import { aclSelection } from "../components/AclEvidence";
import { scrollTo } from "../motion";
import { factualText } from "../verdictView";
import type { CaseItem, ChangeImpact, Draft, Flow, Network, PolicyMatrix, Verdict } from "../types";

interface Props {
  id: string; draft?: Draft; setDraft: (update: (current: Draft) => Draft) => void;
  onReady: (example: CaseItem) => void; onImport: (draft: Draft) => void;
}
export function FixExercisePage({ id, draft, setDraft, onReady, onImport }: Props) {
  const exercise = exerciseById(id)!;
  const [example, setExample] = useState<CaseItem | null>(null);
  const [exampleStatus, setExampleStatus] = useState("loading");
  const [retry, setRetry] = useState(0);
  const [matrix, setMatrix] = useState<PolicyMatrix | null>(null);
  const [impact, setImpact] = useState<ChangeImpact | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedSnapshot, setCheckedSnapshot] = useState<string | null>(null);
  const [needsCheck, setNeedsCheck] = useState(false);
  const [evidence, setEvidence] = useState<{ network: Network; flow: Flow; verdict: Verdict } | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [undo, setUndo] = useState<Draft | null>(null);
  const active = useRef(true), revision = useRef(0), pending = useRef(false), evidenceRevision = useRef(0);
  const aclInputs = useRef(new Map<number, HTMLTextAreaElement>());
  const configFold = useRef<HTMLDetailsElement>(null);
  const snapshot = useMemo(() => JSON.stringify(draft), [draft]);
  const latest = useRef(snapshot), previous = useRef(snapshot);
  latest.current = snapshot;
  const stale = checkedSnapshot !== null && (needsCheck || checkedSnapshot !== snapshot);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; revision.current++; evidenceRevision.current++; pending.current = false; };
  }, []);
  useEffect(() => {
    if (previous.current !== snapshot) {
      previous.current = snapshot; revision.current++; evidenceRevision.current++; pending.current = false;
      setChecking(false); setEvidenceLoading(false);
    }
  }, [snapshot]);
  useEffect(() => {
    let live = true;
    setExampleStatus("loading");
    api.examples().then(items => {
      if (!live) return;
      const found = items.find(item => item.id === exercise.baseCaseId) ?? null;
      setExample(found); setExampleStatus(found ? "ready" : "missing");
    }, () => { if (live) setExampleStatus("error"); });
    return () => { live = false; };
  }, [exercise.baseCaseId, retry]);
  useEffect(() => { if (example) onReady(example); }, [example, onReady]);

  const invalidate = () => {
    revision.current++; evidenceRevision.current++; pending.current = false;
    setChecking(false); setEvidenceLoading(false); setNeedsCheck(true);
  };
  const update = (patch: Partial<Draft>) => {
    invalidate(); setUndo(null); setDraft(current => ({ ...current, ...patch }));
  };
  const reset = () => {
    if (!draft || !example) return;
    const next = initializeFixDrafts({}, id, example)[id];
    if (JSON.stringify(next) === snapshot) return;
    invalidate(); setUndo(structuredClone(draft)); setDraft(() => next);
  };
  const check = async () => {
    if (!draft || !example || pending.current) return;
    pending.current = true;
    const started = ++revision.current, requested = snapshot;
    const current = () => active.current && revision.current === started && latest.current === requested;
    const network = structuredClone(toNetwork(draft)), spec = exerciseSpec(exercise);
    evidenceRevision.current++; setEvidenceLoading(false); setEvidence(null); setEvidenceError(null);
    setChecking(true); setMatrix(null); setImpact(null); setMatrixError(null); setImpactError(null);
    setCheckedSnapshot(requested); setNeedsCheck(false);
    // 두 응답을 독립적으로 표시한다. 한쪽 실패가 다른 쪽을 지우지 않는다.
    const matrixRequest = async () => {
      try { const result = await api.policyMatrix(network, spec); if (current()) setMatrix(result); }
      catch (error) { if (current()) setMatrixError(message(error)); }
    };
    const impactRequest = async () => {
      try { const result = await api.changeImpact(structuredClone(example.network), network, goalFlow(exercise, exercise.goals[0]), spec.services); if (current()) setImpact(result); }
      catch (error) { if (current()) setImpactError(message(error)); }
    };
    await Promise.all([matrixRequest(), impactRequest()]);
    if (current()) { pending.current = false; setChecking(false); }
  };
  const showEvidence = async (goal: ExerciseGoal) => {
    if (!draft || stale || checking || checkedSnapshot === null) return;
    const started = ++evidenceRevision.current, requested = snapshot;
    const current = () => active.current && evidenceRevision.current === started && latest.current === requested;
    const network = structuredClone(toNetwork(draft)), flow = goalFlow(exercise, goal);
    setEvidenceLoading(true); setEvidence(null); setEvidenceError(null);
    try { const verdict = await api.verify(network, flow, { ...EMPTY_CLAIM }); if (current()) setEvidence({ network, flow, verdict }); }
    catch (error) { if (current()) setEvidenceError(message(error)); }
    finally { if (current()) setEvidenceLoading(false); }
  };
  const showAcl = (name: string, line: number | null) => {
    if (!draft || stale || checking) return;
    const index = draft.acls.findLastIndex(acl => acl.name.trim() === name), input = aclInputs.current.get(index);
    if (!input) return;
    const range = aclSelection(input.value, line);
    if (!range) return;
    if (configFold.current) configFold.current.open = true;
    input.focus({ preventScroll: true }); input.setSelectionRange(range.start, range.end); scrollTo(input, "center");
  };
  const changes = impact?.status === "OK" ? outsideChanges(exercise, impact) : [];
  return <div className="practice-page fix-exercise">
    <nav className="practice-breadcrumb" aria-label="현재 위치"><a href="#/learn">학습실</a><span> › 고치기 과제</span></nav>
    <section className="practice-problem"><div><p className="home-eyebrow">합성 구성 · 고치기 과제</p><h1>{exercise.title}</h1><p className="practice-question">{exercise.prompt}</p>
      <p className="hint below">다른 화면에 다녀와도 남지만 새로고침하면 사라집니다.</p></div></section>
    <section className="panel fix-goals" aria-labelledby="fix-goals-title"><h2 id="fix-goals-title">목표 통신</h2>
      {stale && <p className="previous-result">이전 결과 · 다시 확인해 주세요.</p>}
      <ul>{exercise.goals.map((goal, index) => {
        const cell = goalCell(matrix, goal);
        return <li key={index}><strong>{goal.label}</strong><p>{goal.src} → {goal.dst} · {goal.service} · {goal.expect === "PASS" ? "열려야 함" : "막혀야 함"}</p>
          <p>{checkedSnapshot === null ? "확인 전" : matrix ? `${goalText(cell)}${cell ? ` · ${cell.result}` : ""}` : checking ? "계산 중…" : "결과 없음"}</p>
          {cell && <p className="hint">{factualText(cell.reason)}</p>}
          <button type="button" className="ghost small" disabled={stale || checking || checkedSnapshot === null} onClick={() => showEvidence(goal)}>근거 보기<span className="sr-only"> · {goal.label}</span></button>
        </li>;
      })}</ul>
    </section>
    {exampleStatus === "loading" ? <p role="status">처음 구성을 불러오는 중…</p> : exampleStatus === "error" ? <div><p role="alert">처음 구성을 가져오지 못했습니다.</p><button type="button" className="ghost" onClick={() => setRetry(value => value + 1)}>다시 시도</button></div>
      : exampleStatus === "missing" ? <p>이 과제의 처음 구성을 현재 제공하지 않습니다.</p> : !draft ? <p role="status">구성을 준비하는 중…</p> : <>
      <section className="panel practice-config"><div className="panel-head"><h2>구성 편집</h2><button type="button" className="ghost small" onClick={reset}>처음 구성으로</button></div>
        {undo && <p role="status">처음 구성으로 돌아갔습니다. <button type="button" className="ghost small" onClick={() => { invalidate(); setDraft(() => structuredClone(undo)); setUndo(null); }}>되돌리기</button></p>}
        <details className="mobile-fold" ref={configFold}><summary>구성 펼쳐 보기</summary>
          <NetworkEditor devices={draft.devices} acls={draft.acls} onDevices={devices => update({ devices })} onAcls={acls => update({ acls })}
            aclInputRef={(index, element) => { if (element) aclInputs.current.set(index, element); else aclInputs.current.delete(index); }} />
        </details>
      </section>
      <div className="judge"><button type="button" className="primary" disabled={checking} onClick={check}>{checking ? "계산 중…" : "확인하기"}</button></div>
      <section className="panel fix-results" aria-labelledby="fix-results-title" aria-busy={checking}><h2 id="fix-results-title">확인한 계산</h2>
        {stale && <p className="previous-result">이전 결과 · 입력이 바뀌었습니다. 다시 확인해 주세요.</p>}
        {matrixError && <p role="alert" className="error">목표 통신: {matrixError}</p>}
        {matrix && (matrix.status === "INVALID" || matrix.limit_exceeded) && <ul>{matrix.problems.map((problem, index) => <li key={index}>{problem}</li>)}</ul>}
        <h3>목표에 없는 통신의 변화</h3>
        {impactError && <p role="alert" className="error">변경 영향: {impactError}</p>}
        {impact && (impact.status === "INVALID" || impact.limit_exceeded) ? <ul>{impact.problems.map((problem, index) => <li key={index}>{problem}</li>)}</ul>
          : impact ? <>
            <p className="hint">검사한 서비스: {impact.services.map(service => service.label || service.key).join(" · ")} · 왕복</p>
            {impact.totals.not_compared > 0 && <p>끝점이 바뀌어 비교하지 않은 통신 {impact.totals.not_compared}건</p>}
            {changes.length === 0 ? <p>목표에 없는 통신의 변화 0건</p> : <ol className="change-list">{changes.map((change, index) => <li key={index}>
              <p>{change.kind === "opened" ? "새로 열림" : change.kind === "closed" ? "새로 막힘" : "그 밖의 변화"} · {change.src_device}({change.src}) → {change.dst_device}({change.dst}) · {change.service}</p>
              <p>{change.before.result} → {change.after.result}</p><p className="hint">{factualText(change.after.reason)}</p>
            </li>)}</ol>}
          </> : <p>{checking ? "계산 중…" : checkedSnapshot === null ? "확인 전" : "결과 없음"}</p>}
        {!stale && !checking && exerciseFact(exercise, matrix, impact) && <p className="fix-fact">{EXERCISE_FACT}</p>}
        <p className="hint below">검사한 서비스와 호스트 쌍만 계산합니다. 실제 장비 결과가 아니며 검사하지 않은 통신은 알 수 없습니다.</p>
      </section>
      <ResultPanel title="목표 통신의 근거" emptyHint="목표의 근거 보기를 누르면 해당 통신을 계산합니다." factual verdict={evidence?.verdict ?? null} network={evidence?.network} flow={evidence?.flow}
        claim={EMPTY_CLAIM} stale={stale} loading={evidenceLoading || checking} error={evidenceError} onShowAcl={showAcl} />
      <div className="practice-import"><button type="button" className="ghost" onClick={() => onImport(structuredClone(draft))}>판정기로 가져가기</button></div>
    </>}
  </div>;
}
