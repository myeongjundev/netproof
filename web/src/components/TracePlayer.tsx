import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { decisivePosition, observePlayback, stepText, TracePlayback } from "../tracePlayback";
import { traceMovements } from "../topologyView";
import type { Flow, Network, Verdict } from "../types";
import { aclEvidence } from "./AclEvidence";
import { NetworkDiagram } from "./NetworkDiagram";

export function TracePlayer({ network, flow, verdict, busy, engineVersion, onShowAcl }: {
  network: Network; flow: Flow; verdict: Verdict; busy: boolean; engineVersion?: string;
  onShowAcl?: (acl: string, line: number | null) => void;
}) {
  const player = useMemo(() => new TracePlayback(verdict), [verdict, network, flow]);
  const state = useSyncExternalStore(player.subscribe, player.getSnapshot, player.getSnapshot);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => observePlayback(player, document, window.matchMedia("(prefers-reduced-motion: reduce)")), [player]);
  useEffect(() => { player.setBusy(busy); }, [player, busy]);
  const trace = player.trace(), hops = trace?.hops ?? [], hop = hops[state.index];
  const decisive = decisivePosition(verdict);
  const movements = traceMovements(network, trace, hops.length - 1);
  const hasForward = !!verdict.forward?.hops.length, hasReturn = !!verdict.return?.hops.length;
  const disabled = busy || state.blocked;
  const selectedEvidence = hop && (hop.step === "acl_in" || hop.step === "acl_out") ? aclEvidence({ ...verdict, forward: { delivered: false, reason: "", hops: [hop] }, return: null }, network.acls)[0] : null;
  const select = (index: number) => {
    if (disabled) return;
    player.select(index);
    const selected = hops[index];
    setAnnouncement(`${index + 1} / ${hops.length} 단계 · ${selected.device} · ${stepText(selected.step)}`);
  };
  return <section className="trace-player" aria-label="구성도와 경로 재생">
    <h3>구성도 · 경로 재생</h3>
    {engineVersion && <p className="hint">저장된 판정 · 엔진 {engineVersion}</p>}
    <NetworkDiagram network={network} flow={flow} trace={trace} index={state.index} selectedDevice={state.selectedDevice}
      onSelectDevice={id => { player.selectDevice(id); setAnnouncement(`${id} 장비 선택`); }} />
    {hasForward || hasReturn ? <div className="trace-controls" aria-label="경로 방향">
      {(["forward", "return"] as const).map(direction => <button type="button" key={direction} className="ghost small"
        aria-pressed={state.direction === direction} disabled={disabled || !(direction === "forward" ? hasForward : hasReturn)}
        onClick={() => { player.direction(direction); setAnnouncement(direction === "forward" ? "정방향 선택" : "복귀 선택"); }}>{direction === "forward" ? "정방향" : "복귀"}</button>)}
      {!hasForward ? <span>재생할 경로 없음</span> : !hasReturn && <span>{flow.mode === "one-way" ? "one-way 통신: 복귀 경로를 계산하지 않음" : verdict.forward?.delivered === false ? "정방향에서 멈춰 복귀 경로 없음" : "엔진이 복귀 경로를 제공하지 않음"}</span>}
    </div> : <p className="hint below">재생할 경로 없음</p>}
    <div className="trace-controls" aria-label="단계 재생">
      <button type="button" className="ghost small" disabled={disabled || !hop || state.index === 0} onClick={() => select(state.index - 1)}>이전</button>
      <button type="button" className="ghost small" disabled={disabled || !hop || state.reduced}
        onClick={() => { player.play(); setAnnouncement(state.playing ? "일시정지" : "재생 시작"); }}>{state.playing ? "일시정지" : "재생"}</button>
      <button type="button" className="ghost small" disabled={disabled || !hop || state.index === hops.length - 1} onClick={() => select(state.index + 1)}>다음</button>
      <span>{hop ? `${state.index + 1} / ${hops.length} 단계` : "0 단계"}</span>
    </div>
    {state.reduced && <p className="hint">동작 줄이기 설정: 자동 재생 대신 이전·다음으로 이동하세요.</p>}
    <p className="sr-only" aria-live="polite">{announcement}</p>
    {hop && <div className={`trace-step-detail ${hop.result}`} aria-label="선택 단계">
      <strong>{hop.device} · {stepText(hop.step)} · {hop.result === "drop" ? "차단" : "단계 통과"}</strong>
      {decisive?.direction === state.direction && decisive.index === state.index && <p>전체 판정을 결정한 단계</p>}
      <p>{hop.detail}</p>
      {(hop.in_if || hop.out_if) && <p>{[hop.in_if && `들어옴 ${hop.in_if}`, hop.out_if && `나감 ${hop.out_if}`].filter(Boolean).join(" · ")}</p>}
      {hop.rule && <code className="rule">{hop.rule}</code>}
      {selectedEvidence && onShowAcl && <button type="button" className="ghost small" disabled={disabled}
        onClick={() => onShowAcl(selectedEvidence.acl, selectedEvidence.ruleLine)}>선택 규칙 입력에서 보기</button>}
    </div>}
    {verdict.decisive && !decisive && <p className="hint">엔진 판정 근거: {verdict.decisive.device} · {stepText(verdict.decisive.step)} · {verdict.decisive.detail}</p>}
    {hops.length > 0 && <div className="path">
      <h4>{state.direction === "forward" ? "가는 길" : "돌아오는 길"} · 전체 단계 목록</h4>
      <ol>{hops.map((hop, index) => <li key={index} className={`hop ${hop.result}${decisive?.direction === state.direction && decisive.index === index ? " decisive" : ""}`}>
        <span className="mark" aria-hidden="true">{hop.result === "drop" ? "✗" : "✓"}</span>
        <div><button type="button" className="ghost small trace-step-button" disabled={disabled} aria-current={index === state.index ? "step" : undefined} onClick={() => select(index)}>
          {index + 1}. {hop.device} · {stepText(hop.step)} · {hop.result === "drop" ? "차단" : "통과"}
        </button><p>{hop.detail}</p>{hop.rule && <code className="rule">{hop.rule}</code>}
          {movements.some(move => move.index === index && !move.memberships.length) && <p className="hint below">단계에 기록된 이동(구성도 연결 정보 없음)</p>}
        </div>
      </li>)}</ol>
      {trace?.delivered === false && trace.target && <p className="hint below">목적지 {trace.target.device} {trace.target.interface}({trace.target.ip})에는 도달하지 못했습니다</p>}
    </div>}
  </section>;
}
