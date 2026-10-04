import { flowText, networkView } from "../caseView";
import type { Flow, Network } from "../types";

export function CaseNetwork({ network, flow }: { network: Network; flow: Flow }) {
  const view = networkView(network);
  return (
    <section className="panel case-network" aria-labelledby="network-title">
      <h2 id="network-title">네트워크 구성</h2>
      <p className="hint">저장된 입력을 그대로 보여 줍니다. 계산 결과는 아래 판정 칸에 있습니다.</p>
      <h3>확인할 통신</h3>
      <p className="case-flow">{flowText(flow)}</p>
      <details className="mobile-fold">
        <summary>구성 펼쳐 보기 · 장비 {view.devices.length}대 · ACL {view.acls.length}개</summary>
      <div className="case-devices">
        {view.devices.map((device, index) => (
          <article className="case-device" key={index}>
            <div className="panel-head"><h3>{device.id}</h3><span className="badge plain">{device.kind}</span></div>
            <ul>
              {device.interfaces.map((iface, i) => <li key={i}>
                <code>{iface.name} · {iface.ip}</code>
                {iface.aclIn && <span className="meta">들어올 때 ACL: {iface.aclIn}</span>}
                {iface.aclOut && <span className="meta">나갈 때 ACL: {iface.aclOut}</span>}
              </li>)}
            </ul>
            {device.gateway && <p>게이트웨이: <code>{device.gateway}</code></p>}
            {device.routes.length > 0 && <>
              <h3>경로</h3>
              <ul>{device.routes.map((route, i) => <li key={i}><code>{route.prefix} → {route.via}</code></li>)}</ul>
            </>}
          </article>
        ))}
      </div>
      <h3>ACL 원문</h3>
      {view.acls.length === 0 ? <p className="hint">ACL 없음</p> : view.acls.map((acl) => (
        <details className="case-raw-acl" key={acl.name}>
          <summary>ACL {acl.name} · {acl.lines.length}줄 · {acl.attachedTo.length ? `붙은 곳: ${acl.attachedTo.join(" · ")}` : "붙은 곳 없음"}</summary>
          <ol>{acl.lines.map(({ line, raw }) => <li key={line}><span>{line}</span><code>{raw}</code></li>)}</ol>
        </details>
      ))}
      </details>
    </section>
  );
}
