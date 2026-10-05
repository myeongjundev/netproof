import copy
import importlib
import json
from pathlib import Path

import pytest
from hypothesis import given, settings, strategies as st

from conftest import interface, one_router
from netproof_engine import policy_matrix, verify
from netproof_engine.change import change_impact

CASE = json.loads((Path(__file__).resolve().parents[2] / "cases/synthetic-01-https-acl.json").read_text(encoding="utf-8"))
FLOW = CASE["flow"]
SERVICES = [{"proto": "tcp", "dst_port": p, "label": label} for p, label in ((22, "SSH"), (80, "HTTP"), (443, "HTTPS"))] + [
    {"proto": "udp", "dst_port": 53, "label": "DNS"}, {"proto": "icmp", "icmp": "echo", "label": "Ping"}]


def widened():
    after = copy.deepcopy(CASE["network"])
    after["acls"]["101"][0] = "access-list 101 deny ip 10.10.10.0 0.0.0.255 10.20.20.0 0.0.0.255"
    return after


def test_same_network_and_changed_reason_are_not_changes():
    before = CASE["network"]
    assert change_impact(before, before, FLOW, SERVICES)["totals"] == {
        "checks": 9, "changed": 0, "opened": 0, "closed": 0, "other": 0, "not_compared": 0}
    after = copy.deepcopy(before)
    after["acls"]["101"].insert(0, "remark shifts decisive line")
    assert change_impact(before, after, FLOW, SERVICES)["changes"] == []


def test_widened_deny_closes_nine_and_includes_return_direction():
    result = change_impact(CASE["network"], widened(), FLOW, SERVICES)
    assert result["status"] == "OK" and result["totals"]["closed"] == 9
    assert all(c["kind"] == "closed" for c in result["changes"])
    assert any(c["src_device"] == "SRV" and c["dst_device"] == "PC1" for c in result["changes"])
    assert not any((c["src"], c["dst"], c["service"]) == (FLOW["src"], FLOW["dst"], "tcp/443") for c in result["changes"])
    assert result["changes"] == sorted(result["changes"], key=lambda c: (c["src"], c["dst"], c["service"]))
    assert change_impact(widened(), CASE["network"], FLOW, SERVICES)["totals"]["opened"] == 9


def test_only_selected_flow_changes_and_removing_wide_rule():
    after = copy.deepcopy(CASE["network"])
    after["acls"]["101"][0] = after["acls"]["101"][0].replace("deny", "permit")
    assert change_impact(CASE["network"], after, FLOW, SERVICES)["totals"]["changed"] == 0
    after["acls"]["101"].pop(0)
    assert change_impact(widened(), after, FLOW, SERVICES)["totals"]["opened"] == 9


def test_mixed_changes_are_sorted_by_kind_then_cell():
    before, after = copy.deepcopy(CASE["network"]), copy.deepcopy(CASE["network"])
    before["acls"]["101"] = ["deny tcp any any eq 22", "permit ip any any"]
    after["acls"]["101"] = ["deny tcp any any eq 80", "permit tcp any any eq 22", "unsupported syntax"]
    result = change_impact(before, after, FLOW, SERVICES)
    assert all(result["totals"][kind] > 0 for kind in ("opened", "closed", "other"))
    assert result["changes"] == sorted(result["changes"], key=lambda c: (("opened", "closed", "other").index(c["kind"]), c["src"], c["dst"], c["service"]))


def test_unsupported_transition_and_invalid_cell_classification(monkeypatch):
    after = copy.deepcopy(CASE["network"])
    after["acls"]["101"].insert(0, "unsupported syntax")
    result = change_impact(CASE["network"], after, FLOW, SERVICES)
    assert result["totals"]["other"] == 9
    assert all(c["after"]["result"] == "UNSUPPORTED" for c in result["changes"])
    # INVALID cells are a defensive boundary case; the real model normally rejects the batch first.
    matrix = importlib.import_module("netproof_engine.matrix")
    original = matrix.verify
    monkeypatch.setattr(matrix, "verify", lambda net, flow: {"result": "INVALID", "reason": "fixture invalid", "decisive": None}
                        if net is after else original(net, flow))
    assert change_impact(CASE["network"], after, FLOW, SERVICES)["totals"]["other"] == 9


@pytest.mark.parametrize("action,expected", [("add", 20), ("address", 19), ("remove", 9)])
def test_endpoint_changes_are_not_compared(action, expected):
    after = copy.deepcopy(CASE["network"])
    if action == "add":
        after["devices"].append({"id": "H3", "kind": "host", "interfaces": [{"name": "e", "ip": "10.20.20.6/24"}]})
    elif action == "address":
        after["devices"][2]["interfaces"][0]["ip"] = "10.20.20.6/24"
    else:
        after["devices"].pop(2)
    result = change_impact(CASE["network"], after, FLOW, SERVICES)
    assert result["status"] == "OK" and result["totals"]["not_compared"] == expected


@pytest.mark.parametrize("side,label", [("before", "변경 전"), ("after", "변경 후")])
def test_invalid_network_prefix(side, label):
    networks = dict(before=CASE["network"], after=CASE["network"])
    networks[side] = {"devices": [{"id": "bad"}]}
    result = change_impact(**networks, flow=FLOW, services=SERVICES)
    assert result["status"] == "INVALID" and all(p.startswith(label + " 구성: ") for p in result["problems"])
    assert result["changes"] == [] and result["totals"]["checks"] == 0


@pytest.mark.parametrize("flow", [None, {}, {**FLOW, "src": "bad"}, {**FLOW, "mode": "bad"}, {**FLOW, "dst_port": 0},
                                      {**FLOW, "dst_port": "9" * 5000}, {**FLOW, "src": FLOW["dst"]}])
def test_invalid_flow(flow):
    assert change_impact(CASE["network"], CASE["network"], flow, SERVICES)["status"] == "INVALID"


def test_service_added_deduplicated_and_mode():
    result = change_impact(CASE["network"], CASE["network"], {**FLOW, "dst_port": 8443, "mode": "one-way"}, SERVICES)
    assert result["mode"] == "one-way" and len(result["services"]) == 6 and result["totals"]["checks"] == 11
    result = change_impact(CASE["network"], CASE["network"], {**FLOW, "proto": "icmp", "icmp": "008"},
                           [{"proto": "icmp", "icmp": 8}, {"proto": "icmp", "icmp": "echo"}])
    assert len(result["services"]) == 1 and result["totals"]["checks"] == 1
    result = change_impact(CASE["network"], CASE["network"], {**FLOW, "proto": "icmp", "icmp": "echo-reply"}, [])
    assert result["status"] == "OK"  # well formed but unsupported in session, both sides identical


@pytest.mark.parametrize("services", [None, "bad", [None], [{"proto": "tcp", "dst_port": True}]])
def test_invalid_services(services):
    assert change_impact(CASE["network"], CASE["network"], FLOW, services)["status"] == "INVALID"


def test_limits_apply_to_each_side_and_added_service():
    base = CASE["network"]
    nine = [{"proto": "tcp", "dst_port": p} for p in range(1, 10)]
    for services in (nine, nine[:8]):
        result = change_impact(base, base, FLOW, services)
        assert result["limit_exceeded"] and not result["changes"]
    for side in (0, 1):
        for count, services in ((25, SERVICES), (17, [{"proto": "tcp", "dst_port": p} for p in (22, 80, 443, 1, 2, 3, 4, 5)])):
            large = {"devices": [{"id": f"H{i}", "kind": "host", "interfaces": [{"name": "e", "ip": f"10.0.0.{i+1}/24"}]} for i in range(count)], "acls": {}}
            nets = [base, base]; nets[side] = large
            result = change_impact(*nets, FLOW, services)
            assert result["limit_exceeded"] and result["totals"]["checks"] == 0


@settings(max_examples=40, deadline=None)
@given(st.lists(st.sampled_from(["deny tcp any any eq 22", "deny tcp any any eq 80", "deny tcp any any eq 443", "permit ip any any"]), max_size=5),
       st.lists(st.sampled_from(["deny tcp any any eq 22", "deny tcp any any eq 80", "deny tcp any any eq 443", "permit ip any any"]), max_size=5),
       st.sampled_from(["session", "one-way"]))
def test_property_exact_verify_difference(old_lines, new_lines, mode):
    before, after = one_router(), one_router()
    for net, lines in ((before, old_lines), (after, new_lines)):
        net["acls"]["A"] = lines; interface(net, "R1", "g0/0")["acl_in"] = "A"
    original = copy.deepcopy((before, after))
    flow = {**FLOW, "mode": mode}
    result = change_impact(before, after, flow, SERVICES)
    expected = {}
    matrix = policy_matrix(before, {"services": SERVICES, "mode": mode})
    for cell in matrix["cells"]:
        key = cell["src"], cell["dst"], cell["service"]
        if key == (FLOW["src"], FLOW["dst"], "tcp/443"):
            continue
        service = next(s for s in matrix["services"] if s["key"] == cell["service"])
        question = {"src": key[0], "dst": key[1], "mode": mode, **{k: v for k, v in service.items() if k in ("proto", "dst_port", "icmp")}}
        old, new = verify(before, question), verify(after, question)
        if old["result"] != new["result"]:
            expected[key] = (old["result"], new["result"])
    assert {(c["src"], c["dst"], c["service"]): (c["before"]["result"], c["after"]["result"]) for c in result["changes"]} == expected
    assert result["totals"]["changed"] == sum(result["totals"][k] for k in ("opened", "closed", "other")) == len(expected)
    assert (before, after) == original
