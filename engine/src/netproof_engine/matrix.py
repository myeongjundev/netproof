"""Bounded host reachability checks; verdicts always come from verify (ADR-001)."""

from __future__ import annotations

import ipaddress

from .errors import Invalid, Unsupported
from .model import load
from .verify import RESULTS, verify

LIMITS = {"endpoints": 24, "services": 8, "intents": 500, "checks": 2000}
POLICIES = ("EXPOSED", "BLOCKED", "UNDECIDED", "AGREE", "NO_POLICY")


def _service(raw):
    if not isinstance(raw, dict):
        raise ValueError("서비스는 객체여야 합니다")
    proto = raw.get("proto")
    label = raw.get("label", "")
    if not isinstance(label, str) or len(label) > 80:
        raise ValueError("서비스 이름은 80자 이하 문자열이어야 합니다")
    if proto in ("tcp", "udp"):
        port = raw.get("dst_port")
        if type(port) is not int or not 1 <= port <= 65535:
            raise ValueError("TCP/UDP 목적지 포트는 1~65535 정수여야 합니다")
        return {"key": f"{proto}/{port}", "proto": proto, "dst_port": port, "label": label}
    if proto == "icmp":
        value = raw.get("icmp", "echo")
        if value in ("echo", "echo-reply"):
            number = 8 if value == "echo" else 0
        elif type(value) is int:
            number = value
        elif isinstance(value, str) and 1 <= len(value) <= 3 and value.isascii() and value.isdecimal():
            number = int(value)
        else:
            raise ValueError("ICMP 종류는 echo·echo-reply 또는 0~255 숫자여야 합니다")
        if not 0 <= number <= 255:
            raise ValueError("ICMP 종류는 0~255여야 합니다")
        canonical = {8: "echo", 0: "echo-reply"}.get(number, str(number))
        return {"key": f"icmp/{canonical}", "proto": proto, "icmp": canonical, "label": label}
    raise ValueError("서비스 프로토콜은 tcp·udp·icmp만 됩니다")


def _intent_key(raw):
    if not isinstance(raw, dict):
        raise ValueError("의도는 객체여야 합니다")
    if not all(isinstance(raw.get(key), str) for key in ("src", "dst")):
        raise ValueError("의도의 src·dst는 IPv4 주소 문자열이어야 합니다")
    src, dst = (str(ipaddress.IPv4Address(raw.get(key))) for key in ("src", "dst"))
    key = raw.get("service")
    if not isinstance(key, str) or "/" not in key:
        raise ValueError("의도의 service는 tcp/443 같은 서비스 키여야 합니다")
    proto, value = key.split("/", 1)
    if proto in ("tcp", "udp"):
        if not 1 <= len(value) <= 5 or not value.isascii() or not value.isdecimal():
            raise ValueError("의도의 서비스 포트가 잘못되었습니다")
        service = _service({"proto": proto, "dst_port": int(value)})
    else:
        service = _service({"proto": proto, "icmp": value})
    return src, dst, service["key"]


def policy_matrix(network_data: dict, spec: dict) -> dict:
    """Return normalized cells and policy counts, without changing single-flow semantics."""
    from . import __version__

    response = {"status": "INVALID", "problems": [], "mode": "session", "engine_version": __version__,
                "endpoints": [], "services": [], "cells": [], "exposures": [],
                "totals": dict.fromkeys(("checks", *RESULTS, *POLICIES), 0), "limit_exceeded": False}

    def reject(problem, limit=False):
        response["problems"] = problem if isinstance(problem, list) else [problem]
        response["limit_exceeded"] = limit
        return response

    try:
        if not isinstance(spec, dict):
            return reject("spec은 객체여야 합니다")
        mode = spec.get("mode", "session")
        if mode not in ("session", "one-way"):
            return reject("모드는 session·one-way만 됩니다")
        response["mode"] = mode
        for field in ("services", "intents"):
            raw = spec.get(field, [] if field == "intents" else None)
            if not isinstance(raw, list):
                return reject(f"{field}는 목록이어야 합니다")
            if len(raw) > LIMITS[field]:
                return reject(f"{field} {len(raw)}개: 최대 {LIMITS[field]}개입니다", True)
        services = {}
        for raw in spec["services"]:
            service = _service(raw)
            services.setdefault(service["key"], service)
        if not services:
            return reject("서비스를 하나 이상 지정하세요")
        network = load(network_data)
        endpoints = sorted(
            [{"ip": str(iface.ip.ip), "device": device.id, "interface": iface.name}
             for device in network.devices.values() if device.kind == "host" for iface in device.interfaces],
            key=lambda item: (item["device"], item["interface"]),
        )
        if len(endpoints) > LIMITS["endpoints"]:
            return reject(f"끝점 {len(endpoints)}개: 최대 {LIMITS['endpoints']}개입니다", True)
        pairs = [(src, dst) for src in endpoints for dst in endpoints
                 if src["device"] != dst["device"] and src["ip"] != dst["ip"]]
        checks = len(pairs) * len(services)
        if checks > LIMITS["checks"]:
            return reject(f"검사 {checks}건: 최대 {LIMITS['checks']}건입니다", True)
        allowed = {(src["ip"], dst["ip"]) for src, dst in pairs}
        intents = {}
        for raw in spec.get("intents", []):
            key = _intent_key(raw)
            if key[:2] not in allowed or key[2] not in services:
                return reject(f"의도 {key[0]} → {key[1]} · {key[2]}: 끝점·서비스가 검사 대상에 없습니다(같은 장비 내부 쌍 제외)")
            expect = raw.get("expect")
            if expect not in ("PASS", "DENY"):
                return reject("의도 expect는 PASS·DENY만 됩니다")
            note = raw.get("note", "")
            if not isinstance(note, str) or len(note) > 200:
                return reject("의도 메모는 200자 이하 문자열이어야 합니다")
            if key in intents and intents[key] != expect:
                return reject("같은 통신에 서로 다른 의도가 있습니다")
            intents[key] = expect
    except Invalid as exc:
        return reject(exc.problems)
    except Unsupported as exc:
        return reject(str(exc))
    except (ValueError, TypeError, AttributeError, KeyError) as exc:
        return reject(f"입력 형식을 확인하세요: {exc}")

    response.update(status="OK", endpoints=endpoints, services=list(services.values()))
    for src, dst in pairs:
        for key, service in services.items():
            flow = {"src": src["ip"], "dst": dst["ip"], "mode": mode,
                    **{field: value for field, value in service.items() if field in ("proto", "dst_port", "icmp")}}
            try:
                verdict = verify(network_data, flow)
            except (ValueError, TypeError, AttributeError, KeyError):
                # Keep malformed legacy input inside this new API boundary; verify itself is unchanged.
                verdict = {"result": "INVALID", "reason": "입력 형식을 확인하세요", "decisive": None}
            result = verdict["result"]
            expect = intents.get((src["ip"], dst["ip"], key))
            if result not in ("PASS", "DENY"):
                policy = "UNDECIDED"
            elif expect is None:
                policy = "NO_POLICY"
            elif expect == result:
                policy = "AGREE"
            else:
                policy = "EXPOSED" if expect == "DENY" else "BLOCKED"
            cell = {"src": src["ip"], "dst": dst["ip"], "service": key, "result": result,
                    "policy": policy, "expect": expect, "reason": verdict["reason"], "decisive": verdict["decisive"]}
            response["cells"].append(cell)
            response["totals"]["checks"] += 1
            response["totals"][result] += 1
            response["totals"][policy] += 1
    response["exposures"] = sorted(
        [cell for cell in response["cells"] if cell["policy"] in ("EXPOSED", "BLOCKED", "UNDECIDED")],
        key=lambda cell: (POLICIES.index(cell["policy"]), cell["src"], cell["dst"], cell["service"]),
    )
    return response
