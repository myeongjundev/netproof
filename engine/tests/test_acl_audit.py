import ipaddress
from itertools import product
from time import perf_counter

import pytest
from hypothesis import given, seed, settings, strategies as st

from netproof_engine import acl_audit
from netproof_engine import audit
from netproof_engine.acl import Acl, Packet, Rule, parse_acl


def inspect(*lines):
    return acl_audit({"acls": {"101": list(lines)}})["acls"][0]["lines"]


@pytest.mark.parametrize("action,finding", [("deny", "shadowed"), ("permit", "redundant_earlier")])
def test_union_cover(action, finding):
    lines = inspect(f"{action} ip 10.0.0.0/25 any", f"{action} ip 10.0.0.128/25 any",
                    "permit ip 10.0.0.0/24 any")
    assert lines[2]["finding"] == finding
    assert lines[2]["by"] == [1, 2]


def test_partial_overlap_and_opposite_below():
    assert inspect("deny ip 10.0.0.0/25 any", "permit ip 10.0.0.0/24 any")[1]["finding"] is None
    assert inspect("permit tcp any any", "deny tcp any any eq 80", "permit ip any any")[0]["finding"] is None


def test_later_union_and_implicit_deny():
    lines = inspect("permit ip 10.0.0.0/24 any", "permit ip 10.0.0.0/25 any", "permit ip 10.0.0.128/25 any")
    assert (lines[0]["finding"], lines[0]["by"]) == ("redundant_later", [2, 3])
    line = inspect("deny ip any any")[0]
    assert line["finding"] == "redundant_later" and line["implicit_deny"]
    assert inspect("permit ip any any")[0]["finding"] is None


@pytest.mark.parametrize("line", ["permit tcp any any lt 1", "deny udp any any gt 65535", "permit icmp any any 300", "permit tcp any eq 0 any"])
def test_empty_packet_space(line):
    assert inspect(line)[0]["finding"] == "never_matches"


def test_neq_ack_and_protocols():
    assert inspect("deny tcp any any neq 80", "permit tcp any any eq 80")[1]["finding"] is None
    assert inspect("deny tcp any any established", "permit tcp any any")[1]["finding"] is None
    assert inspect("deny tcp any any", "permit tcp any any established")[1]["finding"] == "shadowed"
    lines = inspect("deny ip any any", "permit tcp any any", "permit udp any any", "permit icmp any any")
    assert all(line["finding"] == "shadowed" for line in lines[1:])


def test_unread_stops_with_original_positions():
    lines = inspect("", "remark example", "permit tcp any any eq 80", "not a rule", "permit ip any any", "bad again")
    assert [line["line"] for line in lines] == [2, 3, 4, 5, 6]
    assert [line["kind"] for line in lines] == ["remark", "rule", "unread", "unchecked", "unchecked"]
    assert lines[1]["undetermined_reason"] == "unread_below"
    result = acl_audit({"acls": {"a": ["deny ip any any", "bad", "permit ip any any"]}})
    assert result["acls"][0]["unchecked_from"] == 2
    assert result["acls"][0]["lines"][0]["undetermined_reason"] == "unread_below"
    # A line fully caught above can be classified even with an unread line below.
    assert inspect("deny ip any any", "permit ip any any", "bad")[1]["finding"] == "shadowed"


def test_limits_global_and_per_line(monkeypatch):
    monkeypatch.setattr(audit, "MAX_INTERSECTIONS", 1)
    result = acl_audit({"acls": {"a": ["permit ip any any", "deny tcp any any"], "b": ["deny ip any any"]}})
    assert result["acls"][0]["lines"][0]["undetermined_reason"] == "limit"
    assert result["acls"][1]["lines"][0]["undetermined_reason"] == "limit"
    monkeypatch.setattr(audit, "MAX_INTERSECTIONS", 100_000)
    monkeypatch.setattr(audit, "MAX_BOXES", 1)
    lines = inspect("deny tcp host 0.0.0.2 any eq 2", "permit tcp any any")
    assert lines[1]["undetermined_reason"] == "limit"


def test_open_and_catch_all():
    lines = inspect("permit ip any any log", "permit tcp any any", "permit icmp any any", "deny ip any any")
    assert lines[0]["open"] == ["src", "dst", "proto"] and lines[0]["catch_all"]
    assert lines[1]["open"] == ["src", "dst", "dst_port"]
    assert lines[2]["open"] == ["src", "dst", "icmp_type"]
    assert lines[3]["open"] == []


@pytest.mark.parametrize("data", [None, [], {"acls": {"a": [3]}}, {"devices": "bad"}, {"acls": {"a": ["permit ip host broken any"]}}])
def test_invalid_boundary(data):
    result = acl_audit(data)
    assert result["status"] == "INVALID" and result["problems"]
    assert result["acls"] == [] and not any(result["totals"].values())


def test_topology_does_not_block_audit():
    assert acl_audit({"devices": [{"kind": "host", "gateway": "bad"}], "acls": {"a": ["permit ip any any"]}})["status"] == "OK"


def boundary_packets(rules):
    """Exhaust every cell of the partition induced by all rule boundaries ±1."""
    src, dst, sport, dport, types = [{0, 2**32 - 1}, {0, 2**32 - 1}, {1, 65535}, {1, 65535}, {0, 255}]
    def add(pool, values, lower, upper):
        pool.update(v + delta for v in values for delta in (-1, 0, 1) if lower <= v + delta <= upper)
    for rule in rules:
        add(src, (int(rule.src.network_address), int(rule.src.broadcast_address)), 0, 2**32 - 1)
        add(dst, (int(rule.dst.network_address), int(rule.dst.broadcast_address)), 0, 2**32 - 1)
        for pool, match in ((sport, rule.src_port), (dport, rule.dst_port)):
            if match:
                add(pool, [match.lo] + ([match.hi] if match.hi is not None else []), 1, 65535)
        if rule.icmp_type is not None:
            add(types, [rule.icmp_type], 0, 255)
    for s, d in product(sorted(src), sorted(dst)):
        s, d = ipaddress.IPv4Address(s), ipaddress.IPv4Address(d)
        for proto in ("tcp", "udp"):
            for sp, dp, ack in product(sorted(sport), sorted(dport), (False, True) if proto == "tcp" else (False,)):
                yield Packet(s, d, proto, sp, dp, ack=ack)
        for t in sorted(types):
            yield Packet(s, d, "icmp", icmp_type=t)


def check_against_evaluate(raw):
    acl = parse_acl("a", raw)
    assert all(isinstance(r, Rule) for r in acl.lines)
    entries = inspect(*raw)
    changed, decisive = set(), set()
    removed = [Acl("a", acl.lines[:i] + acl.lines[i + 1:]) for i in range(len(acl.lines))]
    rule_boxes = [audit._rule_boxes(r) for r in acl.lines]
    for packet in boundary_packets(acl.lines):
        result, winner = acl.evaluate(packet)
        if winner:
            decisive.add(winner.line)
        for i, other in enumerate(removed):
            if other.evaluate(packet)[0] != result:
                changed.add(i)
            coordinates = [int(packet.src), int(packet.dst)]
            coordinates += [packet.icmp_type] if packet.proto == "icmp" else [packet.sport, packet.dport]
            if packet.proto == "tcp":
                coordinates.append(int(packet.ack))
            inside = any(proto == packet.proto and all(lo <= v <= hi for v, (lo, hi) in zip(coordinates, dims)) for proto, dims in rule_boxes[i])
            assert inside == acl.lines[i].matches(packet)
    for i, entry in enumerate(entries):
        assert entry["finding"] != "undetermined"
        assert (i not in changed) == (entry["finding"] is not None)
        if entry["finding"] in ("never_matches", "shadowed", "redundant_earlier"):
            assert entry["line"] not in decisive


addresses = st.sampled_from(["any", "0.0.0.0/31", "host 0.0.0.1", "0.0.0.0/30"])
ports = st.sampled_from(["", " eq 0", " eq 2", " neq 2", " lt 1", " lt 2", " gt 2", " gt 65535", " range 1 2"])


@st.composite
def rule_text(draw):
    action = draw(st.sampled_from(["permit", "deny"]))
    proto = draw(st.sampled_from(["ip", "tcp", "udp", "icmp"]))
    src, dst = draw(addresses), draw(addresses)
    sp = draw(ports) if proto in ("tcp", "udp") else ""
    dp = draw(ports) if proto in ("tcp", "udp") else ""
    option = draw(st.sampled_from(["", " established"])) if proto == "tcp" else ""
    if proto == "icmp":
        option = draw(st.sampled_from(["", " 0", " 2", " 255", " 300"]))
    return f"{action} {proto} {src}{sp} {dst}{dp}{option}"


@seed(20261003)
@settings(max_examples=20, deadline=None)
@given(st.lists(rule_text(), min_size=1, max_size=5))
def test_boundary_partition_crosscheck(raw):
    check_against_evaluate(raw)


def test_fixed_crosscheck_union_and_ack():
    check_against_evaluate(["deny tcp 0.0.0.0/31 any neq 2 established", "permit tcp 0.0.0.0/30 any eq 2",
                           "deny icmp any any 2", "permit ip any any"])


@pytest.mark.parametrize("condition", ["eq 0", "eq 2", "neq 2", "lt 1", "lt 2", "gt 2", "gt 65535", "range 1 2"])
def test_all_port_conditions_both_dimensions(condition):
    check_against_evaluate([f"deny tcp any {condition} any {condition} established",
                           f"permit udp any {condition} any {condition}", "permit ip any any"])


def test_causal_lines_and_per_line_limit_continues(monkeypatch):
    lines = inspect("deny ip any any", "permit ip any any", "permit ip any any")
    assert lines[2]["by"] == [1]  # Line 2 never catches a remaining packet.
    monkeypatch.setattr(audit, "MAX_BOXES", 1)
    lines = inspect("permit tcp any any neq 2", "permit udp any any")
    assert lines[0]["undetermined_reason"] == "limit"
    assert lines[1]["finding"] is None


def worst_case_lines():
    return [f"{'permit' if i % 2 else 'deny'} tcp 10.{i % 16}.0.0/{16 + i % 9} neq {1 + i % 31} 172.16.{i % 32}.0/{24 + i % 5} neq {2 + i % 37}"
            for i in range(500)]


def test_500_line_bounded_measurement():
    start = perf_counter()
    result = acl_audit({"acls": {"worst": worst_case_lines()}})
    elapsed = perf_counter() - start
    print(f"500-line mixed-prefix/neq: {elapsed:.6f}s; operations limit={audit.MAX_INTERSECTIONS}; totals={result['totals']}")
    assert len(result["acls"][0]["lines"]) == 500
    assert result["totals"]["undetermined"] > 0
