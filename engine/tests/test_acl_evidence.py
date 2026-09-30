import json
from pathlib import Path

import pytest

from conftest import interface
from netproof_engine import verify

FLOW = {"src": "10.10.10.10", "dst": "10.20.20.5", "proto": "tcp", "dst_port": 443}


@pytest.mark.parametrize("port,line,result", [(443, 1, "drop"), (80, 2, "ok")])
def test_example_acl_position(port, line, result):
    case = json.loads((Path(__file__).resolve().parents[2] / "cases/synthetic-01-https-acl.json").read_text(encoding="utf-8"))
    verdict = verify(case["network"], dict(case["flow"], dst_port=port))
    hop = next(h for h in verdict["forward"]["hops"] if h["step"] == "acl_in")
    assert (hop["acl"], hop["rule_line"], hop["rule_seq"], hop["result"]) == ("101", line, line, result)


@pytest.mark.parametrize("lines,seq,line", [
    (["remark x", "", "deny tcp any any eq 443"], 3, 3),
    (["10 deny tcp any any eq 443", "20 permit ip any any"], 10, 1),
    (["90 deny tcp any any eq 443", "10 permit ip any any"], 90, 1),
    (["permit udp any any"], None, None),
    ([], None, None),
])
def test_acl_metadata_does_not_change_order(net1, lines, seq, line):
    net1["acls"]["101"] = lines
    interface(net1, "R1", "g0/0")["acl_in"] = "101"
    verdict = verify(net1, FLOW)
    assert verdict["result"] == "DENY"
    assert (verdict["decisive"]["acl"], verdict["decisive"]["rule_line"], verdict["decisive"]["rule_seq"]) == ("101", line, seq)


def test_non_acl_hops_have_null_metadata(net1):
    verdict = verify(net1, FLOW)
    for trace in (verdict["forward"], verdict["return"]):
        for hop in trace["hops"]:
            assert hop["acl"] is None
            assert hop["rule_line"] is None


def test_outbound_and_return_acl_metadata(net1):
    net1["acls"]["101"] = ["remark shared", "permit ip any any"]
    interface(net1, "R1", "g0/1").update(acl_out="101", acl_in="101")
    verdict = verify(net1, FLOW)
    for direction, step in (("forward", "acl_out"), ("return", "acl_in")):
        hop = next(h for h in verdict[direction]["hops"] if h["step"] == step)
        assert (hop["acl"], hop["rule_line"]) == ("101", 2)
