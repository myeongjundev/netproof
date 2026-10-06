"""한 방향 패킷 추적(docs/semantics.md 4·5절)."""

from __future__ import annotations

from dataclasses import dataclass, field

from .acl import Packet
from .errors import Unsupported
from .firewall import LIMITATION, evaluate
from .model import Device, Interface, Network

MAX_HOPS = 32


@dataclass(frozen=True)
class Hop:
    device: str
    step: str  # send | acl_in | firewall_in | state | route | acl_out | deliver
    result: str  # ok | drop
    detail: str
    in_if: str | None = None
    out_if: str | None = None
    rule: str | None = None
    rule_seq: int | None = None
    acl: str | None = None
    rule_line: int | None = None


@dataclass
class Trace:
    delivered: bool
    hops: list[Hop] = field(default_factory=list)
    reason: str = ""
    stateful_devices: set[str] = field(default_factory=set)

    @property
    def decisive(self) -> Hop | None:
        return self.hops[-1] if self.hops else None


def _acl_step(network: Network, device: Device, iface: Interface, direction: str, pkt: Packet) -> Hop:
    name = iface.acl_in if direction == "in" else iface.acl_out
    step = f"acl_{direction}"
    acl = network.acls[name]
    action, rule = acl.evaluate(pkt)
    result = "ok" if action == "permit" else "drop"
    where = dict(in_if=iface.name) if direction == "in" else dict(out_if=iface.name)
    if rule is None:
        return Hop(device.id, step, result, f"ACL {name}({iface.name} {direction}): 일치하는 규칙이 없어 암묵적 deny", acl=name, **where)
    verb = "허용" if action == "permit" else "차단"
    return Hop(
        device.id, step, result, f"ACL {name}({iface.name} {direction}) {rule.seq}번 규칙에서 {verb}",
        rule=rule.raw, rule_seq=rule.seq, acl=name, rule_line=rule.line, **where,
    )


def _lookup(device: Device, pkt: Packet) -> tuple[Interface, object, str] | None:
    """최장 접두사 일치. 길이가 같으면 직접 연결이 이긴다. (나갈 인터페이스, 다음 홉 주소, 설명)."""
    best = None  # (prefixlen, connected, candidates)
    for iface in device.interfaces:
        if pkt.dst in iface.network:
            key = (iface.network.prefixlen, 1)
            if best is None or key > best[0]:
                best = (key, [("connected", iface)])
    for route in device.routes:
        if pkt.dst in route.prefix:
            key = (route.prefix.prefixlen, 0)
            if best is None or key > best[0]:
                best = (key, [("static", route)])
            elif key == best[0]:
                best[1].append(("static", route))
    if best is None:
        return None
    kind, chosen = best[1][0]
    if kind == "connected":
        return chosen, pkt.dst, f"직접 연결 {chosen.network} → {chosen.name}"
    if len(best[1]) > 1:
        raise Unsupported(f"{device.id}: 목적지 {chosen.prefix} 경로가 여러 개(ECMP)라 판정하지 않습니다")
    if chosen.next_hop is None:
        iface = device.interface(chosen.out_if)
        return iface, pkt.dst, f"정적 경로 {chosen.raw} → {iface.name}"
    for iface in device.interfaces:
        if chosen.next_hop in iface.network:
            return iface, chosen.next_hop, f"정적 경로 {chosen.raw} → {iface.name}"
    raise Unsupported(f"{device.id}의 정적 경로 '{chosen.raw}'는 다음 홉이 직접 연결 서브넷 밖이라(재귀 조회) 판정하지 않습니다")


def _neighbor(network: Network, out_if: Interface, next_ip) -> tuple[Interface | None, str]:
    for iface in network.all_interfaces():
        if iface is out_if or iface.device == out_if.device:
            continue
        if iface.ip.ip == next_ip:
            if iface.network == out_if.network:
                return iface, ""
            return None, (
                f"주소 {next_ip}의 주인 {iface.label}의 서브넷({iface.network})이 "
                f"{out_if.label}의 서브넷({out_if.network})과 달라 같은 링크로 보지 않습니다"
            )
    return None, f"같은 링크({out_if.network})에서 주소 {next_ip}의 주인 장비를 찾지 못했습니다"


def trace(network: Network, pkt: Packet, *, states: frozenset[str] = frozenset(), returning: bool = False) -> Trace:
    start = network.owner(pkt.src)
    result = Trace(delivered=False)
    device = network.devices[start.device]
    in_if: Interface | None = None
    visited: set[tuple[str, str | None]] = set()

    while True:
        if len(result.hops) > MAX_HOPS * 4 or (device.id, in_if.name if in_if else None) in visited:
            result.hops.append(Hop(device.id, "route", "drop", "같은 장비를 다시 지나 라우팅 루프로 판정", in_if=in_if.name if in_if else None))
            result.reason = "라우팅 루프"
            return result
        visited.add((device.id, in_if.name if in_if else None))

        if device.kind == "host":
            if in_if is not None:
                if device.owns(pkt.dst):
                    result.hops.append(Hop(device.id, "deliver", "ok", f"{pkt.dst}에 도착", in_if=in_if.name))
                    result.delivered = True
                    return result
                result.hops.append(Hop(device.id, "route", "drop", "호스트는 다른 장비의 패킷을 전달하지 않습니다", in_if=in_if.name))
                result.reason = "호스트가 전달하지 않음"
                return result
            local = next((i for i in device.interfaces if pkt.dst in i.network), None)
            if local is not None:
                out_if, next_ip, detail = local, pkt.dst, f"같은 서브넷 {local.network}이라 바로 보냄"
            elif device.gateway is None:
                result.hops.append(Hop(device.id, "send", "drop", "목적지가 다른 서브넷인데 기본 게이트웨이가 없습니다"))
                result.reason = "기본 게이트웨이 없음"
                return result
            else:
                out_if = next(i for i in device.interfaces if device.gateway in i.network)
                next_ip, detail = device.gateway, f"다른 서브넷이라 기본 게이트웨이({device.gateway})에 보냄"
            result.hops.append(Hop(device.id, "send", "ok", detail, out_if=out_if.name))
        else:
            if device.stateful:
                if returning and device.id not in states:
                    raise Unsupported(f"{device.id}: 복귀 패킷이 상태 없는 상태 추적 장비를 지납니다. "
                                      f"기존 연결 상태를 모르므로 판정하지 않습니다. {LIMITATION}")
                options = network.firewall_unsupported + device.firewall_unsupported + (in_if.firewall_unsupported if in_if else ())
                if options:
                    raise Unsupported(f"{device.id}: 지원하지 않는 상태 추적 옵션: {', '.join(options)}. {LIMITATION}")
                if device.id not in states and pkt.proto == "icmp" and pkt.icmp_type != 8:
                    raise Unsupported(f"{device.id}: 기존 연결 상태에 기댄 ICMP 응답·오류 패킷은 계산하지 않습니다. {LIMITATION}")
                if in_if is not None:
                    if device.id in states:
                        hop = Hop(device.id, "state", "ok", f"{in_if.name} in: 이 session의 정방향 상태로 허용됨. {LIMITATION}", in_if=in_if.name)
                    else:
                        action, rule = evaluate(in_if.rules_in, in_if.default_in, pkt, f"{device.id} {in_if.name} in")
                        verb = "허용" if action == "pass" else "차단"
                        detail = (f"{rule.seq}번 규칙에서 {verb}" if rule else f"사용자가 적은 기본 정책({in_if.default_in})으로 {verb}")
                        hop = Hop(device.id, "firewall_in", "ok" if action == "pass" else "drop",
                                  f"{in_if.name} in: {detail}. {LIMITATION}", in_if=in_if.name,
                                  rule=rule.raw if rule else None, rule_seq=rule.seq if rule else None,
                                  rule_line=rule.line if rule else None)
                    result.hops.append(hop)
                    if hop.result == "drop":
                        result.reason = hop.detail
                        return result
                    result.stateful_devices.add(device.id)
            if in_if is not None and in_if.acl_in is not None:
                hop = _acl_step(network, device, in_if, "in", pkt)
                result.hops.append(hop)
                if hop.result == "drop":
                    result.reason = hop.detail
                    return result
            if device.owns(pkt.dst):
                result.hops.append(Hop(device.id, "deliver", "ok", f"라우터 자신의 주소 {pkt.dst}에 도착", in_if=in_if.name if in_if else None))
                result.delivered = True
                return result
            found = _lookup(device, pkt)
            if found is None:
                result.hops.append(Hop(device.id, "route", "drop", f"목적지 {pkt.dst}에 맞는 경로가 없습니다", in_if=in_if.name if in_if else None))
                result.reason = "경로 없음"
                return result
            out_if, next_ip, detail = found
            result.hops.append(Hop(device.id, "route", "ok", detail, in_if=in_if.name if in_if else None, out_if=out_if.name))
            if out_if.acl_out is not None:
                hop = _acl_step(network, device, out_if, "out", pkt)
                result.hops.append(hop)
                if hop.result == "drop":
                    result.reason = hop.detail
                    return result

        neighbor, why = _neighbor(network, out_if, next_ip)
        if neighbor is None:
            result.hops.append(Hop(device.id, "send", "drop", f"다음 홉 없음: {why}", out_if=out_if.name))
            result.reason = "다음 홉 없음"
            return result
        device, in_if = network.devices[neighbor.device], neighbor
