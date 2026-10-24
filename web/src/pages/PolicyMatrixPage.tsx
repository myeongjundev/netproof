import { useEffect, useMemo, useRef, useState } from "react";
import { api, message } from "../api";
import { ResultPanel } from "../components/ResultPanel";
import { EMPTY_CLAIM, toNetwork } from "../draft";
import { scrollTo } from "../motion";
import { defaultMatrixSpec, flowForCell, guardedRequest, MATRIX_STORAGE_KEY, matrixGrid, POLICY_TEXT,
  readMatrixSpec, setCellIntent } from "../policyMatrix";
import type { Draft, MatrixCell, MatrixService, MatrixSpec, Network, PolicyMatrix, Verdict } from "../types";
import { NetworkDiagram } from "../components/NetworkDiagram";
import { chainTargets, reachTargets, REACH_MEANING } from "../components/ReachTargets";
import { layoutFlow, reach, reachMarks } from "../breach";

type Checked = { matrix: PolicyMatrix; network: Network; signature: string };

export function PolicyMatrixPage({ draft }: { draft: Draft }) {
  const [spec, setSpec] = useState<MatrixSpec>(() => {
    try { return readMatrixSpec(localStorage.getItem(MATRIX_STORAGE_KEY)); }
    catch { return defaultMatrixSpec(); }
  });
  const [saved, setSaved] = useState(true);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState("");
  const [selected, setSelected] = useState<MatrixCell | null>(null);
  const [detail, setDetail] = useState<Verdict | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  // 침해 가정: 고른 장비에서 시작하는 칸만 엔진 결과에서 고른다(새 계산 없음).
  const [breached, setBreached] = useState("");
  const [diagramDevice, setDiagramDevice] = useState<string | null>(null);
  const [chained, setChained] = useState("");
  const [chainDevice, setChainDevice] = useState<string | null>(null);
  const network = useMemo(() => toNetwork(draft), [draft]);
  const signature = JSON.stringify({ network, spec });
  const current = useRef(signature);
  current.current = signature;
  const mounted = useRef(true);
  const detailSequence = useRef(0);
  const calculationSequence = useRef(0);
  const stale = checked !== null && checked.signature !== signature;
  const matrix = checked?.matrix;
  const grid = matrixGrid(matrix?.endpoints ?? [], matrix?.cells ?? [], service);
  const devices = [...new Set((matrix?.endpoints ?? []).map(endpoint => endpoint.device))];
  const breachedDevice = devices.includes(breached) ? breached : "";
  const breachReach = breachedDevice ? reach(matrix ?? null, breachedDevice) : null;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    try { localStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(spec)); setSaved(true); }
    catch { setSaved(false); }
  }, [spec]);

  const updateService = (index: number, patch: Partial<MatrixService>) => setSpec(s => ({
    ...s, services: s.services.map((value, i) => i === index ? { ...value, ...patch } : value),
  }));

  const calculate = async () => {
    const sequence = ++calculationSequence.current;
    const started = signature;
    const capturedNetwork = structuredClone(network);
    const capturedSpec = structuredClone(spec);
    setLoading(true); setError(null); setSelected(null); setDetail(null); setDetailError(null);
    ++detailSequence.current;
    setDetailLoading(false);
    await guardedRequest(() => api.policyMatrix(capturedNetwork, capturedSpec),
      () => mounted.current && current.current === started && calculationSequence.current === sequence,
      result => {
        setChecked({ matrix: result, network: capturedNetwork, signature: started });
        setService(value => result.services.some(s => s.key === value) ? value : result.services[0]?.key ?? "");
      }, e => setError(message(e)));
    if (mounted.current && calculationSequence.current === sequence) setLoading(false);
  };

  const openCell = async (cell: MatrixCell) => {
    if (!checked || stale || loading) return;
    const sequence = ++detailSequence.current;
    const started = signature;
    setSelected(cell); setDetail(null); setDetailError(null); setDetailLoading(true);
    requestAnimationFrame(() => {
      const element = document.getElementById("matrix-detail");
      if (element) scrollTo(element);
    });
    await guardedRequest(() => api.verify(checked.network, flowForCell(cell, checked.matrix.services, checked.matrix.mode),
      { ...EMPTY_CLAIM, expected: cell.expect }),
      () => mounted.current && current.current === started && detailSequence.current === sequence,
      value => setDetail(value), e => setDetailError(message(e)));
    if (mounted.current && detailSequence.current === sequence) setDetailLoading(false);
  };

  const chooseIntent = (expect: "PASS" | "DENY" | null) => {
    if (!selected) return;
    const intents = setCellIntent(spec.intents, selected, expect);
    if (intents.length > 500) { setError("의도는 최대 500개입니다"); return; }
    setSpec({ ...spec, intents });
  };
  const selectedIntent = selected ? spec.intents.find(i => i.src === selected.src && i.dst === selected.dst && i.service === selected.service) : null;
  const detailFlow = useMemo(() => selected && checked ? flowForCell(selected, checked.matrix.services, checked.matrix.mode) : null, [selected, checked]);
  const cellButton = (cell: MatrixCell) => <button type="button"
    className={`matrix-cell ${cell.result.toLowerCase()} policy-${cell.policy.toLowerCase()}`}
    disabled={stale || loading} onClick={() => void openCell(cell)}
    aria-label={`${cell.src} → ${cell.dst} ${cell.service}: ${cell.result}, ${POLICY_TEXT[cell.policy]}`}>
    <strong>{cell.result}</strong><span>{POLICY_TEXT[cell.policy]}</span>
  </button>;

  return <>
    <div className="page-head"><div><h1>정책 검증 · 도달성 매트릭스</h1>
      <p>판정기에 입력한 구성에서 호스트 간 통신을 계산합니다. 실제 패킷을 보내거나 서비스 실행 여부를 확인하지 않습니다.</p></div>
      <a href="#/" className="ghost-link">판정기에서 구성 편집</a></div>
    <section className="panel">
      <h2>검사할 서비스</h2>
      <p className="hint">끝점 24개 · 서비스 8개 · 검사 2,000건까지. 자기 자신과 같은 장비 내부 쌍은 모델 한계로 제외합니다.</p>
      <label className="matrix-mode">통신 모드<select value={spec.mode} onChange={e => setSpec({ ...spec, mode: e.target.value as MatrixSpec["mode"] })}>
        <option value="session">왕복 (session)</option><option value="one-way">한 방향 (one-way)</option>
      </select></label>
      <div className="matrix-services">{spec.services.map((item, i) => <div className="matrix-service" key={i}>
        <label>이름 {i + 1}<input value={item.label ?? ""} maxLength={80} onChange={e => updateService(i, { label: e.target.value })} /></label>
        <label>프로토콜 {i + 1}<select value={item.proto} onChange={e => updateService(i, { proto: e.target.value as MatrixService["proto"], dst_port: item.dst_port ?? 443, icmp: item.icmp ?? "echo" })}>
          <option value="tcp">TCP</option><option value="udp">UDP</option><option value="icmp">ICMP</option>
        </select></label>
        {item.proto === "icmp" ? <label>ICMP 종류 {i + 1}<input value={item.icmp ?? "echo"} onChange={e => updateService(i, { icmp: e.target.value })} /></label>
          : <label>목적지 포트 {i + 1}<input type="number" min={1} max={65535} value={item.dst_port ?? ""} onChange={e => updateService(i, { dst_port: Number(e.target.value) })} /></label>}
        <button type="button" className="ghost small" aria-label={`서비스 ${i + 1} 삭제`} disabled={spec.services.length === 1}
          onClick={() => setSpec({ ...spec, services: spec.services.filter((_, index) => index !== i) })}>삭제</button>
      </div>)}</div>
      <div className="row-actions"><button type="button" className="ghost" disabled={spec.services.length >= 8}
        onClick={() => setSpec({ ...spec, services: [...spec.services, { proto: "tcp", dst_port: 8080, label: "" }] })}>서비스 추가</button>
        <button type="button" className="primary" disabled={loading} onClick={() => void calculate()}>{loading ? "계산 중…" : "매트릭스 계산"}</button></div>
      <p className="hint below">의도는 결과 셀을 눌러 지정합니다. 서비스나 구성을 바꾼 뒤 남은 의도는 아래에서 지워 주세요. 의도는 사례·공유 링크에 포함되지 않습니다.</p>
      {!saved && <p role="status" className="hint">이 브라우저에 입력을 저장하지 못했습니다. 화면을 닫으면 사라질 수 있습니다.</p>}
      {error && <p role="alert" className="error">{error} <button type="button" className="ghost small" onClick={() => void calculate()} disabled={loading}>재시도</button></p>}
    </section>

    <details className="panel"><summary>저장한 의도 {spec.intents.length}개</summary>
      <p className="hint">PASS는 열려야 함, DENY는 막혀야 함입니다. 자동으로 정답을 만들지 않습니다. 이 브라우저에만 저장됩니다.</p>
      {spec.intents.length === 0 && <p>아직 의도를 지정하지 않았습니다.</p>}
      <ul className="matrix-intents">{spec.intents.map((intent, i) => <li key={i}><span>{intent.src} → {intent.dst} · {intent.service} · {intent.expect}</span>
        <button type="button" className="ghost small" onClick={() => setSpec({ ...spec, intents: spec.intents.filter((_, j) => i !== j) })}>의도 삭제</button></li>)}</ul>
    </details>

    {matrix && <section className="panel matrix-results" aria-busy={loading}>
      <h2>검증 결과</h2>
      {stale && <p role="status" className="stale">입력이 바뀌었습니다. 아래는 이전 결과입니다. 다시 계산하세요.</p>}
      {loading && <p role="status" className="hint">계산 중입니다. 이전 결과가 표시될 수 있습니다.</p>}
      {matrix.status === "INVALID" ? <ul className="problems">{matrix.problems.map((problem, i) => <li key={i}>{problem}</li>)}</ul> : <>
        <div className={`matrix-summary ${matrix.totals.EXPOSED > 0 ? "exposed" : ""}`}>
          <strong>노출 {matrix.totals.EXPOSED}건</strong><span>예상 밖 차단 {matrix.totals.BLOCKED}건 · 미판정 {matrix.totals.UNDECIDED}건 · 의도 일치 {matrix.totals.AGREE}건 · 의도 없음 {matrix.totals.NO_POLICY}건</span>
          <span>총 {matrix.totals.checks}건 · PASS {matrix.totals.PASS} · DENY {matrix.totals.DENY} · UNSUPPORTED {matrix.totals.UNSUPPORTED} · INVALID {matrix.totals.INVALID}</span>
        </div>
        <p className="hint">노출 0건만으로 안전을 보장하지 않습니다. 의도 없는 통신과 미판정 항목도 확인하세요. 계산 모드: {matrix.mode} · 엔진 {matrix.engine_version}</p>
        {matrix.totals.checks === 0 && <p>서로 다른 호스트 장비 두 개 이상의 인터페이스가 필요합니다. 판정기에서 구성을 편집하세요.</p>}
        {matrix.exposures.length > 0 && <details className="matrix-findings" open><summary>우선 확인할 통신 {matrix.exposures.length}건</summary>
          <ul>{matrix.exposures.map(cell => <li key={JSON.stringify([cell.src, cell.dst, cell.service])}>
            <span>{cell.src} → {cell.dst} · {cell.service}</span>{cellButton(cell)}</li>)}</ul></details>}
        <div className="matrix-breach">
          <h3>이 장비가 뚫리면</h3>
          <label className="matrix-mode">뚫렸다고 가정할 장비<select aria-label="뚫렸다고 가정할 장비" value={breachedDevice} onChange={e => { setBreached(e.target.value); setChained(""); }}>
            <option value="">고르지 않음</option>{devices.map(device => <option key={device} value={device}>{device}</option>)}
          </select></label>
          {breachReach && checked && <>
            <p className="breach-total">{breachedDevice}에서 시작하는 연결이 닿는 곳: {breachReach.targets.length}곳 · 서비스 {breachReach.count}개</p>
            <p className="hint">{REACH_MEANING} 계산 모드: {matrix.mode}. 서비스 단추를 누르면 아래 통신 상세에서 근거를 봅니다.</p>
            <NetworkDiagram network={checked.network} flow={layoutFlow(checked.network, breachedDevice)} trace={null} index={0}
              selectedDevice={diagramDevice} onSelectDevice={setDiagramDevice} marks={reachMarks(breachedDevice, breachReach)} />
            {reachTargets(breachReach, matrix.services, (cell, name, device) => <button type="button" className="ghost small reach-service"
              disabled={stale || loading} onClick={() => void openCell(cell)}>{name} 근거 보기<span className="sr-only"> · {breachedDevice} → {device} · {name}</span></button>)}
            {chainTargets({ breached: breachedDevice, first: breachReach, matrix, next: chained, onNext: setChained, services: matrix.services,
              service: (cell, name, device) => <button type="button" className="ghost small reach-service" disabled={stale || loading}
                onClick={() => void openCell(cell)}>{name} 근거 보기<span className="sr-only"> · {chained} → {device} · {name}</span></button>,
              diagram: (marks, device) => <NetworkDiagram network={checked.network} flow={layoutFlow(checked.network, device)} trace={null} index={0}
                selectedDevice={chainDevice} onSelectDevice={setChainDevice} marks={marks} /> })}
          </>}
        </div>
        <label className="matrix-mode">표시할 서비스<select value={service} onChange={e => {
          setService(e.target.value); setSelected(null); setDetail(null); setDetailLoading(false); ++detailSequence.current;
        }}>
          {matrix.services.map(s => <option key={s.key} value={s.key}>{s.label ? `${s.label} · ` : ""}{s.key}</option>)}
        </select></label>
        <p className="hint">행은 출발지, 열은 목적지입니다. 셀을 누르면 의도와 경로·ACL 증거를 확인합니다. “—”는 검사에서 제외한 쌍입니다.</p>
        <div className="matrix-scroll" tabIndex={0} role="region" aria-label="도달성 표 (가로 스크롤 가능)">
          <table className="matrix-table"><caption>{service} · 호스트 간 도달성</caption>
            <thead><tr><th scope="col">출발지 ↓ / 목적지 →</th>{matrix.endpoints.map(e => <th scope="col" key={e.ip}>{e.device} {e.interface}<br />{e.ip}</th>)}</tr></thead>
            <tbody>{matrix.endpoints.map((e, i) => <tr key={e.ip}><th scope="row">{e.device} {e.interface}<br />{e.ip}</th>
              {grid[i].map((cell, j) => <td key={matrix.endpoints[j].ip}>{cell ? cellButton(cell) : <span aria-label="같은 장비 쌍, 검사 제외">—</span>}</td>)}</tr>)}</tbody>
          </table></div>
      </>}
    </section>}

    {selected && checked && <section className="panel" id="matrix-detail">
      <h2>통신 상세 · 의도 지정</h2><p>{selected.src} → {selected.dst} · {selected.service}</p>
      <p className="hint">계산 당시 의도: {selected.expect ?? "없음"} · 현재 입력한 의도: {selectedIntent?.expect ?? "없음"}</p>
      <div className="row-actions"><button type="button" className="ghost" onClick={() => chooseIntent("PASS")}>열려야 함 (PASS)</button>
        <button type="button" className="ghost" onClick={() => chooseIntent("DENY")}>막혀야 함 (DENY)</button>
        <button type="button" className="ghost" onClick={() => chooseIntent(null)}>의도 없음</button></div>
      <p className="hint below">의도를 바꾸면 매트릭스를 다시 계산해야 반영됩니다.</p>
      <ResultPanel verdict={detail} claim={{ ...EMPTY_CLAIM, expected: selected.expect }} stale={stale} error={detailError}
        loading={detailLoading || loading} network={checked.network} flow={detailFlow} />
      {detailError && <button type="button" className="ghost" disabled={stale || detailLoading} onClick={() => void openCell(selected)}>상세 재시도</button>}
    </section>}
  </>;
}
