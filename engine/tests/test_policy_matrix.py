"""Synthetic matrix checks; no existing case expectations are changed."""
import copy
import importlib

import pytest

from conftest import device, interface
from netproof_engine import policy_matrix, verify

SERVICES = [{"proto": "tcp", "dst_port": 443, "label": "HTTPS"}, {"proto": "icmp"}]


def spec(**patch):
    return {"services": SERVICES, "mode": "session", "intents": [], **patch}


def intent(expect="DENY", **patch):
    return {"src": "10.10.10.10", "dst": "10.20.20.5", "service": "tcp/443", "expect": expect, **patch}


def host_network(count):
    return {"devices": [{"id": f"H{i:02}", "kind": "host", "interfaces": [{"name": "eth0", "ip": f"10.0.0.{i + 1}/24"}]}
                        for i in range(count)], "acls": {}}


def test_cells_are_exact_single_flow_verdicts_in_both_directions(net1):
    matrix = policy_matrix(net1, spec())
    assert matrix["status"] == "OK"
    assert len(matrix["endpoints"]) == 2  # routers excluded
    assert len(matrix["cells"]) == 4
    for cell in matrix["cells"]:
        service = next(s for s in matrix["services"] if s["key"] == cell["service"])
        flow = {"src": cell["src"], "dst": cell["dst"], "mode": "session",
                **{k: v for k, v in service.items() if k in ("proto", "dst_port", "icmp")}}
        verdict = verify(net1, flow)
        assert {k: cell[k] for k in ("result", "reason", "decisive")} == {k: verdict[k] for k in ("result", "reason", "decisive")}
        assert cell["policy"] == "NO_POLICY"
    assert sum(matrix["totals"][k] for k in ("PASS", "DENY", "UNSUPPORTED", "INVALID")) == 4
    assert sum(matrix["totals"][k] for k in ("AGREE", "EXPOSED", "BLOCKED", "UNDECIDED", "NO_POLICY")) == 4


def test_same_device_pairs_excluded_and_sorted(net1):
    device(net1, "PC1")["interfaces"].append({"name": "eth1", "ip": "10.30.30.10/24"})
    matrix = policy_matrix(net1, spec())
    assert [e["device"] for e in matrix["endpoints"]] == ["PC1", "PC1", "SRV"]
    assert len(matrix["cells"]) == 8
    owners = {e["ip"]: e["device"] for e in matrix["endpoints"]}
    assert all(owners[c["src"]] != owners[c["dst"]] for c in matrix["cells"])


def test_duplicates_and_icmp_aliases(net1):
    request = spec(services=[SERVICES[0], SERVICES[0], {"proto": "icmp", "icmp": "008"}, {"proto": "icmp"}],
                   intents=[intent(), intent(service="tcp/00443")])
    matrix = policy_matrix(net1, request)
    assert matrix["status"] == "OK"
    assert [s["key"] for s in matrix["services"]] == ["tcp/443", "icmp/echo"]
    assert matrix["totals"]["EXPOSED"] == 1
    assert matrix["cells"][0]["expect"] == "DENY"
    assert policy_matrix(net1, spec(intents=[intent(), intent("PASS")]))["status"] == "INVALID"


def test_all_policy_states_and_priority(net1):
    net1["acls"]["A"] = ["deny tcp any any eq 443", "permit ip any any"]
    interface(net1, "R1", "g0/1")["acl_in"] = "A"
    request = spec(services=[*SERVICES, {"proto": "icmp", "icmp": "echo-reply"}],
                   intents=[intent("PASS", src="10.20.20.5", dst="10.10.10.10"), intent()])
    matrix = policy_matrix(net1, request)
    # one-way lets forward HTTPS through while reverse HTTPS is blocked.
    matrix = policy_matrix(net1, {**request, "mode": "one-way", "services": SERVICES})
    assert [c["policy"] for c in matrix["exposures"]] == ["EXPOSED", "BLOCKED"]
    assert matrix["exposures"][1]["decisive"]["acl"] == "A"
    agree = policy_matrix(net1, spec(mode="one-way", intents=[intent("PASS")]))
    assert agree["cells"][0]["policy"] == "AGREE"
    undecided = policy_matrix(net1, spec(services=[{"proto": "icmp", "icmp": "echo-reply"}]))
    assert undecided["totals"]["UNSUPPORTED"] == undecided["totals"]["UNDECIDED"] == 2


def test_session_return_failure_preserved(net1):
    net1["acls"]["A"] = ["deny tcp any any", "permit ip any any"]
    interface(net1, "R1", "g0/1")["acl_in"] = "A"
    session = policy_matrix(net1, spec())
    forward = policy_matrix(net1, spec(mode="one-way"))
    assert session["cells"][0]["result"] == "DENY"
    assert forward["cells"][0]["result"] == "PASS"
    assert session["cells"][0]["reason"].startswith("복귀")


@pytest.mark.parametrize("field,value", [("services", [SERVICES[0]] * 9), ("intents", [intent()] * 501)])
def test_spec_limits_before_any_verify(net1, monkeypatch, field, value):
    module = importlib.import_module("netproof_engine.matrix")
    monkeypatch.setattr(module, "verify", lambda *args: pytest.fail("must reject before verify"))
    matrix = policy_matrix(net1, spec(**{field: value}))
    assert matrix["status"] == "INVALID" and matrix["limit_exceeded"]
    assert matrix["cells"] == []


@pytest.mark.parametrize("count,services", [(25, SERVICES[:1]), (17, [{"proto": "tcp", "dst_port": n} for n in range(1, 9)])])
def test_endpoint_and_check_limits(count, services):
    matrix = policy_matrix(host_network(count), spec(services=services))
    assert matrix["status"] == "INVALID" and matrix["limit_exceeded"]
    assert matrix["totals"]["checks"] == 0


def test_boundary_and_empty_network():
    matrix = policy_matrix(host_network(16), spec(services=[{"proto": "tcp", "dst_port": n} for n in range(1, 9)]))
    assert matrix["status"] == "OK" and matrix["totals"]["checks"] == 1920
    assert policy_matrix(host_network(0), spec())["totals"]["checks"] == 0


@pytest.mark.parametrize("patch", [
    {"mode": "bad"}, {"services": []}, {"services": "tcp"}, {"services": [None]},
    {"services": [{"proto": "tcp", "dst_port": True}]}, {"services": [{"proto": "udp", "dst_port": 0}]},
    {"services": [{"proto": "icmp", "icmp": 256}]}, {"services": [{"proto": "icmp", "icmp": "²"}]},
    {"intents": [intent(expect="MAYBE")]}, {"intents": [intent(dst="8.8.8.8")]},
    {"intents": [intent(service="udp/53")]}, {"intents": [intent(note="x" * 201)]},
])
def test_invalid_spec_is_not_a_partial_success(net1, patch):
    matrix = policy_matrix(net1, spec(**patch))
    assert matrix["status"] == "INVALID" and matrix["problems"] and not matrix["cells"]


def test_invalid_network_problems_and_determinism(net1):
    original = copy.deepcopy(net1)
    request = spec(intents=[intent()])
    assert policy_matrix(net1, request) == policy_matrix(net1, request)
    assert net1 == original
    interface(net1, "SRV", "eth0")["ip"] = "bad"
    matrix = policy_matrix(net1, request)
    assert matrix["status"] == "INVALID" and matrix["problems"]
    assert matrix["cells"] == []


def test_ecmp_unjudged(net2):
    routes = device(net2, "R1")["routes"]
    routes.append({"prefix": "10.30.30.0/24", "out_if": "s0/0"})
    matrix = policy_matrix(net2, spec())
    assert matrix["status"] == "OK"
    assert matrix["totals"]["UNDECIDED"] > 0
    assert all(c["policy"] == "UNDECIDED" for c in matrix["cells"] if c["result"] == "UNSUPPORTED")


@pytest.mark.parametrize("network,options", [(None, None), ({"devices": 1}, spec()), ({"devices": [{"id": [], "kind": []}]}, spec())])
def test_malformed_new_boundary_returns_invalid(network, options):
    assert policy_matrix(network, options)["status"] == "INVALID"
