import type { Claim, Flow, Mode, Proto } from "../types";

interface Props {
  flow: Flow;
  claim: Claim;
  endpoints: { ip: string; label: string }[];
  onFlow: (flow: Flow) => void;
  onClaim: (claim: Claim) => void;
}

/** 판정기 맨 위의 질문 줄: 어떤 통신을 확인할지, 받은 답이 무엇인지. */
export function FlowForm({ flow, claim, endpoints, onFlow, onClaim }: Props) {
  const usesPort = flow.proto !== "icmp";
  return (
    <section className="question" aria-labelledby="flow-title">
      <h2 id="flow-title" className="sr-only">
        확인할 통신과 받은 답
      </h2>
      <datalist id="endpoints">
        {endpoints.map((item) => (
          <option key={`${item.label}-${item.ip}`} value={item.ip}>
            {item.label}
          </option>
        ))}
      </datalist>
      <div className="q-flow">
        <label className="q-ip">
          <span>출발지 IP</span>
          <input list="endpoints" value={flow.src} onChange={(e) => onFlow({ ...flow, src: e.target.value.trim() })} />
        </label>
        <span className="q-arrow" aria-hidden="true">
          →
        </span>
        <label className="q-ip">
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
          <label className="q-port">
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
            <option value="session">왕복 (접속·ping)</option>
            <option value="one-way">한 방향 (syslog 등)</option>
          </select>
        </label>
      </div>

      <div className="q-claim">
        <span className="q-label" id="claim-label">
          받은 답
        </span>
        <div className="choice" role="radiogroup" aria-labelledby="claim-label">
          {([null, "PASS", "DENY"] as const).map((value) => (
            <label key={String(value)} className={claim.expected === value ? "chip on" : "chip"}>
              <input type="radio" name="expected" checked={claim.expected === value} onChange={() => onClaim({ ...claim, expected: value })} />
              {value === null ? "비교 안 함" : value === "PASS" ? "된다" : "안 된다"}
            </label>
          ))}
        </div>
        {claim.expected && (
          <details className="q-source">
            <summary>{claim.source ? `출처: ${claim.source}` : "누구의 답인지 적기"}</summary>
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
          </details>
        )}
      </div>
      <p className="hint below">AI나 내가 예상한 답을 고르면 계산 결과와 나란히 보여 줍니다. NetProof는 이 답을 판정에 쓰지 않습니다.</p>
    </section>
  );
}
