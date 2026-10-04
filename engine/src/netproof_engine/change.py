"""Compare bounded matrix verdicts; no single-flow semantics are changed."""

from . import __version__
from .errors import Invalid, Unsupported
from .matrix import LIMITS, _service, policy_matrix
from .verify import _flow_packet


def change_impact(before, after, flow, services):
    response = {"status": "INVALID", "problems": [], "limit_exceeded": False,
                "engine_version": __version__, "mode": "session", "services": [], "changes": [],
                "totals": dict.fromkeys(("checks", "changed", "opened", "closed", "other", "not_compared"), 0)}

    def reject(problems, limit=False):
        response["problems"] = problems if isinstance(problems, list) else [problems]
        response["limit_exceeded"] = limit
        return response

    try:
        if not isinstance(flow, dict):
            return reject("flow는 객체여야 합니다")
        # Reuse verify's input parser, including aliases and its port validation.
        try:
            packet, mode = _flow_packet(flow)
        except Unsupported:
            # Session ICMP other than echo is well formed, but not supported.
            packet, _ = _flow_packet({**flow, "mode": "one-way"})
            mode = flow.get("mode", "session")
        response["mode"] = mode
        if not isinstance(services, list):
            return reject("services는 목록이어야 합니다")
        if len(services) > LIMITS["services"]:
            return reject(f"services {len(services)}개: 최대 {LIMITS['services']}개입니다", True)
        normalized = {}
        for raw in services:
            service = _service(raw)
            normalized.setdefault(service["key"], service)
        selected = _service({"proto": packet.proto, **(
            {"icmp": packet.icmp_type} if packet.proto == "icmp" else {"dst_port": packet.dport})})
        normalized.setdefault(selected["key"], selected)
    except Invalid as exc:
        return reject(exc.problems)
    except (ValueError, TypeError, AttributeError, KeyError) as exc:
        return reject(f"입력 형식을 확인하세요: {exc}")

    spec = {"services": list(normalized.values()), "mode": mode}
    matrices = [policy_matrix(before, spec), policy_matrix(after, spec)]
    if any(matrix["status"] == "INVALID" for matrix in matrices):
        return reject([f"{label} 구성: {problem}" for label, matrix in zip(("변경 전", "변경 후"), matrices)
                       for problem in matrix["problems"]], any(m["limit_exceeded"] for m in matrices))

    selected_key = (str(packet.src), str(packet.dst), selected["key"])
    def cells(matrix):
        return {(c["src"], c["dst"], c["service"]): c for c in matrix["cells"]
                if (c["src"], c["dst"], c["service"]) != selected_key}

    left, right = (cells(m) for m in matrices)
    shared = left.keys() & right.keys()
    response.update(status="OK", services=matrices[1]["services"])
    response["totals"]["checks"] = len(shared)
    response["totals"]["not_compared"] = len(left.keys() ^ right.keys())
    owners = {endpoint["ip"]: endpoint["device"] for endpoint in matrices[1]["endpoints"]}
    for key in shared:
        old, new = left[key], right[key]
        if old["result"] == new["result"]:
            continue
        kind = "opened" if (old["result"], new["result"]) == ("DENY", "PASS") else (
            "closed" if (old["result"], new["result"]) == ("PASS", "DENY") else "other")
        response["totals"][kind] += 1
        response["changes"].append({"src": key[0], "dst": key[1], "service": key[2], "kind": kind,
                                    "src_device": owners[key[0]], "dst_device": owners[key[1]],
                                    "before": {field: old[field] for field in ("result", "reason", "decisive")},
                                    "after": {field: new[field] for field in ("result", "reason", "decisive")}})
    response["changes"].sort(key=lambda c: (("opened", "closed", "other").index(c["kind"]), c["src"], c["dst"], c["service"]))
    response["totals"]["changed"] = len(response["changes"])
    return response
