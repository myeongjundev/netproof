"""확장 ACL 부분집합의 해석과 규칙 일치(docs/semantics.md 6절)."""

from __future__ import annotations

import ipaddress
from dataclasses import dataclass, replace

from .errors import Unsupported

PROTOCOLS = ("ip", "tcp", "udp", "icmp")
ICMP_TYPES = {"echo": 8, "echo-reply": 0}
# IOS가 이름으로 받는 포트 가운데 뜻이 분명한 것만. 나머지는 숫자로 적게 한다.
PORT_NAMES = {"www": 80, "telnet": 23, "ftp": 21, "smtp": 25, "domain": 53}
PORT_OPS = ("eq", "neq", "lt", "gt", "range")
IGNORED_OPTIONS = ("log", "log-input")
ANY = ipaddress.IPv4Network("0.0.0.0/0")
ALL_ONES = 0xFFFFFFFF


@dataclass(frozen=True)
class Packet:
    src: ipaddress.IPv4Address
    dst: ipaddress.IPv4Address
    proto: str
    sport: int | None = None
    dport: int | None = None
    icmp_type: int | None = None
    ack: bool = False


@dataclass(frozen=True)
class PortMatch:
    op: str
    lo: int
    hi: int | None = None

    def matches(self, port: int) -> bool:
        if self.op == "eq":
            return port == self.lo
        if self.op == "neq":
            return port != self.lo
        if self.op == "lt":
            return port < self.lo
        if self.op == "gt":
            return port > self.lo
        return self.lo <= port <= self.hi  # range


@dataclass(frozen=True)
class Rule:
    seq: int
    action: str
    proto: str
    src: ipaddress.IPv4Network
    dst: ipaddress.IPv4Network
    raw: str
    src_port: PortMatch | None = None
    dst_port: PortMatch | None = None
    established: bool = False
    icmp_type: int | None = None
    line: int | None = None

    def matches(self, pkt: Packet) -> bool:
        if self.proto != "ip" and self.proto != pkt.proto:
            return False
        if pkt.src not in self.src or pkt.dst not in self.dst:
            return False
        if self.src_port and not self.src_port.matches(pkt.sport):
            return False
        if self.dst_port and not self.dst_port.matches(pkt.dport):
            return False
        if self.established and not pkt.ack:
            return False
        if self.icmp_type is not None and pkt.icmp_type != self.icmp_type:
            return False
        return True


@dataclass(frozen=True)
class UnreadLine:
    """해석하지 못한 줄. 이 줄보다 앞에서 판정이 나지 않으면 판정할 수 없다."""

    seq: int
    raw: str
    reason: str


@dataclass(frozen=True)
class Acl:
    name: str
    lines: tuple[Rule | UnreadLine, ...]

    def evaluate(self, pkt: Packet) -> tuple[str, Rule | None]:
        """첫 번째로 일치한 규칙의 동작. 끝까지 없으면 암묵적 deny(규칙 None)."""
        for line in self.lines:
            if isinstance(line, UnreadLine):
                raise Unsupported(
                    f"ACL {self.name} {line.seq}번 줄을 해석할 수 없어 판정을 멈춥니다: "
                    f"'{line.raw}' ({line.reason})"
                )
            if line.matches(pkt):
                return line.action, line
        return "deny", None


def wildcard_network(address: str, wildcard: str) -> ipaddress.IPv4Network:
    """Cisco 와일드카드를 네트워크로 바꾼다.

    ipaddress는 '0.0.0.0'을 넷마스크(/0)로 읽어 와일드카드와 뜻이 반대가 되므로 직접 계산한다.
    """
    addr = int(ipaddress.IPv4Address(address))
    mask = ~int(ipaddress.IPv4Address(wildcard)) & ALL_ONES
    prefix = bin(mask).count("1")
    if mask != (ALL_ONES << (32 - prefix)) & ALL_ONES:
        raise Unsupported(f"연속되지 않은 와일드카드({wildcard})는 지원하지 않습니다")
    return ipaddress.IPv4Network((addr & mask, prefix))


def _is_address(token: str) -> bool:
    try:
        ipaddress.IPv4Address(token)
    except ValueError:
        return False
    return True


def _port(token: str) -> int:
    if token in PORT_NAMES:
        return PORT_NAMES[token]
    if token.isdigit() and 0 <= int(token) <= 65535:
        return int(token)
    raise Unsupported(f"알 수 없는 포트 이름: '{token}'. 숫자로 적어 주세요")


class _Tokens:
    def __init__(self, line: str):
        self.items = line.split()
        self.pos = 0

    def peek(self) -> str | None:
        return self.items[self.pos] if self.pos < len(self.items) else None

    def take(self, what: str) -> str:
        token = self.peek()
        if token is None:
            raise Unsupported(f"{what} 항목이 빠졌습니다")
        self.pos += 1
        return token


def _address(tokens: _Tokens, what: str) -> ipaddress.IPv4Network:
    token = tokens.take(what)
    if token == "any":
        return ANY
    if token == "host":
        return ipaddress.IPv4Network(f"{tokens.take(what)}/32")
    if "/" in token:
        try:
            return ipaddress.IPv4Network(token, strict=False)
        except ValueError:
            raise Unsupported(f"{what} 해석 실패: '{token}'") from None
    if not _is_address(token):
        raise Unsupported(f"{what} 해석 실패: '{token}'")
    wildcard = tokens.peek()
    if wildcard is None or not _is_address(wildcard):
        raise Unsupported(f"{what} {token} 뒤에 와일드카드가 없습니다")
    tokens.take(what)
    return wildcard_network(token, wildcard)


def _port_match(tokens: _Tokens, proto: str) -> PortMatch | None:
    op = tokens.peek()
    if op not in PORT_OPS:
        return None
    if proto not in ("tcp", "udp"):
        raise Unsupported(f"포트 조건({op})은 tcp·udp 규칙에만 쓸 수 있습니다")
    tokens.take("포트 조건")
    if op == "range":
        lo, hi = _port(tokens.take("범위 시작")), _port(tokens.take("범위 끝"))
        if lo > hi:
            raise Unsupported(f"포트 범위 {lo}-{hi}의 순서가 거꾸로입니다")
        return PortMatch(op, lo, hi)
    match = PortMatch(op, _port(tokens.take("포트")))
    following = tokens.peek()
    if following is not None and (following.isdigit() or following in PORT_NAMES):
        raise Unsupported("eq 뒤에 포트를 여러 개 적는 형식은 지원하지 않습니다")
    return match


def parse_rule(line: str, seq: int) -> Rule | None:
    """규칙 한 줄. remark 줄은 None. 해석할 수 없으면 Unsupported."""
    tokens = _Tokens(line)
    first = tokens.peek()
    if first == "access-list":
        tokens.take("access-list")
        tokens.take("ACL 이름")
        first = tokens.peek()
    if first is not None and first.isdigit():
        seq = int(tokens.take("순번"))
        first = tokens.peek()
    if first == "remark":
        return None
    action = tokens.take("동작")
    if action not in ("permit", "deny"):
        raise Unsupported(f"동작은 permit·deny만 됩니다: '{action}'")
    proto = tokens.take("프로토콜")
    if proto not in PROTOCOLS:
        raise Unsupported(f"지원 범위(ip·tcp·udp·icmp) 밖의 프로토콜: '{proto}'")
    src = _address(tokens, "출발지")
    src_port = _port_match(tokens, proto)
    dst = _address(tokens, "목적지")
    dst_port = _port_match(tokens, proto)
    established = False
    icmp_type = None
    while (option := tokens.peek()) is not None:
        tokens.take("옵션")
        if option in IGNORED_OPTIONS:
            continue
        if option == "established" and proto == "tcp":
            established = True
        elif proto == "icmp" and icmp_type is None and (option in ICMP_TYPES or option.isdigit()):
            icmp_type = ICMP_TYPES.get(option, int(option) if option.isdigit() else None)
        else:
            raise Unsupported(f"지원하지 않는 옵션: '{option}'")
    return Rule(seq, action, proto, src, dst, line.strip(), src_port, dst_port, established, icmp_type)


def parse_acl(name: str, lines: list[str]) -> Acl:
    parsed: list[Rule | UnreadLine] = []
    for index, raw in enumerate(lines, start=1):
        if not raw.strip():
            continue
        try:
            rule = parse_rule(raw, index)
        except Unsupported as error:
            parsed.append(UnreadLine(index, raw.strip(), str(error)))
            continue
        if rule is not None:
            parsed.append(replace(rule, line=index))
    return Acl(name, tuple(parsed))
