"""Bounded contract fuzzing for four numeric conversion sites.

Generate one non-whitespace string token in an otherwise valid network/flow.
This is not an arbitrary-input guarantee: addresses, routing, interfaces,
non-string types, whitespace and other ACL grammar are outside the generator.
The two known out-of-scope crashes are pinned separately with strict xfails.
Synthetic engine verdicts here are not observations from real lab equipment.
"""

import ipaddress

import pytest
from hypothesis import example, given, settings
from hypothesis import strategies as st

from netproof_engine import verify


RESULTS = {"PASS", "DENY", "UNSUPPORTED", "INVALID"}
PATHS = ("sequence", "port", "acl_icmp", "flow_icmp")
TOKENS = st.one_of(
    st.integers(min_value=0, max_value=4294967295).map(str),
    st.sampled_from(["echo", "echo-reply", "www", "0000000443"]),
    st.text(st.characters(exclude_categories=("Z", "C")), min_size=1, max_size=12),
    st.text(st.characters(categories=("Nd", "No")), min_size=1, max_size=12),
    st.sampled_from([10, 11, 4300, 4301, 5000]).map(lambda n: "9" * n),
)


def _input(path, token):
    # Fresh objects per example; independent of mutable case fixtures and helpers
    # introduced by the fixes, so this test can run against historical engines.
    network = {
        "devices": [
            {"id": "PC1", "kind": "host", "interfaces": [
                {"name": "eth0", "ip": "10.10.10.10/24"}], "gateway": "10.10.10.1"},
            {"id": "R1", "kind": "router", "interfaces": [
                {"name": "g0/0", "ip": "10.10.10.1/24", "acl_in": "101"},
                {"name": "g0/1", "ip": "10.20.20.1/24"}]},
            {"id": "SRV", "kind": "host", "interfaces": [
                {"name": "eth0", "ip": "10.20.20.5/24"}], "gateway": "10.20.20.1"},
        ],
        "acls": {"101": ["permit ip any any"]},
    }
    flow = {"src": "10.10.10.10", "dst": "10.20.20.5", "proto": "tcp", "dst_port": 443}
    if path == "sequence":
        network["acls"]["101"] = [f"{token} deny ip any any"]
    elif path == "port":
        network["acls"]["101"] = [f"deny tcp any any eq {token}"]
    elif path == "acl_icmp":
        network["acls"]["101"] = [f"permit icmp any any {token}"]
        flow.update(proto="icmp", icmp="echo", check="oneway")
    elif path == "flow_icmp":
        flow.update(proto="icmp", icmp=token, check="oneway")
    else:
        raise AssertionError(f"Unknown test path: {path}")
    return network, flow


@pytest.mark.parametrize("path", PATHS)
@settings(max_examples=80, derandomize=True, deadline=None)
@given(token=TOKENS)
@example(token="①")
@example(token="²")
@example(token="9" * 5000)
def test_numeric_token_contract(path, token):
    # ACL tokenization uses str.split(); these alphabets cannot add whitespace.
    assert token.split() == [token]
    assert verify(*_input(path, token))["result"] in RESULTS


@pytest.mark.xfail(strict=True, raises=ipaddress.AddressValueError,
                   reason="Separate known bug: malformed ACL host address")
def test_known_malformed_host_contract():
    network, flow = _input("port", "443")
    network["acls"]["101"] = ["deny tcp host neq icmp -1 remark nan"]
    assert verify(network, flow)["result"] in RESULTS


@pytest.mark.xfail(strict=True, raises=TypeError,
                   reason="Separate known bug: non-string flow ICMP list")
def test_known_icmp_list_contract():
    assert verify(*_input("flow_icmp", ["8"]))["result"] in RESULTS
