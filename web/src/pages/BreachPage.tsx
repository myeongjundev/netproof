import { useEffect, useMemo, useRef, useState } from "react";
import { api, message } from "../api";
import { EMPTY_CLAIM, toNetwork } from "../draft";
import { breachById, breachDraft, breachSpec, cellFlow, deviceStatus, guessText, keepText, layoutFlow, reach, reachMarks, serviceName, splitChanges, type Guess, type Reach } from "../breach";
import { NetworkEditor } from "../components/NetworkEditor";
import { NetworkDiagram } from "../components/NetworkDiagram";
import { ResultPanel } from "../components/ResultPanel";
import type { ChangeImpact, Draft, Flow, MatrixCell, Network, PolicyMatrix, Verdict } from "../types";

interface Props { id: string; draft?: Draft; setDraft: (update: (current: Draft) => Draft) => void; onImport: (draft: Draft) => void }

const GUESS_TEXT: Record<Guess, string> = { reach: "닿을 것 같다", safe: "안 닿을 것 같다" };
const STATUS_TEXT = { reach: "닿음", safe: "안 닿음", unknown: "판정 불가" } as const;
const CHANGE_TEXT = { opened: "새로 열림", closed: "새로 막힘", other: "그 밖의 변화" } as const;
const total = (result: Reach) => `${result.targets.length}곳 · 서비스 ${result.count}개`;

/** 침해 가정 실습(docs/breach-practice-design.md). 판정·분류는 엔진 응답을 그대로 쓰고 고르고 세기만 한다. */
export function BreachPage({ id, draft, setDraft, onImport }: Props) {
  const scenario = breachById(id)!;
  const [guesses, setGuesses] = useState<Record<string, Guess>>({});
  const [matrix, setMatrix] = useState<PolicyMatrix | null>(null);
  const [impact, setImpact] = useState<ChangeImpact | null>(null);
  const [startMatrix, setStartMatrix] = useState<PolicyMatrix | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkedSnapshot, setCheckedSnapshot] = useState<string | null>(null);
  const [needsCheck, setNeedsCheck] = useState(false);
  const [evidence, setEvidence] = useState<{ network: Network; flow: Flow; verdict: Verdict } | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [undo, setUndo] = useState<Draft | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  // 피해 범위 그림은 확인한 그때의 구성으로 그린다(고친 뒤에도 계산과 그림이 어긋나지 않게).
  const [checkedNetwork, setCheckedNetwork] = useState<Network | null>(null);
  const active = useRef(true), revision = useRef(0), pending = useRef(false), evidenceRevision = useRef(0);
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

  const invalidate = () => {
    revision.current++; evidenceRevision.current++; pending.current = false;
    setChecking(false); setEvidenceLoading(false); setNeedsCheck(true);
  };
  const update = (patch: Partial<Draft>) => { invalidate(); setUndo(null); setDraft((current) => ({ ...current, ...patch })); };
  const reset = () => {
    if (!draft) return;
    const next = breachDraft(scenario);
    if (JSON.stringify(next) === snapshot) return;
    invalidate(); setUndo(structuredClone(draft)); setDraft(() => next);
  };
  const check = async () => {
    if (!draft || pending.current) return;
    pending.current = true;
    const started = ++revision.current, requested = snapshot;
    const current = () => active.current && revision.current === started && latest.current === requested;
    const network = structuredClone(toNetwork(draft)), spec = breachSpec(scenario), first = toNetwork(breachDraft(scenario));
    evidenceRevision.current++; setEvidenceLoading(false); setEvidence(null); setEvidenceError(null);
    setChecking(true); setMatrix(null); setImpact(null); setMatrixError(null); setImpactError(null);
    setCheckedSnapshot(requested); setNeedsCheck(false); setCheckedNetwork(network);
    // 세 응답을 따로 보인다. 한쪽 실패가 다른 쪽을 지우지 않는다. 처음 구성은 입력과 무관해 한 번만 받는다.
    const matrixRequest = async () => {
      try { const result = await api.policyMatrix(network, spec); if (current()) setMatrix(result); }
      catch (error) { if (current()) setMatrixError(message(error)); }
    };
    const impactRequest = async () => {
      try { const result = await api.changeImpact(first, network, cellFlow(scenario, scenario.keep[0]), spec.services); if (current()) setImpact(result); }
      catch (error) { if (current()) setImpactError(message(error)); }
    };
    const startRequest = async () => {
      if (startMatrix) return;
      setStartError(null);
      try { const result = await api.policyMatrix(structuredClone(first), spec); if (active.current) setStartMatrix(result); }
      catch (error) { if (active.current) setStartError(message(error)); }
    };
    await Promise.all([matrixRequest(), impactRequest(), startRequest()]);
    if (current()) { pending.current = false; setChecking(false); }
  };
  const showEvidence = async (cell: Pick<MatrixCell, "src" | "dst" | "service">) => {
    if (!draft || stale || checking || checkedSnapshot === null) return;
    const started = ++evidenceRevision.current, requested = snapshot;
    const current = () => active.current && evidenceRevision.current === started && latest.current === requested;
    const network = structuredClone(toNetwork(draft)), flow = cellFlow(scenario, cell);
    setEvidenceLoading(true); setEvidence(null); setEvidenceError(null);
    try { const verdict = await api.verify(network, flow, { ...EMPTY_CLAIM }); if (current()) setEvidence({ network, flow, verdict }); }
    catch (error) { if (current()) setEvidenceError(message(error)); }
    finally { if (current()) setEvidenceLoading(false); }
  };

  const now = reach(matrix, scenario.breached), before = reach(startMatrix, scenario.breached);
  const targets = scenario.network.devices.filter((device) => device.kind === "host" && device.id !== scenario.breached).map((device) => device.id);
  const changes = splitChanges(impact, scenario.breached);
  const evidenceButton = (cell: MatrixCell, label: string, context: string, className = "ghost small") =>
    <button type="button" className={className} disabled={stale || checking} onClick={() => showEvidence(cell)}>{label}<span className="sr-only"> · {context}</span></button>;
  const keepCell = (keep: (typeof scenario.keep)[number]) => matrix?.status === "OK" ? matrix.cells.find((cell) => cell.src === keep.src && cell.dst === keep.dst && cell.service === keep.service) : undefined;

  return <div className="practice-page breach-practice">
    <nav className="practice-breadcrumb" aria-label="현재 위치"><a href="#/learn">학습실</a><span> › 침해 가정 실습</span></nav>
    <section className="practice-problem"><div><p className="home-eyebrow">합성 구성 · 침해 가정 실습</p><h1>{scenario.title}</h1>
      <p>{scenario.story}</p><p className="practice-question">{scenario.task}</p>
      <p className="hint below">닿음은 방화벽과 경로가 막지 않아 연결을 시작할 수 있다는 뜻입니다. 서비스가 실제로 열려 있는지, 취약한지는 계산하지 않습니다.</p>
      <p className="hint below">다른 화면에 다녀와도 남지만 새로고침하면 사라집니다.</p></div></section>

    <section className="panel breach-setting" aria-labelledby="breach-setting-title"><h2 id="breach-setting-title">장비와 지켜야 할 서비스</h2>
      <ul className="breach-roles">{Object.entries(scenario.roles).map(([device, role]) =>
        <li key={device}><strong>{device}</strong> · {role}{device === scenario.breached ? " · 뚫림" : ""}</li>)}</ul>
      <h3>지켜야 할 서비스</h3>
      <ul className="breach-roles">{scenario.keep.map((keep) => <li key={keep.label}><strong>{keep.label}</strong> · {keep.why}</li>)}</ul>
    </section>

    <fieldset className="panel breach-guess"><legend>{scenario.breached}에서 시작한 연결이 닿을 것 같은 장비</legend>
      <p className="hint">처음 구성에 대한 내 예상입니다. 고르지 않아도 확인할 수 있습니다.</p>
      <ul>{targets.map((device) => {
        const status = before && before.found ? deviceStatus(before, device) : undefined;
        return <li key={device}><strong>{device}</strong> <span className="hint">{scenario.roles[device]}</span>
          <div className="breach-guess-options">{(["reach", "safe"] as const).map((value) => <label key={value}>
            <input type="radio" name={`guess-${device}`} value={value} checked={guesses[device] === value}
              onChange={() => setGuesses((current) => ({ ...current, [device]: value }))} /> {GUESS_TEXT[value]}</label>)}</div>
          {(before || startError) && <p>내 예상 {guesses[device] ? GUESS_TEXT[guesses[device]] : "없음"} · 처음 구성 계산 {status ? STATUS_TEXT[status] : "없음"} · {guessText(guesses[device], status)}</p>}
        </li>;
      })}</ul>
    </fieldset>

    {!draft ? <p role="status">구성을 준비하는 중…</p> : <>
      <div className="judge"><button type="button" className="primary" disabled={checking} onClick={check}>{checking ? "계산 중…" : "확인하기"}</button></div>

      <section className="panel breach-reach" aria-labelledby="breach-reach-title" aria-busy={checking}><h2 id="breach-reach-title">피해 범위</h2>
        {stale && <p className="previous-result">이전 결과 · 입력이 바뀌었습니다. 다시 확인해 주세요.</p>}
        {checkedSnapshot === null && <p>확인 전 · 예상을 고른 뒤 확인하기를 누르세요(고르지 않아도 됩니다).</p>}
        {checking && !matrix && <p role="status">계산 중…</p>}
        {matrixError && <p role="alert" className="error">피해 범위: {matrixError}</p>}
        {startError && <p role="alert" className="error">처음 구성을 계산하지 못했습니다 · 다시 확인해 주세요. ({startError})</p>}
        {matrix && (matrix.status === "INVALID" || matrix.limit_exceeded) && <>
          <ul className="problems">{matrix.problems.map((problem, index) => <li key={index}>{problem}</li>)}</ul>
          <p className="hint">입력이 성립하지 않아 계산하지 못했습니다. 처음 구성으로 돌아가 다시 시작할 수 있습니다.</p></>}
        {now && !now.found && <p role="status">구성에서 뚫린 장비 {scenario.breached}을 찾을 수 없습니다. 이름을 되돌리거나 처음 구성으로 돌아가세요.</p>}
        {now && now.found && <>
          <p className="breach-total" role="status">{before ? `처음 구성 ${total(before)} → 지금 ${total(now)}` : `지금 ${total(now)}`}</p>
          {checkedNetwork && <NetworkDiagram network={checkedNetwork} flow={layoutFlow(checkedNetwork, scenario.breached)} trace={null} index={0}
            selectedDevice={selectedDevice} onSelectDevice={setSelectedDevice} marks={reachMarks(scenario.breached, now)} />}
          <p className="hint">서비스 단추를 누르면 그 연결이 왜 닿는지 아래 근거에서 봅니다.</p>
          <ul className="breach-targets">{now.others.map((device) => {
            const status = deviceStatus(now, device), cells = now.targets.find((target) => target.device === device)?.cells ?? [];
            return <li key={device} className={`breach-target ${status}`}><p><strong>{device}</strong> · {scenario.roles[device] ?? "새로 더한 장비"} · {STATUS_TEXT[status]}</p>
              {cells.length > 0 && <div className="breach-services">{cells.map((cell) => { const name = serviceName(scenario.services, cell.service);
                return <span key={`${cell.dst}/${cell.service}`}>{evidenceButton(cell, `${name} 근거 보기`, `${scenario.breached} → ${device} · ${name}`, "ghost small reach-service")}</span>; })}</div>}
            </li>;
          })}</ul>
          {now.undecided.length > 0 && <p className="hint">판정 불가 {now.undecided.length}건 — 안전하다는 뜻이 아닙니다. 근거에서 이유를 확인하세요.</p>}
        </>}
      </section>

      <section className="panel practice-config"><div className="panel-head"><h2>구성 고치기</h2><button type="button" className="ghost small" onClick={reset}>처음 구성으로</button></div>
        {undo && <p role="status">처음 구성으로 돌아갔습니다. <button type="button" className="ghost small" onClick={() => { invalidate(); setDraft(() => structuredClone(undo)); setUndo(null); }}>되돌리기</button></p>}
        <details className="mobile-fold"><summary>구성 펼쳐 보기</summary>
          <NetworkEditor devices={draft.devices} acls={draft.acls} onDevices={(devices) => update({ devices })} onAcls={(acls) => update({ acls })} />
        </details>
      </section>

      <section className="panel fix-results" aria-labelledby="breach-after-title"><h2 id="breach-after-title">지켜야 할 서비스와 바뀐 통신</h2>
        {stale && <p className="previous-result">이전 결과 · 다시 확인해 주세요.</p>}
        <ul>{scenario.keep.map((keep) => { const cell = keepCell(keep);
          return <li key={keep.label}><p>{keep.label} · {checkedSnapshot === null ? "확인 전" : matrix ? keepText(cell) : checking ? "계산 중…" : "결과 없음"}</p>
            {cell && evidenceButton(cell, "근거 보기", keep.label)}</li>; })}</ul>
        <h3>{scenario.breached}에서 시작하는 통신의 변화</h3>
        {impactError && <p role="alert" className="error">변경 영향: {impactError}</p>}
        {impact && (impact.status === "INVALID" || impact.limit_exceeded) ? <ul>{impact.problems.map((problem, index) => <li key={index}>{problem}</li>)}</ul>
          : impact ? <>
            {impact.totals.not_compared > 0 && <p>끝점이 바뀌어 비교하지 않은 통신 {impact.totals.not_compared}건</p>}
            {changes.attacker.length === 0 ? <p>처음 구성과 같습니다</p> : <ol className="change-list">{changes.attacker.map((change, index) =>
              <li key={index}>{CHANGE_TEXT[change.kind]} · {change.src_device} → {change.dst_device}({change.dst}) · {serviceName(scenario.services, change.service)}</li>)}</ol>}
            <h3>그 밖의 변화 {changes.others.length}건</h3>
            {changes.others.length > 0 && <ol className="change-list">{changes.others.map((change, index) => <li key={index}>
              <p>{CHANGE_TEXT[change.kind]} · {change.src_device}({change.src}) → {change.dst_device}({change.dst}) · {serviceName(scenario.services, change.service)}</p>
              <p className="hint">{change.after.reason}</p></li>)}</ol>}
          </> : <p>{checking ? "계산 중…" : checkedSnapshot === null ? "확인 전" : "결과 없음"}</p>}
        <p className="hint below">검사한 서비스와 호스트 쌍만 계산합니다. 실제 장비 결과가 아니며 검사하지 않은 통신은 알 수 없습니다.</p>
      </section>

      <ResultPanel title="왜 닿나요? · 근거" emptyHint="서비스나 지켜야 할 서비스의 근거 보기를 누르면 그 통신을 계산합니다." verdict={evidence?.verdict ?? null}
        network={evidence?.network} flow={evidence?.flow} claim={EMPTY_CLAIM} stale={stale} loading={evidenceLoading || checking} error={evidenceError} />
      <div className="practice-import"><button type="button" className="ghost" onClick={() => onImport(structuredClone(draft))}>판정기로 가져가기</button></div>
    </>}
  </div>;
}
