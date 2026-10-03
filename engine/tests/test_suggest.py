import importlib
import ipaddress
import json
from copy import deepcopy
from dataclasses import replace
from pathlib import Path

import pytest
from hypothesis import given, seed, settings, strategies as st

from netproof_engine import suggest, verify
from netproof_engine.acl import parse_rule
from netproof_engine.verify import _flow_packet, _reverse

module = importlib.import_module("netproof_engine.suggest")
CASES = Path(__file__).resolve().parents[2] / "cases"


def fixture():
    return json.loads((CASES / "synthetic-01-https-acl.json").read_text(encoding="utf-8"))


def apply_independently(original, edits):
    """Independent reconstruction, not the implementation's _apply helper."""
    network = deepcopy(original)
    for acl, lines in original.get("acls", {}).items():
        result = []
        for anchor in range(1, len(lines) + 2):
            for edit in edits:
                if edit["acl"] == acl and edit["anchor_before"] == (anchor if anchor <= len(lines) else None):
                    result.append(edit["raw"])
                    assert edit["insert_at"] == len(result)
            if anchor <= len(lines):
                result.append(lines[anchor - 1])
        network["acls"][acl] = result
        inserted = {e["insert_at"] for e in edits if e["acl"] == acl}
        assert [s for i, s in enumerate(result, 1) if i not in inserted] == lines
    return network


def crosscheck(network, flow, target):
    original, original_flow = deepcopy(network), deepcopy(flow)
    response = suggest(network, flow, target)
    assert network == original and flow == original_flow
    assert set(response) == {"status", "target", "reason", "problems", "engine_version", "truncated", "before", "candidates"}
    assert response["before"] == verify(network, flow)
    assert response["target"] == target
    assert len(response["candidates"]) <= (1 if target == "PASS" else module.MAX_DENY_CANDIDATES)
    if response["status"] == "OK":
        assert response["candidates"] and response["reason"] is None and response["problems"] == []
        packet, _ = _flow_packet(flow)
        for i, candidate in enumerate(response["candidates"], 1):
            assert set(candidate) == {"id", "edits", "after"} and candidate["id"] == f"c{i}"
            assert 1 <= len(candidate["edits"]) <= (module.MAX_EDITS if target == "PASS" else 1)
            applied = apply_independently(network, candidate["edits"])
            assert verify(applied, flow) == candidate["after"]
            assert candidate["after"]["result"] == target
            for edit in candidate["edits"]:
                assert set(edit) == {"acl", "anchor_before", "insert_at", "raw", "action", "device", "interface", "direction", "path", "shared_by"}
                relevant = packet if edit["path"] == "forward" else _reverse(packet)
                assert parse_rule(edit["raw"], 1).matches(relevant)
    else:
        assert response["candidates"] == []
        assert response["problems"] == []
        if response["status"] == "ALREADY":
            assert response["before"]["result"] == target and response["reason"] is None
        else:
            assert response["status"] == "NO_CANDIDATE" and response["reason"] in {
                "not_decidable", "not_acl_cause", "no_acl_on_path", "edit_limit", "line_limit", "reverify_failed"}
    return response


@pytest.mark.parametrize("path", sorted(CASES.glob("*.json")), ids=lambda p: p.stem)
def test_existing_cases_both_targets(path):
    data = json.loads(path.read_text(encoding="utf-8"))
    for target in ("PASS", "DENY"):
        crosscheck(data["network"], data["flow"], target)


def test_explicit_deny_and_empty_lines_original_anchor():
    data = fixture()
    data["network"]["acls"]["101"].insert(0, "")
    data["network"]["acls"]["101"].insert(1, "remark example")
    result = crosscheck(data["network"], data["flow"], "PASS")
    assert result["candidates"][0]["edits"][0]["anchor_before"] == 3


@pytest.mark.parametrize("proto", ["tcp", "udp", "icmp"])
def test_same_acl_forward_and_return_and_source_ports(proto):
    data = fixture()
    data["flow"]["proto"] = proto
    data["network"]["acls"]["101"] = ["deny ip any any"]
    data["network"]["devices"][1]["interfaces"][0]["acl_out"] = "101"
    response = crosscheck(data["network"], data["flow"], "PASS")
    edits = response["candidates"][0]["edits"]
    assert [e["anchor_before"] for e in edits] == [1, 1]
    assert [e["insert_at"] for e in edits] == [1, 2]
    assert [e["path"] for e in edits] == ["forward", "return"]
    assert len(edits[0]["shared_by"]) == 2
    if proto == "tcp":
        assert edits[1]["raw"].endswith("established")
    assert "50000" not in edits[1]["raw"]
    applied = apply_independently(data["network"], edits)
    if proto in ("tcp", "udp"):
        for port in (1, 40000, 65535):
            assert verify(applied, {**data["flow"], "src_port": port})["result"] == "PASS"


def test_implicit_deny_appends_and_exact_rule_boundaries():
    data = fixture()
    data["network"]["acls"]["101"] = []
    edits = crosscheck(data["network"], data["flow"], "PASS")["candidates"][0]["edits"]
    assert edits[0]["anchor_before"] is None and edits[0]["insert_at"] == 1
    packet, _ = _flow_packet(data["flow"])
    rule = parse_rule(edits[0]["raw"], 1)
    for delta in (-1, 1):
        assert not rule.matches(replace(packet, src=ipaddress.IPv4Address(int(packet.src) + delta)))
        assert not rule.matches(replace(packet, dst=ipaddress.IPv4Address(int(packet.dst) + delta)))
        assert not rule.matches(replace(packet, dport=packet.dport + delta))


def test_later_edit_moves_previously_inserted_line():
    data = fixture()
    data["flow"]["proto"] = "icmp"
    data["network"]["acls"]["101"] = ["deny icmp any any echo-reply", "remark anchor", "deny icmp any any echo"]
    data["network"]["devices"][1]["interfaces"][0]["acl_out"] = "101"
    edits = crosscheck(data["network"], data["flow"], "PASS")["candidates"][0]["edits"]
    assert [e["anchor_before"] for e in edits] == [3, 1]
    assert [e["insert_at"] for e in edits] == [4, 1]


@pytest.mark.parametrize("kind", [0, 8, 3, 255])
def test_icmp_one_way_numeric_types(kind):
    data = fixture()
    data["flow"].update(proto="icmp", icmp=str(kind), mode="one-way")
    edits = crosscheck(data["network"], data["flow"], "DENY")["candidates"][0]["edits"]
    assert edits[0]["raw"].endswith({0: "echo-reply", 8: "echo"}.get(kind, str(kind)))


@pytest.mark.parametrize("target", ["PASS", "DENY"])
def test_default_limits_on_ten_acl_hops(target, monkeypatch):
    devices = [{"id": "h1", "kind": "host", "interfaces": [{"name": "e", "ip": "10.0.0.10/24"}], "gateway": "10.0.0.1"}]
    acls = {}
    for i in range(5):
        inbound, outbound = f"a{i}", f"b{i}"
        acls[inbound] = acls[outbound] = ["deny ip any any" if target == "PASS" else "permit ip any any"]
        devices.append({"id": f"r{i}", "kind": "router", "interfaces": [
            {"name": "a", "ip": f"10.{i}.0.1/24", "acl_in": inbound},
            {"name": "b", "ip": f"10.{i+1}.0.2/24", "acl_out": outbound}], "routes": [
            {"prefix": "10.5.0.0/24", "next_hop": f"10.{i+1}.0.1"}] if i < 4 else []})
    devices.append({"id": "h2", "kind": "host", "interfaces": [{"name": "e", "ip": "10.5.0.10/24"}], "gateway": "10.5.0.2"})
    flow = {"src": "10.0.0.10", "dst": "10.5.0.10", "proto": "udp", "dst_port": 80, "mode": "one-way"}
    count = 0
    def counted(*args):
        nonlocal count
        count += 1
        return verify(*args)
    monkeypatch.setattr(module, "verify", counted)
    response = crosscheck({"devices": devices, "acls": acls}, flow, target)
    if target == "PASS":
        assert response["reason"] == "edit_limit" and count == 5
    else:
        assert response["truncated"] and len(response["candidates"]) == 8 and count == 9


@pytest.mark.parametrize("target", [None, "pass", 1, [], {}])
def test_target_required_before_verifier(target, monkeypatch):
    monkeypatch.setattr(module, "verify", lambda *_: pytest.fail("target must be checked first"))
    result = suggest({}, {}, target)
    assert result["status"] == "INVALID" and result["before"] is None and result["problems"]


@pytest.mark.parametrize("network,flow", [(None, None), ([], {}), ({"devices": 3}, {}), ({}, [])])
def test_invalid_shapes_do_not_raise(network, flow):
    result = suggest(network, flow, "PASS")
    assert result["status"] in ("INVALID", "NO_CANDIDATE") and not result["candidates"]


def test_not_decidable_and_non_acl_causes():
    data = fixture()
    data["network"]["acls"]["101"] = ["unread"]
    assert crosscheck(data["network"], data["flow"], "PASS")["reason"] == "not_decidable"
    data = fixture()
    data["network"]["devices"][0].pop("gateway")
    assert crosscheck(data["network"], data["flow"], "PASS")["reason"] == "not_acl_cause"
    data = fixture()
    data["network"]["devices"][1]["interfaces"][0].pop("acl_in")
    assert crosscheck(data["network"], data["flow"], "DENY")["reason"] == "no_acl_on_path"


def test_reverify_unread_and_edit_limit(monkeypatch):
    data = fixture()
    data["network"]["devices"][1]["interfaces"][1]["acl_out"] = "second"
    data["network"]["acls"]["second"] = ["unread"]
    assert crosscheck(data["network"], data["flow"], "PASS")["reason"] == "reverify_failed"
    data["network"]["acls"]["second"] = ["deny ip any any"]
    monkeypatch.setattr(module, "MAX_EDITS", 1)
    assert crosscheck(data["network"], data["flow"], "PASS")["reason"] == "edit_limit"


@pytest.mark.parametrize("target", ["PASS", "DENY"])
def test_line_limit(target, monkeypatch):
    data = fixture()
    if target == "DENY":
        data["network"]["acls"]["101"] = ["permit ip any any", "remark filler"]
    monkeypatch.setattr(module, "MAX_ACL_LINES", 2)
    assert crosscheck(data["network"], data["flow"], target)["reason"] == "line_limit"


@pytest.mark.parametrize("target", ["PASS", "DENY"])
def test_actual_500_lines_cannot_gain_a_line(target):
    data = fixture()
    data["network"]["acls"]["101"] = ["deny ip any any" if target == "PASS" else "permit ip any any"] + ["remark filler"] * 499
    assert crosscheck(data["network"], data["flow"], target)["reason"] == "line_limit"


def test_deny_deduplication_truncation_and_calls(monkeypatch):
    data = fixture()
    iface = data["network"]["devices"][1]["interfaces"]
    iface[1]["acl_out"] = "101"
    data["network"]["acls"]["101"] = ["permit ip any any"]
    assert len(crosscheck(data["network"], data["flow"], "DENY")["candidates"]) == 1
    iface[1]["acl_out"] = "second"
    data["network"]["acls"]["second"] = ["permit ip any any"]
    monkeypatch.setattr(module, "MAX_DENY_CANDIDATES", 1)
    count = 0
    def counted(*args):
        nonlocal count
        count += 1
        return verify(*args)
    monkeypatch.setattr(module, "verify", counted)
    response = crosscheck(data["network"], data["flow"], "DENY")
    assert response["truncated"] and len(response["candidates"]) == 1 and count == 2


def linear_network():
    return {"devices": [
        {"id": "h1", "kind": "host", "interfaces": [{"name": "e", "ip": "10.0.1.10/24"}], "gateway": "10.0.1.1"},
        {"id": "r1", "kind": "router", "interfaces": [{"name": "a", "ip": "10.0.1.1/24"}, {"name": "b", "ip": "192.0.2.1/30"}], "routes": [{"prefix": "10.0.2.0/24", "next_hop": "192.0.2.2"}]},
        {"id": "r2", "kind": "router", "interfaces": [{"name": "a", "ip": "192.0.2.2/30"}, {"name": "b", "ip": "10.0.2.1/24"}], "routes": [{"prefix": "10.0.1.0/24", "next_hop": "192.0.2.1"}]},
        {"id": "h2", "kind": "host", "interfaces": [{"name": "e", "ip": "10.0.2.10/24"}], "gateway": "10.0.2.1"}], "acls": {}}


rule_pool = st.sampled_from([
    "permit ip any any", "deny ip any any", "permit tcp 10.0.1.0/24 any eq 80",
    "deny tcp host 10.0.1.10 any neq 80", "permit tcp any any lt 81",
    "deny udp any any gt 80", "permit udp any range 1 65535 any range 79 81",
    "permit tcp any any established", "permit icmp any any echo", "deny icmp any any 0",
    "deny tcp any eq 50000 any eq 80", "remark probe", "", "unread"])


@seed(20261003)
@settings(max_examples=30, deadline=None)
@given(st.lists(st.lists(rule_pool, max_size=4), min_size=4, max_size=4),
       st.lists(st.booleans(), min_size=4, max_size=4), st.sampled_from(["tcp", "udp", "icmp"]),
       st.sampled_from(["session", "one-way"]), st.integers(79, 81))
def test_generated_linear_topology_crosscheck(raw, attached, proto, mode, port):
    network = linear_network()
    sites = [(1, 0, "acl_in"), (1, 1, "acl_out"), (2, 0, "acl_in"), (2, 1, "acl_out")]
    for i, (device, iface, direction) in enumerate(sites):
        network["acls"][str(i)] = raw[i]
        if attached[i]:
            network["devices"][device]["interfaces"][iface][direction] = str(i)
    flow = {"src": "10.0.1.10", "dst": "10.0.2.10", "proto": proto, "mode": mode, "dst_port": port}
    for target in ("PASS", "DENY"):
        calls = []
        def counted(*args):
            calls.append(1)
            return verify(*args)
        with pytest.MonkeyPatch.context() as patch:
            patch.setattr(module, "verify", counted)
            crosscheck(network, flow, target)
        assert len(calls) <= module.MAX_VERIFY_CALLS
