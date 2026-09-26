"""속성 테스트: 무작위 입력에서도 지켜져야 하는 성질."""

import ipaddress
import random

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from netproof_engine import verify
from netproof_engine.acl import ALL_ONES, Packet, PortMatch, parse_acl, wildcard_network
from netproof_engine.errors import Unsupported

addresses = st.integers(min_value=0, max_value=ALL_ONES)
prefixes = st.integers(min_value=0, max_value=32)
ports = st.integers(min_value=1, max_value=65535)


@given(addresses, prefixes)
def test_contiguous_wildcard_equals_cidr(address, prefix):
    mask = (ALL_ONES << (32 - prefix)) & ALL_ONES
    wildcard = str(ipaddress.IPv4Address(~mask & ALL_ONES))
    expected = ipaddress.IPv4Network((address, prefix), strict=False)
    assert wildcard_network(str(ipaddress.IPv4Address(address)), wildcard) == expected


@given(st.integers(min_value=0, max_value=ALL_ONES))
def test_only_contiguous_wildcards_are_accepted(wildcard):
    contiguous = (wildcard & (wildcard + 1)) == 0  # 0…01…1 꼴
    try:
        wildcard_network("10.0.0.0", str(ipaddress.IPv4Address(wildcard)))
        accepted = True
    except Unsupported:
        accepted = False
    assert accepted == contiguous


@given(ports, ports, ports)
def test_port_match_semantics(a, b, port):
    lo, hi = min(a, b), max(a, b)
    assert PortMatch("range", lo, hi).matches(port) == (lo <= port <= hi)
    assert PortMatch("eq", a).matches(port) != PortMatch("neq", a).matches(port)
    assert PortMatch("lt", a).matches(port) == (port < a)
    assert PortMatch("gt", a).matches(port) == (port > a)


RULE_LINES = st.lists(
    st.builds(
        lambda action, proto, src, dst, port: f"{action} {proto} {src} {dst}{port if proto in ('tcp', 'udp') else ''}",
        st.sampled_from(["permit", "deny"]),
        st.sampled_from(["ip", "tcp", "udp", "icmp"]),
        st.sampled_from(["any", "10.10.10.0 0.0.0.255", "host 10.10.10.10", "10.0.0.0/8"]),
        st.sampled_from(["any", "10.20.20.0 0.0.0.255", "host 10.20.20.5"]),
        st.sampled_from(["", " eq 443", " gt 1023", " range 80 90"]),
    ),
    max_size=6,
)


@given(RULE_LINES, st.sampled_from(["tcp", "udp", "icmp"]), ports)
def test_trailing_permit_any_only_changes_implicit_deny(lines, proto, port):
    pkt = Packet(
        ipaddress.IPv4Address("10.10.10.10"), ipaddress.IPv4Address("10.20.20.5"), proto,
        sport=50000 if proto != "icmp" else None, dport=port if proto != "icmp" else None,
        icmp_type=8 if proto == "icmp" else None,
    )
    before = parse_acl("A", lines).evaluate(pkt)
    after = parse_acl("A", lines + ["permit ip any any"]).evaluate(pkt)
    if before[1] is None:
        assert after[0] == "permit"
    else:
        assert after == before


def _chain_with_routes(routes: list[dict]) -> dict:
    return {
        "devices": [
            {"id": "PC1", "kind": "host", "interfaces": [{"name": "eth0", "ip": "10.10.10.10/24"}], "gateway": "10.10.10.1"},
            {
                "id": "R1", "kind": "router", "routes": routes,
                "interfaces": [
                    {"name": "g0/0", "ip": "10.10.10.1/24"},
                    {"name": "a", "ip": "192.168.1.1/30"},
                    {"name": "b", "ip": "192.168.2.1/30"},
                ],
            },
            {"id": "RA", "kind": "router", "interfaces": [{"name": "x", "ip": "192.168.1.2/30"}, {"name": "l", "ip": "10.30.30.1/24"}],
             "routes": [{"prefix": "10.10.10.0/24", "next_hop": "192.168.1.1"}]},
            {"id": "RB", "kind": "router", "interfaces": [{"name": "x", "ip": "192.168.2.2/30"}],
             "routes": [{"prefix": "10.10.10.0/24", "next_hop": "192.168.2.1"}]},
            {"id": "SRV", "kind": "host", "interfaces": [{"name": "eth0", "ip": "10.30.30.5/24"}], "gateway": "10.30.30.1"},
        ],
        "acls": {},
    }


@settings(max_examples=60)
@given(st.lists(st.tuples(st.sampled_from([8, 16, 20, 24, 25, 28]), st.sampled_from(["192.168.1.2", "192.168.2.2"])),
                min_size=1, max_size=5, unique_by=lambda t: t[0]), st.randoms(use_true_random=False))
def test_route_order_does_not_change_verdict(entries, rnd):
    routes = [{"prefix": str(ipaddress.IPv4Network(("10.30.30.0", length), strict=False)), "next_hop": hop} for length, hop in entries]
    flow = {"src": "10.10.10.10", "dst": "10.30.30.5", "proto": "tcp", "dst_port": 443}
    baseline = verify(_chain_with_routes(routes), flow)
    shuffled = routes[:]
    rnd.shuffle(shuffled)
    assert verify(_chain_with_routes(shuffled), flow)["result"] == baseline["result"]
    # 가장 긴 접두사의 다음 홉이 RA면 PASS, RB면 RB가 목적지를 몰라 DENY
    longest = max(entries)[1]
    assert baseline["result"] == ("PASS" if longest == "192.168.1.2" else "DENY")
