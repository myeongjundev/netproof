"""Insertion-only ACL proposals, checked exclusively by the existing verifier."""
from copy import deepcopy

from .acl import ICMP_TYPES, parse_rule
from .model import load
from .verify import _flow_packet, _reverse, verify

MAX_EDITS = 4
MAX_DENY_CANDIDATES = 8
MAX_VERIFY_CALLS = 9
MAX_ACL_LINES = 500  # Same total input-line ceiling as server LIMITS["acl_lines"].


class _NoCandidate(Exception):
    pass


def _apply(original, edits):
    """Rebuild from original anchors; return the original index of every line."""
    network = deepcopy(original)
    origins = {}
    for name, raw in original.get("acls", {}).items():
        lines, indexes = [], []
        for line, text in enumerate(raw, 1):
            for edit in edits:
                if edit["acl"] == name and edit["anchor_before"] == line:
                    edit["insert_at"] = len(lines) + 1
                    lines.append(edit["raw"])
                    indexes.append(None)
            lines.append(text)
            indexes.append(line)
        for edit in edits:
            if edit["acl"] == name and edit["anchor_before"] is None:
                edit["insert_at"] = len(lines) + 1
                lines.append(edit["raw"])
                indexes.append(None)
        network["acls"][name] = lines
        origins[name] = indexes
    if sum(len(lines) for lines in network.get("acls", {}).values()) > MAX_ACL_LINES:
        raise _NoCandidate("line_limit")
    return network, origins


def _raw(packet, action, backward):
    text = f"{action} {packet.proto} host {packet.src}"
    if backward and packet.proto in ("tcp", "udp"):
        text += f" eq {packet.sport}"
    text += f" host {packet.dst}"
    if packet.proto == "icmp":
        kind = next((name for name, value in ICMP_TYPES.items() if value == packet.icmp_type), str(packet.icmp_type))
        text += f" {kind}"
    elif backward:
        if packet.proto == "tcp":
            text += " established"
    else:
        text += f" eq {packet.dport}"
    rule = parse_rule(text, 1)
    if rule is None or not rule.matches(packet):
        raise _NoCandidate("reverify_failed")
    return text


def _edit(hop, packet, action, path, anchor, shared):
    direction = "in" if hop["step"] == "acl_in" else "out"
    return {"acl": hop["acl"], "anchor_before": anchor, "insert_at": 0,
            "raw": _raw(packet, action, path == "return"), "action": action,
            "device": hop["device"], "interface": hop[f"{direction}_if"],
            "direction": direction, "path": path, "shared_by": shared[hop["acl"]]}


def suggest(network_data, flow, target) -> dict:
    """No writes, no new verdict rules, and no unverified candidate responses."""
    from . import __version__
    result = {"status": "INVALID", "target": target if target in ("PASS", "DENY") else None,
              "reason": None, "problems": [], "engine_version": __version__, "truncated": False,
              "before": None, "candidates": []}
    if result["target"] is None:
        result["problems"] = ["목표는 PASS 또는 DENY를 직접 골라야 합니다"]
        return result
    calls = 0

    def check(network):
        nonlocal calls
        if calls >= MAX_VERIFY_CALLS:
            raise _NoCandidate("reverify_failed")
        calls += 1
        return verify(network, flow)

    try:
        original = deepcopy(network_data)
        before = check(original)
        result["before"] = before
        result["status"] = "NO_CANDIDATE"
        if before["result"] not in ("PASS", "DENY"):
            result["reason"] = "not_decidable"
            return result
        if before["result"] == target:
            result["status"] = "ALREADY"
            return result
        network = load(original)
        # load also canonicalizes ACL names to strings (JSON object keys are strings).
        original["acls"] = {str(name): lines for name, lines in (original.get("acls") or {}).items()}
        shared = {}
        for name in network.acls:
            attached = []
            for iface in network.all_interfaces():
                for direction in ("in", "out"):
                    if getattr(iface, f"acl_{direction}") == name:
                        attached.append({"device": iface.device, "interface": iface.name, "direction": direction})
            shared[name] = sorted(attached, key=lambda x: (x["device"], x["interface"], x["direction"]))
        packet, _ = _flow_packet(flow)
        if target == "PASS":
            edits = []
            current, origins = _apply(original, edits)
            after = before
            while after["result"] == "DENY":
                hop = after["decisive"]
                if not hop or hop["step"] not in ("acl_in", "acl_out") or hop["result"] != "drop":
                    raise _NoCandidate("not_acl_cause")
                if len(edits) >= MAX_EDITS:
                    raise _NoCandidate("edit_limit")
                path = "forward" if not after["forward"]["delivered"] else "return"
                line = hop["rule_line"]
                anchor = origins[hop["acl"]][line - 1] if line is not None else None
                if line is not None and anchor is None:
                    raise _NoCandidate("reverify_failed")
                edits.append(_edit(hop, packet if path == "forward" else _reverse(packet), "permit", path, anchor, shared))
                current, origins = _apply(original, edits)
                after = check(current)
                if after["result"] not in ("PASS", "DENY"):
                    raise _NoCandidate("reverify_failed")
            result["candidates"] = [{"id": "c1", "edits": edits, "after": after}]
        else:
            hops, seen = [], set()
            for hop in before["forward"]["hops"]:
                key = (hop.get("acl"), hop.get("rule_line"))
                if hop["step"] in ("acl_in", "acl_out") and hop["result"] == "ok" and key not in seen:
                    hops.append(hop)
                    seen.add(key)
            if not hops:
                raise _NoCandidate("no_acl_on_path")
            result["truncated"] = len(hops) > MAX_DENY_CANDIDATES
            line_limited = 0
            for hop in hops[:MAX_DENY_CANDIDATES]:
                edits = [_edit(hop, packet, "deny", "forward", hop["rule_line"], shared)]
                try:
                    current, _ = _apply(original, edits)
                except _NoCandidate:
                    line_limited += 1
                    continue
                after = check(current)
                if after["result"] == "DENY":
                    result["candidates"].append({"id": f"c{len(result['candidates']) + 1}", "edits": edits, "after": after})
            if not result["candidates"]:
                raise _NoCandidate("line_limit" if line_limited == min(len(hops), MAX_DENY_CANDIDATES) else "reverify_failed")
        result["status"] = "OK"
    except _NoCandidate as exc:
        result.update(status="NO_CANDIDATE", reason=str(exc), candidates=[])
    except (ValueError, TypeError, AttributeError, KeyError, OverflowError, IndexError) as exc:
        result.update(status="INVALID", before=None, candidates=[], reason=None,
                      problems=[f"입력 형식을 확인하세요: {exc}"], truncated=False)
    return result
