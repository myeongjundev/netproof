import type { AclDraft, Device, Iface, Kind, Route } from "../types";

interface Props {
  devices: Device[];
  acls: AclDraft[];
  onDevices: (devices: Device[]) => void;
  onAcls: (acls: AclDraft[]) => void;
  aclInputRef?: (index: number, element: HTMLTextAreaElement | null) => void;
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

export function NetworkEditor({ devices, acls, onDevices, onAcls, aclInputRef }: Props) {
  const aclNames = acls.map((acl) => acl.name.trim()).filter(Boolean);

  const setDevice = (index: number, patch: Partial<Device>) =>
    onDevices(devices.map((device, i) => (i === index ? { ...device, ...patch } : device)));
  const setIface = (d: number, f: number, patch: Partial<Iface>) =>
    setDevice(d, { interfaces: devices[d].interfaces.map((iface, i) => (i === f ? { ...iface, ...patch } : iface)) });
  const setRoute = (d: number, r: number, patch: Partial<Route>) =>
    setDevice(d, { routes: (devices[d].routes ?? []).map((route, i) => (i === r ? { ...route, ...patch } : route)) });

  const addDevice = (kind: Kind) => {
    const id = nextName(kind === "host" ? "PC" : "R", devices.map((d) => d.id));
    onDevices([
      ...devices,
      kind === "host"
        ? { id, kind, interfaces: [{ name: "eth0", ip: "" }], gateway: "" }
        : { id, kind, interfaces: [{ name: "g0/0", ip: "" }], routes: [] },
    ]);
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
                <select
                  value={device.kind}
                  onChange={(e) => {
                    const kind = e.target.value as Kind;
                    setDevice(d, kind === "host" ? { kind, gateway: device.gateway ?? "" } : { kind, routes: device.routes ?? [] });
                  }}
                >
                  <option value="host">호스트</option>
                  <option value="router">라우터</option>
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
                onClick={() => onDevices(devices.filter((_, i) => i !== d))}
              >
                삭제
              </button>
            </div>

            <table className="rows">
              <thead>
                <tr>
                  <th scope="col">인터페이스</th>
                  <th scope="col">IP/접두사</th>
                  {device.kind === "router" && <th scope="col">ACL 들어올 때</th>}
                  {device.kind === "router" && <th scope="col">ACL 나갈 때</th>}
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
                      <input
                        aria-label={`${device.id} ${iface.name} 주소`}
                        value={iface.ip}
                        placeholder="10.10.10.1/24"
                        onChange={(e) => setIface(d, f, { ip: e.target.value })}
                      />
                    </td>
                    {device.kind === "router" &&
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
                        onClick={() => setDevice(d, { interfaces: device.interfaces.filter((_, i) => i !== f) })}
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
                  interfaces: [...device.interfaces, { name: device.kind === "host" ? "eth1" : `g0/${device.interfaces.length}`, ip: "" }],
                })
              }
            >
              + 인터페이스
            </button>

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
                            onClick={() => setDevice(d, { routes: (device.routes ?? []).filter((_, i) => i !== r) })}
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
              onClick={() => onAcls(acls.filter((_, i) => i !== a))}
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
