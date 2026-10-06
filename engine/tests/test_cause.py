import copy
import json
from pathlib import Path

import pytest

from conftest import device, interface
from netproof_engine import cause, verify

FLOW = {"src": "10.10.10.10", "dst": "10.20.20.5", "proto": "tcp", "dst_port": 443}
FAR = dict(FLOW, dst="10.30.30.5")


@pytest.mark.parametrize("step", ["acl_in", "acl_out"])
@pytest.mark.parametrize("implicit", [False, True])
def test_acl_topology(net1, step, implicit):
    net1["acls"]["A"] = ["permit udp any any"] if implicit else ["deny tcp any any"]
    interface(net1, "R1", "g0/0" if step == "acl_in" else "g0/1")[step] = "A"
    verdict = verify(net1, FLOW)
    assert verdict["result"] == "DENY"
    assert cause(verdict) == {"tag": "acl_implicit" if implicit else "acl_rule", "direction": "forward"}


@pytest.mark.parametrize("tag", ["no_gateway", "no_next_hop", "host_no_forward", "no_block", "other"])
def test_one_router_topologies(net1, tag):
    flow = FLOW
    if tag == "no_gateway":
        device(net1, "PC1").pop("gateway")
    elif tag == "no_next_hop":
        device(net1, "PC1")["gateway"] = "10.10.10.254"
    elif tag == "host_no_forward":
        net1["devices"].append({"id": "HX", "kind": "host", "interfaces": [{"name": "eth0", "ip": "10.30.30.5/24"}]})
        device(net1, "R1")["routes"] = [{"prefix": "10.30.30.0/24", "next_hop": "10.20.20.5"}]
        flow = FAR
    elif tag == "other":
        flow = dict(FLOW, dst="8.8.8.8")
    verdict = verify(net1, flow)
    assert verdict["result"] == ("PASS" if tag == "no_block" else "UNSUPPORTED" if tag == "other" else "DENY")
    assert cause(verdict) == {"tag": tag, "direction": "forward"}


@pytest.mark.parametrize("direction", ["forward", "return"])
def test_no_route_topology(net2, direction):
    device(net2, "R1" if direction == "forward" else "R2")["routes"] = []
    verdict = verify(net2, FAR)
    assert verdict["result"] == "DENY"
    assert cause(verdict) == {"tag": "no_route", "direction": direction}


def test_loop_topology(net2):
    net2["devices"].append({"id": "HX", "kind": "host", "interfaces": [{"name": "eth0", "ip": "10.99.0.5/24"}]})
    for name, hop in (("R1", "192.168.12.2"), ("R2", "192.168.12.1")):
        device(net2, name)["routes"].append({"prefix": "10.99.0.0/16", "next_hop": hop})
    verdict = verify(net2, dict(FAR, dst="10.99.0.5"))
    assert verdict["result"] == "DENY"
    assert cause(verdict) == {"tag": "routing_loop", "direction": "forward"}


@pytest.mark.parametrize("implicit", [False, True])
def test_return_acl_topology(net1, implicit):
    net1["acls"]["A"] = ["permit udp any any"] if implicit else ["deny tcp any any"]
    interface(net1, "R1", "g0/1")["acl_in"] = "A"
    assert cause(verify(net1, FLOW)) == {"tag": "acl_implicit" if implicit else "acl_rule", "direction": "return"}


@pytest.mark.parametrize("name,tag,direction", [
    ("01-https-acl", "acl_rule", "forward"),
    ("02-missing-return-route", "no_route", "return"),
    ("03-acl-out", "acl_rule", "forward"),
])
def test_synthetic_round_trip(name, tag, direction):
    case = json.loads((Path(__file__).resolve().parents[2] / "cases" / f"synthetic-{name}.json").read_text(encoding="utf-8"))
    verdict = verify(case["network"], case["flow"])
    original = copy.deepcopy(verdict)
    assert cause(json.loads(json.dumps(verdict))) == {"tag": tag, "direction": direction}
    assert verdict == original


@pytest.mark.parametrize("bad", [None, [], "broken", 1, {}, {"result": []},
    {"result": "INVALID"}, {"result": "UNSUPPORTED"},
    {"result": "DENY", "decisive": []},
    {"result": "DENY", "decisive": {"step": []}},
    {"result": "DENY", "forward": {"reason": []}},
    {"result": "DENY", "forward": {"reason": "新しい理由"}},
    {"result": "DENY", "return": {"reason": "경로 없음"}},
    {"result": "DENY", "decisive": {"step": "acl_in", "rule_seq": []}},
    {"result": "DENY", "decisive": {"step": "acl_out", "rule_seq": True}},
])
def test_unknown_json_is_other(bad):
    assert cause(bad) == {"tag": "other", "direction": "forward"}
