import type { Claim, Flow, Mode, Proto } from "../types";

interface Props {
  flow: Flow;
  claim: Claim;
  endpoints: { ip: string; label: string }[];
  onFlow: (flow: Flow) => void;
  onClaim: (claim: Claim) => void;
}

export function FlowForm({ flow, claim, endpoints, onFlow, onClaim }: Props) {
  const usesPort = flow.proto !== "icmp";
  return (
    <>
      <section className="panel" aria-labelledby="flow-title">
        <h2 id="flow-title">
          <span className="step">2</span> 확인할 통신
        </h2>
        <datalist id="endpoints">
          {endpoints.map((item) => (
            <option key={`${item.label}-${item.ip}`} value={item.ip}>
              {item.label}
            </option>
          ))}
        </datalist>
        <div className="grid">
          <label>
            <span>출발지 IP</span>
            <input list="endpoints" value={flow.src} onChange={(e) => onFlow({ ...flow, src: e.target.value.trim() })} />
          </label>
          <label>
            <span>목적지 IP</span>
            <input list="endpoints" value={flow.dst} onChange={(e) => onFlow({ ...flow, dst: e.target.value.trim() })} />
          </label>
          <label>
            <span>프로토콜</span>
            <select
              value={flow.proto}
              onChange={(e) => {
                const proto = e.target.value as Proto;
                onFlow(proto === "icmp" ? { src: flow.src, dst: flow.dst, proto, mode: flow.mode } : { ...flow, proto, dst_port: flow.dst_port ?? 80 });
              }}
            >
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
              <option value="icmp">ICMP (ping)</option>
            </select>
          </label>
          {usesPort && (
            <label>
              <span>목적지 포트</span>
              <input
                inputMode="numeric"
                value={flow.dst_port ?? ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  onFlow({ ...flow, dst_port: value ? Number(value) : undefined });
                }}
              />
            </label>
          )}
          <label>
            <span>판정 방식</span>
            <select value={flow.mode ?? "session"} onChange={(e) => onFlow({ ...flow, mode: e.target.value as Mode })}>
              <option value="session">왕복</option>
              <option value="one-way">한 방향</option>
            </select>
          </label>
        </div>
        <p className="hint below">왕복은 응답이 돌아와야 통과입니다(접속·ping). 한 방향은 응답이 없는 흐름(syslog 등)에 씁니다.</p>
      </section>

      <section className="panel" aria-labelledby="claim-title">
        <h2 id="claim-title">
          <span className="step">3</span> 받은 답 <span className="optional">선택</span>
        </h2>
        <p className="hint">AI나 내가 예상한 답을 적으면 판정과 비교합니다. NetProof는 이 답을 판정에 쓰지 않습니다.</p>
        <div className="choice" role="radiogroup" aria-label="받은 답">
          {([null, "PASS", "DENY"] as const).map((value) => (
            <label key={String(value)} className={claim.expected === value ? "chip on" : "chip"}>
              <input
                type="radio"
                name="expected"
                checked={claim.expected === value}
                onChange={() => onClaim({ ...claim, expected: value })}
              />
              {value === null ? "비교 안 함" : value === "PASS" ? "된다(PASS)" : "안 된다(DENY)"}
            </label>
          ))}
        </div>
        {claim.expected && (
          <div className="grid">
            <label>
              <span>답의 종류</span>
              <select value={claim.kind ?? ""} onChange={(e) => onClaim({ ...claim, kind: (e.target.value || null) as Claim["kind"] })}>
                <option value="">고르지 않음</option>
                <option value="ai">AI의 답</option>
                <option value="self">내 예상</option>
              </select>
            </label>
            <label>
              <span>누구의 답인가</span>
              <input value={claim.source} placeholder="예: ChatGPT 2026-10-02 / 내 예상" onChange={(e) => onClaim({ ...claim, source: e.target.value })} />
            </label>
            <label className="wide">
              <span>답 원문</span>
              <textarea rows={2} value={claim.text} onChange={(e) => onClaim({ ...claim, text: e.target.value })} />
            </label>
          </div>
        )}
      </section>
    </>
  );
}
