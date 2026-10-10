import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { diagramShape, topologyView, traceMovements } from "../topologyView";
import type { Flow, Network, Trace } from "../types";

interface Edge { key: string; x1: number; y1: number; x2: number; y2: number; active: boolean }
export function NetworkDiagram({ network, flow, trace, index, selectedDevice, onSelectDevice }: {
  network: Network; flow: Flow; trace: Trace | null; index: number; selectedDevice: string | null;
  onSelectDevice: (id: string) => void;
}) {
  const view = useMemo(() => topologyView(network, flow, trace), [network, flow, trace]);
  const canvas = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState({ width: 0, height: 0, edges: [] as Edge[] });
  const [horizontal, setHorizontal] = useState(false);
  const hop = trace?.hops[index];
  const active = useMemo(() => new Set(traceMovements(network, trace, index).flatMap(move => move.memberships)), [network, trace, index]);
  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      setHorizontal(box.width >= Math.max(550, view.layers.length * 100));
      const positions = new Map([...element.querySelectorAll<HTMLElement>("[data-topology-key]")].map(node => {
        const rect = node.getBoundingClientRect();
        return [node.dataset.topologyKey!, { x: rect.left - box.left + rect.width / 2, y: rect.top - box.top + rect.height / 2 }];
      }));
      const edges = view.links.flatMap(link => {
        const device = positions.get(`device:${link.device}`), subnet = positions.get(`subnet:${link.subnet}`);
        return device && subnet ? [{ key: link.key, x1: device.x, y1: device.y, x2: subnet.x, y2: subnet.y, active: active.has(link.key) }] : [];
      });
      setGeometry({ width: box.width, height: box.height, edges });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    for (const node of element.querySelectorAll("[data-topology-key]")) observer.observe(node);
    return () => observer.disconnect();
  }, [view, active, horizontal, hop, selectedDevice]);
  const selected = diagramShape(network) ? network.devices.find(device => device.id === selectedDevice) : null;
  return <div className="network-diagram">
    {view.mode !== "full" && <p className="hint">{view.mode === "path" ? "큰 구성: 경로 장비만 표시" : view.mode === "invalid" ? "장비 식별 정보가 겹치거나 비어 있거나 그림에 필요한 형식이 없어 구성 원문을 표시합니다." : "큰 구성: 그림 대신 경로 목록과 전체 구성 원문을 표시합니다."}</p>}
    {view.nodes.length > 0 && <div ref={canvas} className={`topology-canvas ${horizontal ? "horizontal" : "vertical"}`}>
      {geometry.width > 0 && <svg className="topology-lines" width={geometry.width} height={geometry.height} viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">
        {geometry.edges.map(edge => <line key={edge.key} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} className={edge.active ? "travelled" : ""} />)}
      </svg>}
      {view.layers.map((layer, layerIndex) => <div className="topology-layer" key={layerIndex}>
        {layer.map(key => {
          const node = view.nodes.find(node => node.key === key)!;
          if (!node.device) return <div className="topology-subnet" key={key} data-topology-key={key}>{node.label}</div>;
          const current = hop?.device === node.device.id;
          const unreached = trace?.delivered === false && trace.target?.device === node.device.id && !trace.hops.some(hop => hop.device === node.device!.id && hop.step === "deliver" && hop.result === "ok");
          return <button type="button" key={key} data-topology-key={key} aria-label={`${node.label} 장비 보기`}
            aria-pressed={selectedDevice === node.device.id} className={`topology-device${current ? " current" : ""}${current && hop.result === "drop" ? " drop" : ""}`}
            onClick={() => onSelectDevice(node.device!.id)}>
            <strong>{node.label}</strong><span>{node.device.kind === "host" ? "호스트" : node.device.kind === "router" ? "라우터" : node.device.kind}</span>
            <span className="topology-position">{current ? hop.result === "drop" ? "× 차단" : hop.step === "deliver" ? "✓ 도착" : `● ${index + 1}단계` : unreached ? "도달 못 함" : ""}</span>
          </button>;
        })}
      </div>)}
    </div>}
    <p className="hint below">선은 입력 주소 구간의 소속을 뜻합니다. 실제 배선 그림이 아닙니다.</p>
    {selected && <div className="trace-device-detail" aria-label="선택 장비의 구성">
      <strong>{selected.id} · 인터페이스</strong>
      <ul>{selected.interfaces.map((iface, i) => <li key={i}>{iface.name} · {iface.ip}
        {iface.acl_in && ` · 입력 ACL ${iface.acl_in}`}{iface.acl_out && ` · 출력 ACL ${iface.acl_out}`}</li>)}</ul>
    </div>}
    <details className="topology-inventory"><summary>전체 구성 원문</summary><pre>{JSON.stringify(network, null, 2)}</pre></details>
  </div>;
}
