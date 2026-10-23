import type { AclDraft, DefaultIn, Device, FirewallRule, Iface, Kind, Route } from "../types";
import { useId, useState, type InputHTMLAttributes } from "react";
import { cidrProblem, portProblem, ruleAddressProblem } from "../validate";
import { ACTION_TEXT, DEFAULT_TEXT, PROTO_TEXT } from "../firewall";

interface Props {
  devices: Device[];
  acls: AclDraft[];
  onDevices: (devices: Device[]) => void;
  onAcls: (acls: AclDraft[]) => void;
  aclInputRef?: (index: number, element: HTMLTextAreaElement | null) => void;
  onBeforeRemove?: (label: string) => void;
}

/** 칸을 떠날 때만 형식을 안내한다. 판정을 막지 않는다. */
function CheckedInput({ check, ...props }: InputHTMLAttributes<HTMLInputElement> & { value: string; check: (value: string) => string | null }) {
  const id = useId();
  const [checked, setChecked] = useState<string>();
  const problem = checked === props.value ? check(props.value) : null;
  return <><input {...props} onBlur={() => setChecked(props.value)} aria-invalid={problem ? true : undefined} aria-describedby={problem ? id : undefined} />
    {problem && <p className="field-problem" id={id}>{problem}</p>}</>;
}

const NEW_RULE: FirewallRule = { action: "pass", proto: "tcp", src: "any", dst: "any" };
const withPorts = (proto: FirewallRule["proto"]) => proto === "tcp" || proto === "udp";

/** 상태 추적 방화벽 인터페이스 하나의 들어오는 규칙. 위에서부터 처음 맞는 규칙 하나만 적용된다(semantics §14). */
export function FirewallRules({ device, iface, onChange, onBeforeRemove }: {
  device: string; iface: Iface; onChange: (patch: Partial<Iface>) => void; onBeforeRemove?: (label: string) => void;
}) {
  const rules = Array.isArray(iface.rules_in) ? iface.rules_in : [];
  const name = `${device} ${iface.name}`;
  const setRules = (next: FirewallRule[]) => onChange({ rules_in: next });
  const setRule = (r: number, patch: Partial<FirewallRule>) => setRules(rules.map((rule, i) => (i === r ? { ...rule, ...patch } : rule)));
  const swap = (a: number, b: number) => setRules(rules.map((rule, i) => (i === a ? rules[b] : i === b ? rules[a] : rule)));
  const address = (rule: FirewallRule, r: number, key: "src" | "dst", label: string) => (
    <label><span>{label}</span>
      <CheckedInput aria-label={`${name} ${r + 1}번 규칙 ${label}`} check={ruleAddressProblem} value={String(rule[key] ?? "")}
        placeholder="any" onChange={(e) => setRule(r, { [key]: e.target.value })} /></label>
  );
  const port = (rule: FirewallRule, r: number, key: "src_port" | "dst_port", label: string) => (
    <label><span>{label}</span>
      <CheckedInput aria-label={`${name} ${r + 1}번 규칙 ${label}`} check={portProblem} value={String(rule[key] ?? "")} inputMode="numeric"
        disabled={!withPorts(rule.proto)} placeholder={withPorts(rule.proto) ? "any" : "TCP·UDP만"} onChange={(e) => setRule(r, { [key]: e.target.value })} /></label>
  );
  return (
    <div className="fw-rules">
      <h4>{iface.name || "이름 없는 인터페이스"} 들어오는 규칙</h4>
      {rules.length === 0 && <p className="hint">규칙이 없습니다. 들어오는 통신에는 아래 기본 동작이 적용됩니다.</p>}
      <ol>
        {rules.map((rule, r) => (
          <li className="fw-rule" key={r}>
            <label><span>동작</span>
              <select aria-label={`${name} ${r + 1}번 규칙 동작`} value={rule.action} onChange={(e) => setRule(r, { action: e.target.value as FirewallRule["action"] })}>
                {(["pass", "block"] as const).map((value) => <option key={value} value={value}>{ACTION_TEXT[value]}</option>)}
              </select></label>
            <label><span>프로토콜</span>
              <select aria-label={`${name} ${r + 1}번 규칙 프로토콜`} value={rule.proto} onChange={(e) => {
                const proto = e.target.value as FirewallRule["proto"];
                setRule(r, withPorts(proto) ? { proto } : { proto, src_port: undefined, dst_port: undefined });
              }}>
                {(["tcp", "udp", "icmp", "ip"] as const).map((value) => <option key={value} value={value}>{PROTO_TEXT[value]}</option>)}
              </select></label>
            {address(rule, r, "src", "출발지")}
            {port(rule, r, "src_port", "출발 포트")}
            {address(rule, r, "dst", "목적지")}
            {port(rule, r, "dst_port", "목적 포트")}
            <div className="fw-rule-actions">
              <button type="button" className="ghost icon" aria-label={`${name} ${r + 1}번 규칙 위로`} disabled={r === 0} onClick={() => swap(r, r - 1)}>↑</button>
              <button type="button" className="ghost icon" aria-label={`${name} ${r + 1}번 규칙 아래로`} disabled={r === rules.length - 1} onClick={() => swap(r, r + 1)}>↓</button>
              <button type="button" className="ghost icon" aria-label={`${name} ${r + 1}번 규칙 삭제`}
                onClick={() => { onBeforeRemove?.(`${name} ${r + 1}번 규칙을 삭제했습니다`); setRules(rules.filter((_, i) => i !== r)); }}>×</button>
            </div>
          </li>
        ))}
      </ol>
      <div className="fw-rules-foot">
        <button type="button" className="ghost small" onClick={() => setRules([...rules, { ...NEW_RULE }])}>+ 규칙</button>
        <label><span>어느 규칙에도 안 맞으면</span>
          <select aria-label={`${name} 어느 규칙에도 안 맞으면`} value={iface.default_in ?? "unknown"} onChange={(e) => onChange({ default_in: e.target.value as DefaultIn })}>
            {(["block", "pass", "unknown"] as const).map((value) => <option key={value} value={value}>{DEFAULT_TEXT[value]}</option>)}
          </select></label>
      </div>
    </div>
  );
}

function nextName(prefix: string, taken: string[]): string {
  let n = 1;
  while (taken.includes(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** 확장 ACL 번호대(100~199)에서 비어 있는 첫 번호. */
function nextAclNumber(taken: string[]): string {
  let n = 101;
  while (taken.includes(String(n))) n += 1;
  return String(n);
}

export function NetworkEditor({ devices, acls, onDevices, onAcls, aclInputRef, onBeforeRemove }: Props) {
  const aclNames = acls.map((acl) => acl.name.trim()).filter(Boolean);

  const setDevice = (index: number, patch: Partial<Device>) =>
    onDevices(devices.map((device, i) => (i === index ? { ...device, ...patch } : device)));
  const setIface = (d: number, f: number, patch: Partial<Iface>) =>
    setDevice(d, { interfaces: devices[d].interfaces.map((iface, i) => (i === f ? { ...iface, ...patch } : iface)) });
  const setRoute = (d: number, r: number, patch: Partial<Route>) =>
    setDevice(d, { routes: (devices[d].routes ?? []).map((route, i) => (i === r ? { ...route, ...patch } : route)) });

  const addDevice = (kind: Kind | "firewall") => {
    const id = nextName(kind === "host" ? "PC" : kind === "router" ? "R" : "FW", devices.map((d) => d.id));
    onDevices([
      ...devices,
      kind === "host"
        ? { id, kind, interfaces: [{ name: "eth0", ip: "" }], gateway: "" }
        : kind === "router"
          ? { id, kind, interfaces: [{ name: "g0/0", ip: "" }], routes: [] }
          : { id, kind: "router", stateful: true, interfaces: [{ name: "em0", ip: "", rules_in: [], default_in: "block" }], routes: [] },
    ]);
  };
  // 라우터↔방화벽 전환 때 ACL 연결과 규칙은 입력에 남긴다. 보낼지는 toNetwork가 stateful로 정한다.
  const setKind = (d: number, kind: Kind | "firewall") => {
    const device = devices[d];
    if (kind === "host") setDevice(d, { kind, stateful: undefined, gateway: device.gateway ?? "" });
    else if (kind === "router") setDevice(d, { kind, stateful: undefined, routes: device.routes ?? [] });
    else setDevice(d, { kind: "router", stateful: true, routes: device.routes ?? [], interfaces: device.interfaces.map((iface) => ({
      ...iface, rules_in: iface.rules_in ?? [], default_in: iface.default_in ?? "block" })) });
  };

  return (
    <section className="panel flat" aria-labelledby="network-title">
      <h2 id="network-title">구성</h2>
      <p className="hint">장비의 주소와 경로, ACL을 적습니다. 같은 서브넷에 있는 인터페이스는 같은 링크로 연결됐다고 봅니다.</p>

      <div className="devices">
        {devices.map((device, d) => (
          <fieldset className="device" key={d}>
            <legend className="sr-only">{device.id || "이름 없는 장비"}</legend>
            <div className="device-head">
              <label>
                <span>이름</span>
                <input value={device.id} onChange={(e) => setDevice(d, { id: e.target.value })} />
              </label>
              <label>
                <span>종류</span>
                <select value={device.stateful ? "firewall" : device.kind} onChange={(e) => setKind(d, e.target.value as Kind | "firewall")}>
                  <option value="host">호스트</option>
                  <option value="router">라우터</option>
                  <option value="firewall">방화벽</option>
                </select>
              </label>
              {device.kind === "host" && (
                <label>
                  <span>기본 게이트웨이</span>
                  <input
                    value={device.gateway ?? ""}
                    placeholder="10.10.10.1"
                    onChange={(e) => setDevice(d, { gateway: e.target.value })}
                  />
                </label>
              )}
              <button
                type="button"
                className="ghost danger"
                aria-label={`${device.id} 장비 삭제`}
                onClick={() => { onBeforeRemove?.(`${device.id} 장비를 삭제했습니다`); onDevices(devices.filter((_, i) => i !== d)); }}
              >
                삭제
              </button>
            </div>

            {device.stateful && <p className="hint">방화벽은 들어오는 방향의 규칙만 봅니다. 위에서부터 처음 맞는 규칙 하나를 따르고, 가는 길에서 통과한 연결의 응답은 규칙 없이 돌아옵니다(pfSense와 같은 방식).</p>}
            <table className="rows">
              <thead>
                <tr>
                  <th scope="col">인터페이스</th>
                  <th scope="col">IP/접두사</th>
                  {device.kind === "router" && !device.stateful && <th scope="col">ACL 들어올 때</th>}
                  {device.kind === "router" && !device.stateful && <th scope="col">ACL 나갈 때</th>}
                  <th scope="col">
                    <span className="sr-only">삭제</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {device.interfaces.map((iface, f) => (
                  <tr key={f}>
                    <td data-label="인터페이스">
                      <input aria-label={`${device.id} 인터페이스 이름`} value={iface.name} onChange={(e) => setIface(d, f, { name: e.target.value })} />
                    </td>
                    <td data-label="IP/접두사">
                      <CheckedInput
                        aria-label={`${device.id} ${iface.name} 주소`}
                        check={cidrProblem}
                        value={iface.ip}
                        placeholder="10.10.10.1/24"
                        onChange={(e) => setIface(d, f, { ip: e.target.value })}
                      />
                    </td>
                    {device.kind === "router" && !device.stateful &&
                      (["acl_in", "acl_out"] as const).map((key) => (
                        <td key={key} data-label={key === "acl_in" ? "ACL 들어올 때" : "ACL 나갈 때"}>
                          <select
                            aria-label={`${device.id} ${iface.name} ${key === "acl_in" ? "들어올 때" : "나갈 때"} ACL`}
                            value={iface[key] ?? ""}
                            onChange={(e) => setIface(d, f, { [key]: e.target.value || null })}
                          >
                            <option value="">없음</option>
                            {aclNames.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </td>
                      ))}
                    <td>
                      <button
                        type="button"
                        className="ghost icon"
                        aria-label={`${device.id} ${iface.name} 인터페이스 삭제`}
                        onClick={() => { onBeforeRemove?.(`${device.id} ${iface.name} 인터페이스를 삭제했습니다`); setDevice(d, { interfaces: device.interfaces.filter((_, i) => i !== f) }); }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className="ghost small"
              onClick={() =>
                setDevice(d, {
                  interfaces: [...device.interfaces, device.stateful
                    ? { name: `em${device.interfaces.length}`, ip: "", rules_in: [], default_in: "block" }
                    : { name: device.kind === "host" ? "eth1" : `g0/${device.interfaces.length}`, ip: "" }],
                })
              }
            >
              + 인터페이스
            </button>
            {device.stateful && device.interfaces.map((iface, f) => (
              <FirewallRules key={f} device={device.id} iface={iface} onChange={(patch) => setIface(d, f, patch)} onBeforeRemove={onBeforeRemove} />
            ))}

            {device.kind === "router" && (
              <>
                {(device.routes ?? []).length > 0 && (
                <table className="rows">
                  <thead>
                    <tr>
                      <th scope="col">정적 경로 목적지</th>
                      <th scope="col">다음 홉</th>
                      <th scope="col">
                        <span className="sr-only">삭제</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(device.routes ?? []).map((route, r) => (
                      <tr key={r}>
                        <td data-label="정적 경로 목적지">
                          <input
                            aria-label={`${device.id} 경로 목적지`}
                            value={route.prefix}
                            placeholder="10.30.30.0/24"
                            onChange={(e) => setRoute(d, r, { prefix: e.target.value })}
                          />
                        </td>
                        <td data-label="다음 홉">
                          <input
                            aria-label={`${device.id} 경로 다음 홉`}
                            value={route.next_hop ?? ""}
                            placeholder="192.168.12.2"
                            onChange={(e) => setRoute(d, r, { next_hop: e.target.value })}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ghost icon"
                            aria-label={`${device.id} 경로 삭제`}
                            onClick={() => { onBeforeRemove?.(`${device.id} ${route.prefix} 경로를 삭제했습니다`); setDevice(d, { routes: (device.routes ?? []).filter((_, i) => i !== r) }); }}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
                <button
                  type="button"
                  className="ghost small"
                  onClick={() => setDevice(d, { routes: [...(device.routes ?? []), { prefix: "", next_hop: "" }] })}
                >
                  + 정적 경로
                </button>
              </>
            )}
          </fieldset>
        ))}
      </div>
      <div className="row-actions">
        <button type="button" className="ghost" onClick={() => addDevice("host")}>
          + 호스트
        </button>
        <button type="button" className="ghost" onClick={() => addDevice("router")}>
          + 라우터
        </button>
        <button type="button" className="ghost" onClick={() => addDevice("firewall")}>+ 방화벽</button>
      </div>

      <h3>ACL</h3>
      <p className="hint">
        Cisco 확장 ACL 형식으로 한 줄에 규칙 하나씩 적습니다. 예: <code>deny tcp 10.10.10.0 0.0.0.255 any eq 443</code>. 만든 ACL은 위
        라우터 인터페이스에서 고릅니다.
      </p>
      {acls.map((acl, a) => (
        <div className="acl" key={a}>
          <div className="acl-head">
            <label>
              <span>ACL 이름</span>
              <input value={acl.name} onChange={(e) => onAcls(acls.map((x, i) => (i === a ? { ...x, name: e.target.value } : x)))} />
            </label>
            <button
              type="button"
              className="ghost danger"
              aria-label={`ACL ${acl.name} 삭제`}
              onClick={() => { onBeforeRemove?.(`${acl.name.trim() ? `${acl.name.trim()} ` : ""}ACL을 삭제했습니다`); onAcls(acls.filter((_, i) => i !== a)); }}
            >
              삭제
            </button>
          </div>
          <label className="block">
            <span className="sr-only">ACL {acl.name} 규칙</span>
            <textarea
              ref={(element) => aclInputRef?.(a, element)}
              rows={Math.max(3, acl.text.split("\n").length + 1)}
              spellCheck={false}
              value={acl.text}
              placeholder={"deny tcp 10.10.10.0 0.0.0.255 10.20.20.0 0.0.0.255 eq 443\npermit ip any any"}
              onChange={(e) => onAcls(acls.map((x, i) => (i === a ? { ...x, text: e.target.value } : x)))}
            />
          </label>
        </div>
      ))}
      <button type="button" className="ghost" onClick={() => onAcls([...acls, { name: nextAclNumber(aclNames), text: "" }])}>
        + ACL
      </button>
    </section>
  );
}
