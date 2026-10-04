import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, message } from "../api";
import { FlowForm } from "../components/FlowForm";
import { NetworkEditor } from "../components/NetworkEditor";
import { ResultPanel } from "../components/ResultPanel";
import { AclAudit } from "../components/AclAudit";
import { SuggestPanel } from "../components/SuggestPanel";
import type { Suggestion, SuggestionTarget } from "../types";
import { aclSelection } from "../components/AclEvidence";
import { blankDraft, caseJson, endpoints, fromCase, toNetwork } from "../draft";
import { practiceTasks, type PracticeTask } from "../practice";
import { lessonByCaseId, practiceDraft, practiceEntry, practiceStartLabel, type ExampleStatus, type PracticeGuess } from "../learning";
import { go } from "../router";
import { decodeShare, encodeShare } from "../share";
import type { CaseItem, Claim, Draft, Network, User, Verdict } from "../types";
import type { AclAudit as AuditResult } from "../types";

interface Props {
  user: User | null;
  draft: Draft;
  setDraft: (update: (current: Draft) => Draft) => void;
  share?: string;
  practiceId?: string;
  practiceGuess?: PracticeGuess;
  onPracticeLoaded?: () => void;
  titleHint?: string;
}

export function JudgePage({ user, draft, setDraft, share, practiceId, practiceGuess, onPracticeLoaded, titleHint }: Props) {
  const [examples, setExamples] = useState<CaseItem[]>([]);
  const [examplesStatus, setExamplesStatus] = useState<ExampleStatus>("loading");
  const [examplesRequest, setExamplesRequest] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditRequested, setAuditRequested] = useState(false);
  const [judgedNetwork, setJudgedNetwork] = useState<Network | null>(null);
  const [judgedClaim, setJudgedClaim] = useState<Claim | null>(null);
  const aclInputs = useRef(new Map<number, HTMLTextAreaElement>());
  const [judged, setJudged] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pasted, setPasted] = useState("");
  const [title, setTitle] = useState("");
  const [task, setTask] = useState<PracticeTask | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [shareLink, setShareLink] = useState("");
  const revision = useRef(0);
  const suggestRevision = useRef(0);
  const [suggestTarget, setSuggestTarget] = useState<SuggestionTarget | null>(null);
  const [suggestResult, setSuggestResult] = useState<Suggestion | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [undo, setUndo] = useState<{ draft: Draft; label: string; task: PracticeTask | null; title: string } | null>(null);
  const removing = useRef(false);
  const draftNow = useRef(draft);
  draftNow.current = draft;
  const contextNow = useRef({ task, title });
  contextNow.current = { task, title };
  const [needsJudge, setNeedsJudge] = useState(false);

  useEffect(() => {
    let active = true;
    setExamples([]);
    setExamplesStatus("loading");
    api.examples().then((items) => {
      if (active) { setExamples(items); setExamplesStatus("ready"); }
    }, () => {
      if (active) { setExamples([]); setExamplesStatus("error"); }
    });
    return () => { active = false; };
  }, [practiceId, examplesRequest]);

  useEffect(() => {
    if (titleHint) setTitle(titleHint);
  }, [titleHint]);

  const tasks = useMemo(() => practiceTasks(examples), [examples]);
  const entryLesson = practiceId ? lessonByCaseId(practiceId) : undefined;
  const entry = practiceId ? practiceEntry(practiceId, examples, examplesStatus) : null;

  const snapshot = useMemo(() => JSON.stringify(draft), [draft]);
  const latestSnapshot = useRef(snapshot);
  latestSnapshot.current = snapshot;
  // An edit followed by an undo still invalidates an in-flight response.
  const previousSnapshot = useRef(snapshot);
  useEffect(() => {
    if (previousSnapshot.current !== snapshot) {
      previousSnapshot.current = snapshot;
      suggestRevision.current += 1;
      setSuggestLoading(false);
    }
  }, [snapshot]);
  const update = (patch: Partial<Draft>) => {
    if (!removing.current) setUndo(null);
    removing.current = false;
    setDraft((current) => ({ ...current, ...patch }));
  };
  const stale = judged !== null && (needsJudge || judged !== snapshot);

  const remember = (label: string) => {
    setUndo({ draft: structuredClone(draftNow.current), label, ...contextNow.current });
  };
  const restore = () => {
    if (!undo) return;
    revision.current += 1;
    suggestRevision.current += 1;
    setLoading(false);
    setSuggestLoading(false);
    setDraft(() => structuredClone(undo.draft));
    setTask(undo.task);
    setTitle(undo.title);
    setNeedsJudge(true);
    setUndo(null);
  };

  const load = useCallback((next: Draft, label?: string) => {
    const current = draftNow.current;
    const input = (item: Draft) => JSON.stringify({ network: toNetwork(item), flow: item.flow, claim: item.claim });
    const hasInput = current.devices.length > 0 || current.acls.length > 0 || !!current.flow.src || !!current.flow.dst || !!current.claim.expected;
    setUndo(label && hasInput && input(current) !== input(next) ? { draft: structuredClone(current), label, ...contextNow.current } : null);
    revision.current += 1;
    suggestRevision.current += 1;
    setSuggestTarget(null);
    setSuggestResult(null);
    setSuggestError(null);
    setSuggestLoading(false);
    setDraft(() => next);
    if (!label) {
      setVerdict(null);
      setAudit(null);
      setJudgedNetwork(null);
      setJudgedClaim(null);
      setJudged(null);
    }
    setAuditError(null);
    if (!label) setAuditRequested(false);
    setLoading(false);
    setError(null);
    setTask(null);
    setTitle("");
    setSaveError(null);
  }, [setDraft]);

  const startPractice = (nextTask: PracticeTask, example: CaseItem) => {
    load(practiceDraft(example, nextTask.case_id === practiceId ? practiceGuess : undefined), practiceStartLabel(nextTask));
    setTask(nextTask);
    setTitle(nextTask.title);
    onPracticeLoaded?.();
    if (practiceId) {
      window.history.replaceState(null, "", "#/");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  };

  useEffect(() => {
    if (share === undefined) return;
    let active = true;
    decodeShare(share).then((item) => {
      if (!active) return;
      load(fromCase(item));
      window.history.replaceState(null, "", "#/");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }).catch((error) => {
      if (active) setError(message(error));
    });
    return () => { active = false; };
  }, [share, load]);

  const copyLink = async () => {
    setSharing(true);
    setShareNotice("");
    setShareLink("");
    try {
      const payload = await encodeShare(draft);
      const url = new URL(window.location.href);
      url.hash = `/s/${payload}`;
      try {
        await navigator.clipboard.writeText(url.href);
        setShareNotice("링크를 복사했습니다");
      } catch {
        setShareLink(url.href);
        setShareNotice("아래 링크를 직접 복사해 주세요");
      }
    } catch (error) {
      setError(message(error));
    } finally {
      setSharing(false);
    }
  };

  const judge = async () => {
    if (loading) return;
    const started = ++revision.current;
    suggestRevision.current += 1;
    setSuggestTarget(null);
    setSuggestResult(null);
    setSuggestError(null);
    setSuggestLoading(false);
    setLoading(true);
    setError(null);
    try {
      const network = structuredClone(toNetwork(draft));
      const hasAcls = Object.keys(network.acls).length > 0;
      setAuditRequested(hasAcls);
      setAuditError(null);
      const [verification, inspection] = await Promise.allSettled([
        api.verify(network, draft.flow, draft.claim),
        hasAcls ? api.aclAudit(network) : Promise.resolve(null),
      ]);
      if (started !== revision.current) return;
      setVerdict(verification.status === "fulfilled" ? verification.value : null);
      setError(verification.status === "rejected" ? message(verification.reason) : null);
      setAudit(inspection.status === "fulfilled" ? inspection.value : null);
      setAuditError(inspection.status === "rejected" ? message(inspection.reason) : null);
      setJudgedNetwork(network);
      setJudgedClaim(structuredClone(draft.claim));
      setJudged(snapshot);
      setNeedsJudge(false);
      // 한 줄 배치(휴대폰)에서는 결과가 폼 아래에 있어 눌러도 안 보인다. 결과로 옮겨 준다.
      if (window.matchMedia("(max-width: 900px)").matches) {
        requestAnimationFrame(() => document.getElementById("result-title")?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } catch (e) {
      if (started === revision.current) setError(message(e));
    } finally {
      if (started === revision.current) setLoading(false);
    }
  };

  const chooseSuggestTarget = (target: SuggestionTarget) => {
    suggestRevision.current += 1;
    setSuggestTarget(target);
    setSuggestResult(null);
    setSuggestError(null);
    setSuggestLoading(false);
  };

  const calculateSuggestion = async () => {
    if (stale || loading || !judgedNetwork || !suggestTarget) return;
    const started = ++suggestRevision.current;
    const requestedSnapshot = snapshot;
    setSuggestLoading(true);
    setSuggestError(null);
    const current = () => started === suggestRevision.current && latestSnapshot.current === requestedSnapshot;
    try {
      const result = await api.suggest(structuredClone(judgedNetwork), structuredClone(draft.flow), suggestTarget);
      if (current()) setSuggestResult(result);
    } catch (error) {
      if (current()) setSuggestError(message(error));
    } finally {
      if (current()) setSuggestLoading(false);
    }
  };

  const showAcl = (name: string, line: number | null) => {
    if (stale) return;
    // 이름이 중복되면 toNetwork와 같이 마지막 ACL을 사용한다.
    const index = draft.acls.findLastIndex((acl) => acl.name.trim() === name);
    const element = aclInputs.current.get(index);
    if (!element) return;
    const range = aclSelection(element.value, line);
    if (!range) return;
    element.focus({ preventScroll: true });
    element.setSelectionRange(range.start, range.end);
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const save = async () => {
    setSaveError(null);
    try {
      const saved = await api.createCase(title.trim(), toNetwork(draft), draft.flow, draft.claim);
      setTitle("");
      go(`/cases/${saved.id}`);
    } catch (e) {
      setSaveError(message(e));
    }
  };

  const importPasted = () => {
    try {
      const item = JSON.parse(pasted) as CaseItem;
      if (!item.network || !item.flow) throw new Error();
      load(fromCase(item), "JSON을 불러왔습니다");
      setPasted("");
    } catch {
      setError("붙여 넣은 JSON에 network와 flow가 있어야 합니다");
    }
  };

  return (
    <div className="judge-page" onKeyDown={(event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (!event.repeat && !loading) void judge();
      }
    }}>
      <h1 className="sr-only">판정기</h1>
      {entryLesson && entry && <section className="panel practice-entry" aria-labelledby="practice-entry-title">
        <p className="home-eyebrow">연습용 네트워크 실습</p>
        <h2 id="practice-entry-title">{entryLesson.title}</h2><p>{entryLesson.task.question}</p>
        {practiceGuess && <p className="practice-guess">내 예상: {practiceGuess === "PASS" ? "통과" : "막힘"}</p>}
        <p className="hint">지금 입력은 아직 바꾸지 않았습니다. 실습 구성은 버튼을 눌러 불러옵니다.</p>
        {entry.kind === "loading" && <><p role="status">실습 구성을 불러오는 중…</p><button type="button" className="ghost" disabled>구성 불러오기</button></>}
        {entry.kind === "error" && <><p role="alert">실습 구성을 가져오지 못했습니다.</p><button type="button" className="ghost" onClick={() => setExamplesRequest(value => value + 1)}>다시 시도</button></>}
        {entry.kind === "missing" && <p role="status">이 실습 구성은 현재 제공되지 않습니다.</p>}
        {entry.kind === "ready" && <button type="button" className="primary" onClick={() => startPractice(entryLesson.task, entry.example)}>구성 불러오기</button>}
        <a href="#/">판정기로 이동</a>
      </section>}
      <div className="page-head">
        <p>AI나 내가 예상한 “이 통신은 된다/안 된다”를 라우팅·ACL 계산으로 확인하고, 막힌 규칙을 보여 줍니다. 판정은 로그인 없이 됩니다.</p>
        <ol className="case-start" aria-label="시작 안내">
          <li>예시를 불러오거나 처음 구성에서 장비·ACL을 적습니다.</li>
          <li>확인할 통신과 받은 답(AI 답이나 내 예상)을 적습니다.</li>
          <li>판정하기를 누르면 경로와 막힌 규칙을 근거로 보여 줍니다.</li>
        </ol>
        {examples.length > 0 && <p className="case-example-caption">예시 불러오기</p>}
        <div className="examples" aria-label="예시 불러오기">
          {examples.map((item) => (
            <button key={item.id} type="button" className="ghost small" onClick={() => load(fromCase(item), `예시 ${item.id.replace("synthetic-", "")}을 불러왔습니다`)}>
              예시 {item.id.replace("synthetic-", "")}
              {lessonByCaseId(item.id)?.title ? ` · ${lessonByCaseId(item.id)?.title}` : ""}
            </button>
          ))}
          <button type="button" className="ghost small" onClick={() => load(blankDraft(), "처음 구성을 불러왔습니다")}>
            처음 구성
          </button>
        </div>
        {tasks.length > 0 && (
          <details className="practice-list">
            <summary>실습 과제</summary>
            <p className="hint">합성 구성으로 경로와 ACL을 직접 살펴보세요.</p>
            <div className="examples">
              {tasks.map(({ task: nextTask, example }) => (
                <button key={nextTask.case_id} type="button" className="ghost small" onClick={() => startPractice(nextTask, example)}>{nextTask.title} · 시작</button>
              ))}
            </div>
          </details>
        )}
      </div>

      {undo && <div className="undo-notice" role="status">
        <span>{undo.label}.</span>
        <button type="button" className="ghost small" onClick={restore}>되돌리기</button>
        <button type="button" className="ghost icon" aria-label="되돌리기 알림 닫기" onClick={() => setUndo(null)}>×</button>
      </div>}

      {task && (
        <section className="panel practice-guide" aria-labelledby="practice-title">
          <div className="panel-head">
            <h2 id="practice-title">{task.title}</h2>
            <button type="button" className="ghost small" onClick={() => setTask(null)}>그만하기</button>
          </div>
          <p>{task.question}</p>
          <h3>확인할 점</h3>
          <ul>{task.checkpoints.map((point) => <li key={point}>{point}</li>)}</ul>
          <p className="hint">정답은 들어 있지 않습니다. 직접 판정하고, 받은 답이나 내 예상을 적어 비교하세요.</p>
        </section>
      )}

      <FlowForm
        flow={draft.flow}
        claim={draft.claim}
        endpoints={endpoints(draft)}
        onFlow={(flow) => update({ flow })}
        onClaim={(claim) => update({ claim })}
      />

      <div>
        <a className="ghost-link" href="#/matrix">정책 검증으로</a>{" "}
        <button type="button" className="ghost" onClick={copyLink} disabled={sharing}>
          {sharing ? "링크 만드는 중…" : "링크 복사"}
        </button>
        <p className="hint below">링크에 지금 입력(받은 답 메모 포함)이 그대로 들어 있습니다</p>
        <p role="status" aria-live="polite">{shareNotice}</p>
        {shareLink && <label className="block"><span>직접 복사할 링크</span>
          <input readOnly value={shareLink} onFocus={(event) => event.currentTarget.select()} />
        </label>}
      </div>

      <div className="layout">
        <div className="inputs">
          <NetworkEditor devices={draft.devices} acls={draft.acls} onDevices={(devices) => update({ devices })} onAcls={(acls) => update({ acls })}
            onBeforeRemove={(label) => { remember(label); removing.current = true; }}
            aclInputRef={(index, element) => { if (element) aclInputs.current.set(index, element); else aclInputs.current.delete(index); }} />
          <details className="panel flat json">
            <summary>사례 JSON 저장·불러오기</summary>
            <p className="hint">사례 원장에 옮길 때 씁니다.</p>
            <label className="block">
              <span>지금 입력</span>
              <textarea readOnly rows={8} value={caseJson(draft)} spellCheck={false} />
            </label>
            <label className="block">
              <span>JSON 붙여 넣기</span>
              <textarea rows={4} value={pasted} spellCheck={false} onChange={(e) => { setUndo(null); setPasted(e.target.value); }} />
            </label>
            <button type="button" className="ghost small" onClick={importPasted} disabled={!pasted.trim()}>
              불러오기
            </button>
          </details>
        </div>
        <aside className="output">
          {/* 넓은 화면은 본문과 함께 흐르고, 휴대폰에서는 화면 아래에 붙는다. */}
          <div className="judge">
            <button type="button" className="primary" onClick={judge} disabled={loading}>
              {loading ? "계산 중…" : stale ? "다시 판정하기" : "판정하기"}
            </button>
            <span className="judge-shortcut">Ctrl+Enter / Cmd+Enter</span>
          </div>
          <div className="follow">
            <ResultPanel verdict={verdict} claim={judgedClaim ?? draft.claim} stale={stale} error={error} loading={loading} network={judgedNetwork} onShowAcl={showAcl} />
            {auditRequested && Object.keys(toNetwork(draft).acls).length > 0 && <AclAudit result={audit} error={auditError} stale={stale} loading={loading} onShow={showAcl} />}
            {!loading && verdict && (verdict.result === "PASS" || verdict.result === "DENY") && (!stale || suggestResult !== null) &&
              <SuggestPanel target={suggestTarget} result={suggestResult} error={suggestError} loading={suggestLoading} stale={stale}
                onTarget={chooseSuggestTarget} onCalculate={calculateSuggestion} onShow={showAcl} />}
            {verdict && !stale && (
              <section className="panel save" aria-labelledby="save-title">
                <h2 id="save-title">사례로 저장</h2>
                {user ? (
                  <>
                    <p className="hint">게시판에 올리면 실제 실습 결과를 적고 검토자의 확인을 받을 수 있습니다. 판정은 서버가 다시 계산해 저장합니다.</p>
                    <div className="save-row">
                      <label>
                        <span className="sr-only">사례 제목</span>
                        <input value={title} maxLength={80} placeholder="예: R2 복귀 경로 없음 · ping" onChange={(e) => { setUndo(null); setTitle(e.target.value); }} />
                      </label>
                      <button type="button" className="secondary" onClick={save} disabled={!title.trim()}>
                        저장
                      </button>
                    </div>
                    {saveError && <p className="error">{saveError}</p>}
                  </>
                ) : (
                  <p className="hint">
                    로그인하면 이 판정을 사례 게시판에 올릴 수 있습니다. 지금 입력은 그대로 남습니다.{" "}
                    <a href="#/login">로그인</a>
                  </p>
                )}
              </section>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
