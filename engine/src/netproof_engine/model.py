"""구조화 네트워크 모델과 입력 검증(docs/semantics.md 3·4·7절)."""

from __future__ import annotations

import ipaddress
from dataclasses import dataclass, field

from .acl import Acl, Rule, UnreadLine, parse_acl
from .errors import Invalid
from .firewall import parse_rules

KINDS = ("host", "router")


@dataclass(frozen=True)
class Interface:
    device: str
    name: str
    ip: ipaddress.IPv4Interface
    acl_in: str | None = None
    acl_out: str | None = None
    rules_in: tuple[Rule | UnreadLine, ...] = ()
    default_in: str = "unknown"
    firewall_unsupported: tuple[str, ...] = ()

    @property
    def network(self) -> ipaddress.IPv4Network:
        return self.ip.network

    @property
    def label(self) -> str:
        return f"{self.device} {self.name}"


@dataclass(frozen=True)
class Route:
    prefix: ipaddress.IPv4Network
    next_hop: ipaddress.IPv4Address | None
    out_if: str | None
    raw: str


@dataclass
class Device:
    id: str
    kind: str
    interfaces: list[Interface] = field(default_factory=list)
    routes: list[Route] = field(default_factory=list)
    gateway: ipaddress.IPv4Address | None = None
    stateful: bool = False
    firewall_unsupported: tuple[str, ...] = ()

    def owns(self, address: ipaddress.IPv4Address) -> bool:
        return any(iface.ip.ip == address for iface in self.interfaces)

    def interface(self, name: str) -> Interface | None:
        return next((iface for iface in self.interfaces if iface.name == name), None)


@dataclass
class Network:
    devices: dict[str, Device]
    acls: dict[str, Acl]
    firewall_unsupported: tuple[str, ...] = ()

    def all_interfaces(self) -> list[Interface]:
        return [iface for device in self.devices.values() for iface in device.interfaces]

    def owner(self, address: ipaddress.IPv4Address) -> Interface | None:
        return next((iface for iface in self.all_interfaces() if iface.ip.ip == address), None)


def _parse(kind, value, problems: list[str], where: str):
    try:
        return kind(value)
    except (ValueError, TypeError):
        problems.append(f"{where}: 올바른 주소가 아닙니다('{value}')")
        return None


def _check_shape(data) -> None:
    """형태가 틀린 입력은 내용 검사 전에 막는다. 어떤 입력에도 예외 대신 INVALID가 되게 한다."""
    def is_list_of_dicts(value) -> bool:
        return isinstance(value, list) and all(isinstance(item, dict) for item in value)

    if not isinstance(data, dict):
        raise Invalid(["네트워크 입력은 객체여야 합니다"])
    if not is_list_of_dicts(data.get("devices") or []):
        raise Invalid(["devices는 장비 객체의 목록이어야 합니다"])
    acls = data.get("acls") or {}
    if not isinstance(acls, dict) or not all(
        isinstance(lines, list) and all(isinstance(line, str) for line in lines) for lines in acls.values()
    ):
        raise Invalid(["acls는 {이름: [규칙 문자열, …]} 형태여야 합니다"])
    for device in data.get("devices") or []:
        if "stateful" in device and not isinstance(device["stateful"], bool):
            raise Invalid([f"{device.get('id', '?')}: stateful은 불리언이어야 합니다"])
        if device.get("stateful") and device.get("kind") != "router":
            raise Invalid(["stateful은 router 장비에만 지정할 수 있습니다"])
        for key in ("interfaces", "routes"):
            if not is_list_of_dicts(device.get(key) or []):
                raise Invalid([f"{device.get('id', '?')}: {key} 항목은 객체의 목록이어야 합니다"])
        for iface in device.get("interfaces") or []:
            structured = "rules_in" in iface or "default_in" in iface
            if structured and not device.get("stateful", False):
                raise Invalid(["rules_in·default_in은 stateful: true 장비에만 지정할 수 있습니다"])
            if device.get("stateful") and ("acl_in" in iface or "acl_out" in iface):
                raise Invalid(["상태 추적 장비의 구조화 규칙과 acl_in·acl_out을 섞을 수 없습니다"])
            if "rules_in" in iface and not is_list_of_dicts(iface["rules_in"]):
                raise Invalid(["rules_in은 규칙 객체의 목록이어야 합니다"])
            if "default_in" in iface and iface["default_in"] not in ("pass", "block", "unknown"):
                raise Invalid(["default_in은 pass·block·unknown만 됩니다"])


def load(data: dict) -> Network:
    """사전(JSON) 입력을 모델로 바꾼다. 성립하지 않는 입력은 문제를 모두 모아 Invalid로 돌려준다."""
    _check_shape(data)
    problems: list[str] = []
    acls = {str(name): parse_acl(str(name), list(lines)) for name, lines in (data.get("acls") or {}).items()}
    devices: dict[str, Device] = {}

    for raw_device in data.get("devices") or []:
        device_id = str(raw_device.get("id", "")).strip()
        kind = raw_device.get("kind")
        if not device_id:
            problems.append("이름 없는 장비가 있습니다")
            continue
        if device_id in devices:
            problems.append(f"장비 이름이 두 번 쓰였습니다: {device_id}")
            continue
        if kind not in KINDS:
            problems.append(f"{device_id}: 종류는 host·router만 됩니다('{kind}')")
            continue
        device = Device(device_id, kind, stateful=raw_device.get("stateful", False))
        if device.stateful:
            device.firewall_unsupported = tuple(sorted(set(raw_device) - {"id", "kind", "stateful", "interfaces", "routes"}))
            for route in raw_device.get("routes") or []:
                device.firewall_unsupported += tuple(f"route.{key}" for key in sorted(set(route) - {"prefix", "next_hop", "out_if"}))
        for raw_if in raw_device.get("interfaces") or []:
            name = str(raw_if.get("name", "")).strip() or "eth0"
            where = f"{device_id} {name}"
            ip = _parse(ipaddress.IPv4Interface, raw_if.get("ip"), problems, where)
            if ip is None:
                continue
            if "/" not in str(raw_if.get("ip")):
                problems.append(f"{where}: 접두사 길이(/24 등)가 없습니다")
                continue
            for direction in ("acl_in", "acl_out"):
                acl = raw_if.get(direction)
                if acl is not None and str(acl) not in acls:
                    problems.append(f"{where}: {direction}에 없는 ACL을 붙였습니다('{acl}')")
            if kind == "host" and ip.network.prefixlen <= 30 and ip.ip in (
                ip.network.network_address,
                ip.network.broadcast_address,
            ):
                problems.append(f"{where}: 주소 {ip.ip}은(는) {ip.network}의 네트워크·브로드캐스트 주소라 호스트에 쓸 수 없습니다")
            if kind == "host" and (raw_if.get("acl_in") or raw_if.get("acl_out")):
                problems.append(f"{where}: 호스트 방화벽은 모델 밖입니다. ACL은 라우터 인터페이스에만 붙입니다")
            iface = Interface(
                device_id,
                name,
                ip,
                str(raw_if["acl_in"]) if raw_if.get("acl_in") is not None else None,
                str(raw_if["acl_out"]) if raw_if.get("acl_out") is not None else None,
                parse_rules(raw_if.get("rules_in", []), where) if device.stateful else (),
                raw_if.get("default_in", "unknown") if device.stateful else "unknown",
                tuple(sorted(set(raw_if) - {"name", "ip", "rules_in", "default_in"})) if device.stateful else (),
            )
            for other in device.interfaces:
                if other.name == name:
                    problems.append(f"{where}: 인터페이스 이름이 두 번 쓰였습니다")
                elif other.network.overlaps(iface.network):
                    problems.append(f"{device_id}: {other.name}({other.network})와 {name}({iface.network})의 서브넷이 겹칩니다")
            device.interfaces.append(iface)
        if not raw_device.get("interfaces"):
            problems.append(f"{device_id}: 인터페이스가 없습니다")

        if kind == "host" and raw_device.get("gateway"):
            gateway = _parse(ipaddress.IPv4Address, raw_device["gateway"], problems, f"{device_id} 게이트웨이")
            if gateway is not None and device.interfaces and not any(gateway in i.network for i in device.interfaces):
                problems.append(f"{device_id}: 기본 게이트웨이({gateway})가 자기 서브넷 밖입니다")
            device.gateway = gateway

        for raw_route in raw_device.get("routes") or []:
            where = f"{device_id} 경로"
            if kind != "router":
                problems.append(f"{device_id}: 호스트의 정적 경로는 모델 밖입니다. 기본 게이트웨이만 씁니다")
                break
            try:
                prefix = ipaddress.IPv4Network(raw_route.get("prefix"), strict=True)
            except (ValueError, TypeError):
                problems.append(f"{where}: 목적지 '{raw_route.get('prefix')}'는 올바른 네트워크가 아닙니다(호스트 비트가 켜졌는지 확인)")
                continue
            next_hop = None
            if raw_route.get("next_hop"):
                next_hop = _parse(ipaddress.IPv4Address, raw_route["next_hop"], problems, where)
                if next_hop is None:
                    continue
            out_if = raw_route.get("out_if")
            if next_hop is None and not out_if:
                problems.append(f"{where}: {prefix}에 다음 홉도 나갈 인터페이스도 없습니다")
                continue
            raw = f"ip route {prefix.network_address} {prefix.netmask} {next_hop or out_if}"
            device.routes.append(Route(prefix, next_hop, out_if, raw))
        devices[device_id] = device

    seen: dict[ipaddress.IPv4Address, str] = {}
    for device in devices.values():
        for iface in device.interfaces:
            if iface.ip.ip in seen:
                problems.append(f"주소 {iface.ip.ip}이(가) {seen[iface.ip.ip]}, {iface.label}에 함께 쓰였습니다")
            seen[iface.ip.ip] = iface.label
        for route in device.routes:
            if route.out_if and device.interface(route.out_if) is None:
                problems.append(f"{device.id} 경로: 없는 인터페이스 '{route.out_if}'")

    if problems:
        raise Invalid(problems)
    options = tuple(sorted(set(data) - {"devices", "acls"})) if any(d.stateful for d in devices.values()) else ()
    return Network(devices, acls, options)
