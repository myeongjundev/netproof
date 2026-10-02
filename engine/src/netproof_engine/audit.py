"""Exact, bounded ACL set analysis; never changes reachability verdicts."""
from __future__ import annotations

from itertools import product

from .acl import ANY, Rule, UnreadLine, parse_acl
from .errors import Invalid
from .model import _check_shape

MAX_BOXES = 2000
MAX_INTERSECTIONS = 100_000
FINDINGS = ("shadowed", "redundant_earlier", "redundant_later", "never_matches", "undetermined")
# A box is (protocol, closed intervals). Different protocols never intersect.


class _Limit(Exception):
    pass


class _Budget:
    def __init__(self):
        self.operations = 0
        self.exhausted = False

    def tick(self):
        self.operations += 1
        if self.operations > MAX_INTERSECTIONS:
            self.exhausted = True
            raise _Limit


def _ports(match):
    if match is None:
        return [(1, 65535)]
    p = match.lo
    intervals = {
        "eq": [(p, p)], "neq": [(1, p - 1), (p + 1, 65535)],
        "lt": [(1, p - 1)], "gt": [(p + 1, 65535)],
        "range": [(p, match.hi if match.hi is not None else p)],
    }[match.op]
    return [(max(1, lo), min(65535, hi)) for lo, hi in intervals if max(1, lo) <= min(65535, hi)]


def _rule_boxes(rule):
    addresses = ((int(rule.src.network_address), int(rule.src.broadcast_address)),
                 (int(rule.dst.network_address), int(rule.dst.broadcast_address)))
    boxes = []
    for proto in (("tcp", "udp", "icmp") if rule.proto == "ip" else (rule.proto,)):
        if proto == "icmp":
            types = (0, 255) if rule.icmp_type is None else (rule.icmp_type, rule.icmp_type)
            if 0 <= types[0] <= types[1] <= 255:
                boxes.append((proto, (*addresses, types)))
        else:
            for sport, dport in product(_ports(rule.src_port), _ports(rule.dst_port)):
                dims = (*addresses, sport, dport)
                if proto == "tcp":
                    dims += ((1, 1) if rule.established else (0, 1),)
                boxes.append((proto, dims))
    return boxes


def _subtract_box(box, cutter, budget):
    """Disjoint slabs of box minus cutter, plus whether they intersected."""
    budget.tick()
    proto, dims = box
    other_proto, other = cutter
    if proto != other_proto:
        return [box], False
    overlap = tuple((max(a, c), min(b, d)) for (a, b), (c, d) in zip(dims, other))
    if any(lo > hi for lo, hi in overlap):
        return [box], False
    core, pieces = list(dims), []
    for i, (lo, hi) in enumerate(overlap):
        a, b = core[i]
        if a < lo:
            slab = core.copy()
            slab[i] = (a, lo - 1)
            pieces.append((proto, tuple(slab)))
        if hi < b:
            slab = core.copy()
            slab[i] = (hi + 1, b)
            pieces.append((proto, tuple(slab)))
        core[i] = (lo, hi)
    return pieces, True


def _subtract(boxes, cutters, budget):
    touched = False
    for cutter in cutters:
        remaining = []
        for box in boxes:
            pieces, hit = _subtract_box(box, cutter, budget)
            touched |= hit
            remaining.extend(pieces)
            if len(remaining) > MAX_BOXES:
                raise _Limit
        boxes = remaining
        if not boxes:
            break
    return boxes, touched


def _classify(index, rules, boxes, budget):
    rule = rules[index]
    remaining = boxes[index]
    if len(remaining) > MAX_BOXES:
        raise _Limit
    if not remaining:
        return "never_matches", [], False, None
    by = []
    for j in range(index):
        remaining, hit = _subtract(remaining, boxes[j], budget)
        if hit:
            by.append(rules[j].line)
        if not remaining:
            opposite = any(r.action != rule.action for r in rules[:index] if r.line in by)
            return ("shadowed" if opposite else "redundant_earlier"), by, False, None
    by = []
    for j in range(index + 1, len(rules)):
        if isinstance(rules[j], UnreadLine):
            return "undetermined", [], False, "unread_below"
        after, hit = _subtract(remaining, boxes[j], budget)
        if hit:
            if rules[j].action != rule.action:
                return None, [], False, None
            by.append(rules[j].line)
            remaining = after
        if not remaining:
            return "redundant_later", by, False, None
    if rule.action == "deny":
        return "redundant_later", by, True, None
    return None, [], False, None


def _open(rule):
    if rule.action != "permit":
        return [], False
    fields = []
    if rule.src == ANY:
        fields.append("src")
    if rule.dst == ANY:
        fields.append("dst")
    if rule.proto == "ip":
        fields.append("proto")
    if rule.proto in ("tcp", "udp") and rule.dst_port is None:
        fields.append("dst_port")
    if rule.proto == "icmp" and rule.icmp_type is None:
        fields.append("icmp_type")
    return fields, rule.proto == "ip" and rule.src == ANY and rule.dst == ANY


def acl_audit(network_data) -> dict:
    """Only structural validation and ACL parsing; no topology load or DB writes."""
    from . import __version__
    response = {"status": "INVALID", "problems": [], "engine_version": __version__,
                "acls": [], "totals": dict.fromkeys(FINDINGS, 0)}
    try:
        _check_shape(network_data)
        parsed = [(str(name), raw, parse_acl(str(name), raw))
                  for name, raw in (network_data.get("acls") or {}).items()]
    except Invalid as exc:
        response["problems"] = exc.problems
        return response
    except (ValueError, TypeError, AttributeError, KeyError, OverflowError) as exc:
        response["problems"] = [f"입력 형식을 확인하세요: {exc}"]
        return response
    budget = _Budget()
    response["status"] = "OK"
    for name, raw_lines, acl in parsed:
        rules = acl.lines
        boxes = [_rule_boxes(r) if isinstance(r, Rule) else [] for r in rules]
        positions = {r.line if isinstance(r, Rule) else r.seq: i for i, r in enumerate(rules)}
        unread = next((r.seq for r in rules if isinstance(r, UnreadLine)), None)
        entries = []
        for line, raw in enumerate(raw_lines, 1):
            if not raw.strip():
                continue
            entry = {"line": line, "raw": raw.strip(), "kind": "remark", "action": None,
                     "finding": None, "by": [], "implicit_deny": False,
                     "undetermined_reason": None, "open": [], "catch_all": False}
            index = positions.get(line)
            if index is not None:
                rule = rules[index]
                if isinstance(rule, UnreadLine):
                    entry["kind"] = "unread" if line == unread else "unchecked"
                elif unread is not None and line > unread:
                    entry["kind"] = "unchecked"
                else:
                    entry.update(kind="rule", action=rule.action)
                    entry["open"], entry["catch_all"] = _open(rule)
                    try:
                        if budget.exhausted:
                            raise _Limit
                        finding, by, implicit, reason = _classify(index, rules, boxes, budget)
                    except _Limit:
                        finding, by, implicit, reason = "undetermined", [], False, "limit"
                    entry.update(finding=finding, by=by, implicit_deny=implicit, undetermined_reason=reason)
                    if finding:
                        response["totals"][finding] += 1
            entries.append(entry)
        response["acls"].append({"name": name, "unchecked_from": unread, "lines": entries})
    return response
