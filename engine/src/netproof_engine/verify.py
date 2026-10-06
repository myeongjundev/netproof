"""흐름 하나의 최종 판정과 받은 답과의 비교(docs/semantics.md 1·2절)."""

from __future__ import annotations

import ipaddress
from dataclasses import asdict

from .acl import ICMP_TYPES, Packet, decimal_int
from .errors import Invalid, Unsupported
from .model import Interface, Network, load
from .trace import Trace, trace

RESULTS = ("PASS", "DENY", "UNSUPPORTED", "INVALID")
DEFAULT_SOURCE_PORT = 50000  # 복귀 패킷의 목적지 포트. 임시 포트 범위 안의 고정값으로 둔다.


def _flow_packet(flow: dict) -> tuple[Packet, str]:
    problems: list[str] = []
    addresses = {}
    for key in ("src", "dst"):
        try:
            addresses[key] = ipaddress.IPv4Address(str(flow.get(key, "")).strip())
        except ValueError:
            problems.append(f"흐름의 {key} '{flow.get(key)}'는 올바른 주소가 아닙니다")
    proto = flow.get("proto")
    mode = flow.get("mode", "session")
    if proto not in ("tcp", "udp", "icmp"):
        problems.append(f"흐름의 프로토콜은 tcp·udp·icmp만 됩니다('{proto}')")
    if mode not in ("session", "one-way"):
        problems.append(f"모드는 session·one-way만 됩니다('{mode}')")
    if problems:
        raise Invalid(problems)
    if addresses["src"] == addresses["dst"]:
        raise Invalid(["출발지와 목적지가 같습니다"])

    if proto == "icmp":
        icmp = flow.get("icmp", "echo")
        icmp_type = ICMP_TYPES.get(icmp)
        if icmp_type is None:
            icmp_type = decimal_int(str(icmp))
        if icmp_type is None:
            raise Invalid([f"알 수 없는 ICMP 종류: '{icmp}'(echo, echo-reply 또는 숫자)"])
        if mode == "session" and icmp_type != 8:
            raise Unsupported("session 모드의 ICMP는 echo(ping)만 지원합니다. 다른 종류는 one-way로 확인하세요")
        return Packet(addresses["src"], addresses["dst"], proto, icmp_type=icmp_type), mode

    try:
        dport = int(flow.get("dst_port"))
        sport = int(flow.get("src_port", DEFAULT_SOURCE_PORT))
    except (TypeError, ValueError):
        raise Invalid([f"{proto} 흐름에는 숫자 목적지 포트(dst_port)가 필요합니다"]) from None
    if not (0 < dport <= 65535 and 0 < sport <= 65535):
        raise Invalid(["포트는 1~65535 사이여야 합니다"])
    return Packet(addresses["src"], addresses["dst"], proto, sport=sport, dport=dport), mode


def _reverse(pkt: Packet) -> Packet:
    if pkt.proto == "icmp":
        return Packet(pkt.dst, pkt.src, "icmp", icmp_type=0)
    return Packet(pkt.dst, pkt.src, pkt.proto, sport=pkt.dport, dport=pkt.sport, ack=pkt.proto == "tcp")


def _trace_dict(result: Trace | None, target: Interface) -> dict | None:
    if result is None:
        return None
    return {
        "delivered": result.delivered,
        "reason": result.reason,
        "hops": [asdict(h) for h in result.hops],
        "target": {"device": target.device, "interface": target.name, "ip": str(target.ip.ip)},
    }


def verify(network_data: dict, flow: dict) -> dict:
    """판정 결과 사전. 어떤 입력에도 예외 대신 네 값 중 하나를 돌려준다."""
    try:
        network: Network = load(network_data)
        pkt, mode = _flow_packet(flow)
        source = network.owner(pkt.src)
        destination = network.owner(pkt.dst)
        if source is None:
            raise Invalid([f"출발지 주소 {pkt.src}의 주인 장비가 모델에 없습니다"])
        if destination is None:
            raise Unsupported(f"목적지 주소 {pkt.dst}의 주인 장비가 모델에 없습니다(모델 밖 목적지)")
        forward = trace(network, pkt)
        backward = None
        if forward.delivered and mode == "session":
            backward = trace(network, _reverse(pkt), states=frozenset(forward.stateful_devices))
    except Invalid as error:
        return {"result": "INVALID", "reason": "입력이 성립하지 않습니다", "problems": error.problems,
                "forward": None, "return": None, "decisive": None}
    except Unsupported as error:
        return {"result": "UNSUPPORTED", "reason": str(error), "problems": [],
                "forward": None, "return": None, "decisive": None}

    if not forward.delivered:
        result, reason, decisive = "DENY", f"정방향: {forward.reason}", forward.decisive
    elif backward is not None and not backward.delivered:
        result, reason, decisive = "DENY", f"복귀 방향: {backward.reason}", backward.decisive
    else:
        result, reason, decisive = "PASS", "정방향" + (" · 복귀 방향 모두 통과" if backward else " 통과(one-way)"), None
    return {
        "result": result,
        "reason": reason,
        "problems": [],
        "forward": _trace_dict(forward, destination),
        "return": _trace_dict(backward, source),
        "decisive": asdict(decisive) if decisive else None,
    }


def compare(verdict: dict, expected: str | None) -> str:
    """받은 답(AI·본인 예상)과 판정 비교. 판정을 못 했으면 비교하지 않는다."""
    if expected not in ("PASS", "DENY"):
        return "NO_CLAIM"
    if verdict["result"] not in ("PASS", "DENY"):
        return "NOT_COMPARABLE"
    return "AGREE" if verdict["result"] == expected else "DISAGREE"
