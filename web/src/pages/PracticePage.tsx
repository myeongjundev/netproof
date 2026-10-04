import { useEffect, useMemo, useRef, useState } from "react";
import { api, message } from "../api";
import { EMPTY_CLAIM, endpoints, toNetwork } from "../draft";
import { lessonByCaseId, practiceDraft, practiceEntry, type ExampleStatus, type PracticeGuess } from "../learning";
import { FlowForm } from "../components/FlowForm";
import { NetworkEditor } from "../components/NetworkEditor";
import { PathStrip } from "../components/PathStrip";
import { ResultPanel } from "../components/ResultPanel";
import { aclSelection } from "../components/AclEvidence";
import { focusJudgeResult } from "./JudgePage";
import { scrollTo } from "../motion";
import type { CaseItem, Claim, Draft, Network, Verdict } from "../types";

const INTRO_KEY = "netproof.practiceIntroSeen";
let introSeenInMemory = false;

export function practiceIntroSeen(): boolean {
  if (introSeenInMemory) return true;
  try { return localStorage.getItem(INTRO_KEY) === "1"; } catch { return false; }
}

export function rememberPracticeIntro() {
  introSeenInMemory = true;
  try { localStorage.setItem(INTRO_KEY, "1"); } catch { /* 이번 방문에서는 상태로 숨긴다. */ }
}

export function PracticeGuessPicker({ caseId, guess, onChange }: {
  caseId: string; guess?: PracticeGuess; onChange: (expected?: PracticeGuess) => void;
}) {
  return <fieldset className="practice-guess"><legend className="sr-only">내 예상</legend>
    {([["PASS", "통과할 것 같다"], ["DENY", "막힐 것 같다"], [undefined, "예상 없이"]] as const).map(([expected, label]) =>
      <label key={label}><input type="radio" name={`practice-guess-${caseId}`} checked={guess === expected} onChange={() => onChange(expected)} />{label}</label>)}
  </fieldset>;
}

interface Props {
  caseId: string;
  draft?: Draft;
  setDraft: (update: (current: Draft) => Draft) => void;
  onReady: (example: CaseItem) => void;
  onImport: (draft: Draft) => void;
}

/** 판정기 Draft를 받지 않는다. App의 해당 실습 입력만 읽고 고친다. */
export function PracticePage({ caseId, draft, setDraft, onReady, onImport }: Props) {
  const lesson = lessonByCaseId(caseId)!;
  const [examples, setExamples] = useState<CaseItem[]>([]);
  const [status, setStatus] = useState<ExampleStatus>("loading");
  const [request, setRequest] = useState(0);
  const [introSeen, setIntroSeen] = useState(practiceIntroSeen);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [judgedNetwork, setJudgedNetwork] = useState<Network | null>(null);
  const [judgedClaim, setJudgedClaim] = useState<Claim | null>(null);
  const [judged, setJudged] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [undo, setUndo] = useState<{ draft: Draft; label: string } | null>(null);
  const [needsJudge, setNeedsJudge] = useState(false);
  const revision = useRef(0);
  const aclInputs = useRef(new Map<number, HTMLTextAreaElement>());
  const configFold = useRef<HTMLDetailsElement>(null);
  const configTitle = useRef<HTMLHeadingElement>(null);
  const removing = useRef(false);
  const entry = practiceEntry(caseId, examples, status);
  const example = entry.kind === "ready" ? entry.example : undefined;
  const snapshot = useMemo(() => JSON.stringify(draft), [draft]);
  const latestSnapshot = useRef(snapshot);
  latestSnapshot.current = snapshot;
  const stale = judged !== null && (needsJudge || judged !== snapshot);
  const network = draft ? toNetwork(draft) : undefined;

  useEffect(() => () => { revision.current += 1; }, []);
  useEffect(() => {
    let active = true;
    setStatus("loading");
    setExamples([]);
    api.examples().then(items => {
      if (active) { setExamples(items); setStatus("ready"); }
    }, () => { if (active) setStatus("error"); });
    return () => { active = false; };
  }, [caseId, request]);
  useEffect(() => { if (example) onReady(example); }, [example, onReady]);

  const update = (patch: Partial<Draft>) => {
    revision.current += 1;
    setLoading(false);
    if (!removing.current) setUndo(null);
    removing.current = false;
    setDraft(current => ({ ...current, ...patch }));
  };
  const restore = () => {
    if (!undo) return;
    revision.current += 1;
    setLoading(false);
    setDraft(() => structuredClone(undo.draft));
    setNeedsJudge(true);
    setUndo(null);
  };
  const reset = () => {
    if (!draft || !example) return;
    const next = { ...practiceDraft(example), claim: structuredClone(draft.claim) };
    if (JSON.stringify(next) === snapshot) return;
    setUndo({ draft: structuredClone(draft), label: "처음 상태로 돌아갔습니다" });
    revision.current += 1;
    setLoading(false);
    setError(null);
    setDraft(() => next);
    setNeedsJudge(true);
  };
  const judge = async () => {
    if (!draft || loading) return;
    const started = ++revision.current;
    const requestedSnapshot = snapshot;
    const current = () => started === revision.current && requestedSnapshot === latestSnapshot.current;
    const network = structuredClone(toNetwork(draft));
    const flow = structuredClone(draft.flow);
    const claim = structuredClone(draft.claim);
    setLoading(true);
    setError(null);
    try {
      const result = await api.verify(network, flow, claim);
      if (!current()) return;
      setVerdict(result);
      setJudgedNetwork(network);
      setJudgedClaim(claim);
      setJudged(requestedSnapshot);
      setNeedsJudge(false);
    } catch (e) {
      if (!current()) return;
      setVerdict(null);
      setError(message(e));
    } finally {
      if (current()) { setLoading(false); focusJudgeResult(current); }
    }
  };
  const showAcl = (name: string, line: number | null) => {
    if (!draft || stale) return;
    const index = draft.acls.findLastIndex(acl => acl.name.trim() === name);
    const element = aclInputs.current.get(index);
    if (!element) return;
    const range = aclSelection(element.value, line);
    if (!range) return;
    if (configFold.current) configFold.current.open = true;
    element.focus({ preventScroll: true });
    element.setSelectionRange(range.start, range.end);
    scrollTo(element, "center");
  };

  return <div className="practice-page" onKeyDown={event => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!event.repeat && !loading) void judge();
    }
  }}>
    <nav className="practice-breadcrumb" aria-label="현재 위치"><a href="#/learn">학습실</a><span aria-hidden="true"> › </span><a href={`#/learn/${lesson.id}`}>{lesson.title}</a><span> › 실습</span></nav>
    <section className="practice-problem" aria-labelledby="practice-page-title">
      <div><p className="home-eyebrow">① 문제</p><h1 id="practice-page-title">{lesson.task.title}</h1>
        <p className="practice-question">{lesson.guessPrompt}</p><p className="hint below">이 실습에서 볼 것: {lesson.focus}</p></div>
      <PathStrip {...lesson.path} outside />
    </section>
    {!introSeen && <div className="practice-intro"><p>처음이라면: ① 문제를 읽고 ② 구성을 살펴본 뒤 ③ 예상을 고르고 ④ 판정하기로 NetProof 계산과 비교하세요. 정답은 들어 있지 않습니다.</p><button type="button" className="ghost small" onClick={() => { setIntroSeen(true); rememberPracticeIntro(); configTitle.current?.focus({ preventScroll: true }); }}>알겠어요</button></div>}
    {entry.kind === "loading" || (entry.kind === "ready" && !draft) ? <p role="status">실습 구성을 불러오는 중…</p> : entry.kind === "error" ? <div><p role="alert">실습 구성을 가져오지 못했습니다.</p><button type="button" className="ghost" onClick={() => setRequest(value => value + 1)}>다시 시도</button></div> : entry.kind === "missing" ? <p role="status">이 실습 구성은 현재 제공되지 않습니다.</p> : draft && <>
      {undo && <div className="undo-notice" role="status"><span>{undo.label}.</span><button type="button" className="ghost small" onClick={restore}>되돌리기</button><button type="button" className="ghost icon" aria-label="되돌리기 알림 닫기" onClick={() => setUndo(null)}>×</button></div>}
      <div className="layout">
        <section className="inputs practice-config" aria-labelledby="practice-config-title">
          <div className="panel-head"><h2 id="practice-config-title" tabIndex={-1} ref={configTitle}>② 구성 살펴보기</h2><button type="button" className="ghost small" onClick={reset}>처음 상태로</button></div>
          <details className="mobile-fold practice-config-fold" ref={configFold}>
            <summary>구성 펼쳐 보기 · 장비 {network!.devices.length}대 · ACL {Object.keys(network!.acls).length}개</summary>
            <div><h3 className="practice-check-title">확인할 것</h3><ul className="practice-checkpoints">{lesson.task.checkpoints.map(point => <li key={point}>{point}</li>)}</ul></div>
          <FlowForm flow={draft.flow} claim={draft.claim} endpoints={endpoints(draft)} hideClaim onFlow={flow => update({ flow })} onClaim={claim => update({ claim })} />
          <NetworkEditor devices={draft.devices} acls={draft.acls} onDevices={devices => update({ devices })} onAcls={acls => update({ acls })}
            onBeforeRemove={label => { setUndo({ draft: structuredClone(draft), label }); removing.current = true; }}
            aclInputRef={(index, element) => { if (element) aclInputs.current.set(index, element); else aclInputs.current.delete(index); }} />
          </details>
        </section>
        <div className="output">
          <section className="panel practice-prediction" aria-labelledby="practice-guess-title"><h2 id="practice-guess-title">③ 내 예상</h2>
            <PracticeGuessPicker caseId={caseId} guess={draft.claim.expected ?? undefined} onChange={expected => update({ claim: expected ? { expected, kind: "self", source: "", text: "" } : { ...EMPTY_CLAIM } })} />
            <p className="hint below">예상은 계산에 쓰지 않고 비교만 합니다.</p></section>
          <div className="judge"><button type="button" className="primary" onClick={judge} disabled={loading}>{loading ? "계산 중…" : stale ? "다시 판정하기" : "판정하기"}</button><span className="judge-shortcut">Ctrl+Enter / Cmd+Enter</span></div>
          <ResultPanel title="④ 판정과 근거" emptyHint="③에서 예상을 고르고 판정하기를 누르세요. 예상 없이도 판정할 수 있습니다." verdict={verdict} claim={judgedClaim ?? draft.claim} stale={stale} error={error} loading={loading} network={judgedNetwork} onShowAcl={showAcl} />
          <div className="practice-import"><p className="hint">ACL 점검·수정 후보·사례 저장은 판정기에서 할 수 있습니다.</p><button type="button" className="ghost" onClick={() => onImport(structuredClone(draft))}>판정기로 가져가기</button></div>
        </div>
      </div>
    </>}
  </div>;
}
