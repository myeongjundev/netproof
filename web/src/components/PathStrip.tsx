import type { LessonPath } from "../learning";

/** 정적인 구성 안내다. ACL 규칙이나 계산 결과는 해석하지 않는다. */
export function PathStrip({ nodes, acls, roundTrip, outside, size }: LessonPath & { outside?: boolean; size?: "small" }) {
  const description = nodes.map(node => {
    const bindings = acls.filter(acl => acl.device === node.id).map(acl => `${acl.iface}에 ${acl.dir === "in" ? "들어올 때" : "나갈 때"} ACL ${acl.name}`);
    return `${node.id}${bindings.length ? `(${bindings.join(", ")})` : ""}`;
  }).join(", ");
  return <figure className={`path-strip${size === "small" ? " path-strip-small" : ""}`}>
    <ol className="path-nodes" aria-hidden="true">{nodes.map(node => <li className={`path-node path-${node.kind}`} key={node.id}>
      <span className="path-dot" /><span className="path-node-name">{node.id}</span>
      {acls.filter(acl => acl.device === node.id).map(acl => <span className="path-acl" key={`${acl.iface}-${acl.dir}-${acl.name}`}>ACL {acl.name} · {acl.dir}<span>{acl.iface} {acl.dir === "in" ? "들어올 때" : "나갈 때"}</span></span>)}
    </li>)}</ol>
    {roundTrip && <p className="path-roundtrip" aria-hidden="true">⇄ 돌아오는 길도 계산합니다</p>}
    {outside && <p className="path-outside" aria-hidden="true"><span />실제 장비 · NetProof 밖</p>}
    <figcaption className="sr-only">구성: {description}.{roundTrip ? " 돌아오는 길도 계산합니다." : ""}{outside ? " 실제 장비는 NetProof 밖입니다." : ""}</figcaption>
  </figure>;
}
