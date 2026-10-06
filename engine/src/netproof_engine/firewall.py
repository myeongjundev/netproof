"""제한된 상태 추적 방화벽의 구조화 규칙(docs/semantics.md §14).

ACL 문법으로 치환하지 않는다. 주소·포트 일치에는 기존 Rule/PortMatch를 쓴다.
"""

from __future__ import annotations

import ipaddress
import json

from .acl import ANY, PROTOCOLS, Packet, PortMatch, Rule, UnreadLine, decimal_int
from .errors import Invalid, Unsupported

RULE_FIELDS = {"action", "proto", "src", "dst", "src_port", "dst_port"}
LIMITATION = "제한된 상태 추적 모델이며 실제 pfSense 장비와 대조하지 않았습니다"


def _address(value: str):
    if value == "any":
        return ANY
    try:
        return ipaddress.IPv4Network(value, strict=False)
    except ValueError:
        raise Unsupported(f"지원하지 않는 주소·별칭: '{value}' (IPv4 주소·CIDR·any만 지원)") from None


def _port(value, proto: str):
    if value is None or value == "any":
        return None
    if proto not in ("tcp", "udp"):
        raise Unsupported("포트는 tcp·udp 규칙에만 지정할 수 있습니다")
    number = decimal_int(str(value))
    if number is None or not 1 <= number <= 65535:
        raise Unsupported("포트는 1~65535 숫자 하나 또는 any만 지원합니다")
    return PortMatch("eq", number)


def parse_rules(items: list[dict], where: str) -> tuple[Rule | UnreadLine, ...]:
    lines = []
    for seq, item in enumerate(items, start=1):
        for key in ("action", "proto", "src", "dst"):
            if not isinstance(item.get(key), str) or not item[key]:
                raise Invalid([f"{where} {seq}번 규칙: {key}는 비어 있지 않은 문자열이어야 합니다"])
        for key in ("src_port", "dst_port"):
            if key in item and (isinstance(item[key], bool) or not isinstance(item[key], (str, int, type(None)))):
                raise Invalid([f"{where} {seq}번 규칙: {key}는 숫자·문자열이어야 합니다"])
            if isinstance(item.get(key), int) and not 1 <= item[key] <= 65535:
                raise Invalid([f"{where} {seq}번 규칙: {key}는 1~65535 사이여야 합니다"])
        raw = json.dumps(item, ensure_ascii=False, sort_keys=True)
        try:
            extra = sorted(set(item) - RULE_FIELDS)
            if extra:
                raise Unsupported(f"지원하지 않는 규칙 옵션: {', '.join(extra)}")
            if item["action"] not in ("pass", "block"):
                raise Unsupported("동작은 pass·block만 지원합니다")
            if item["proto"] not in PROTOCOLS:
                raise Unsupported("프로토콜은 ip·tcp·udp·icmp만 지원합니다")
            lines.append(Rule(
                seq, "permit" if item["action"] == "pass" else "deny", item["proto"],
                _address(item["src"]), _address(item["dst"]), raw,
                src_port=_port(item.get("src_port"), item["proto"]),
                dst_port=_port(item.get("dst_port"), item["proto"]), line=seq,
            ))
        except Unsupported as error:
            lines.append(UnreadLine(seq, raw, str(error)))
    return tuple(lines)


def evaluate(lines: tuple[Rule | UnreadLine, ...], default: str, pkt: Packet, where: str):
    for line in lines:
        if isinstance(line, UnreadLine):
            raise Unsupported(f"{where} {line.seq}번 규칙을 계산할 수 없습니다: {line.reason}. {LIMITATION}")
        if line.matches(pkt):
            return ("pass" if line.action == "permit" else "block"), line
    if default == "unknown":
        raise Unsupported(f"{where}: 일치 규칙이 없고 기본·자동 규칙을 모릅니다(default_in 미확인). {LIMITATION}")
    return default, None
