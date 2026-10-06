"""§14 합성 명세 테스트. 실제 pfSense 장비 결과·사례 정답이 아니다."""

import copy
import json
from pathlib import Path

import pytest

from conftest import device, interface, one_router
from netproof_engine import verify

FLOW = {"src": "10.10.10.10", "dst": "10.20.20.5", "proto": "tcp", "dst_port": 443}
PASS_RULE = {"action": "pass", "proto": "tcp", "src": "10.10.10.0/24", "dst": "10.20.20.5", "dst_port": "443"}


def stateful_network():
    net = one_router()
    device(net, "R1")["stateful"] = True
    interface(net, "R1", "g0/0")["rules_in"] = [copy.deepcopy(PASS_RULE)]
    interface(net, "R1", "g0/1")["default_in"] = "block"
    return net


def test_session_state_only_bypasses_return_rules():
    net = stateful_network()
    result = verify(net, FLOW)
    assert result["result"] == "PASS"
    hop = next(h for h in result["forward"]["hops"] if h["step"] == "firewall_in")
    assert (hop["device"], hop["in_if"], hop["rule_seq"], hop["rule_line"]) == ("R1", "g0/0", 1, 1)
    assert json.loads(hop["rule"]) == PASS_RULE
    backward = result["return"]["hops"]
    assert [h["step"] for h in backward if h["device"] == "R1"] == ["state", "route"]
    assert "상태로 허용됨" in backward[1]["detail"]
    assert "실제 pfSense 장비와 대조하지 않았습니다" in hop["detail"]
    assert set(result) == {"result", "reason", "problems", "forward", "return", "decisive"}
    # 같은 요청의 계산 상태는 다른 verify 호출로 넘어가지 않는다.
    reverse = dict(FLOW, src=FLOW["dst"], dst=FLOW["src"], src_port=443, dst_port=50000, mode="one-way")
    assert verify(net, reverse)["result"] == "DENY"


@pytest.mark.parametrize("proto", ["tcp", "udp", "icmp"])
def test_state_for_supported_session_protocols(proto):
    net = stateful_network()
    interface(net, "R1", "g0/0")["rules_in"] = [{"action": "pass", "proto": "ip", "src": "any", "dst": "any"}]
    assert verify(net, dict(FLOW, proto=proto))["result"] == "PASS"


def test_one_way_has_no_state_or_return():
    result = verify(stateful_network(), dict(FLOW, mode="one-way"))
    assert result["result"] == "PASS" and result["return"] is None
    assert all(h["step"] != "state" for h in result["forward"]["hops"])


@pytest.mark.parametrize("default, expected", [(None, "UNSUPPORTED"), ("unknown", "UNSUPPORTED"), ("block", "DENY"), ("pass", "PASS")])
def test_unmatched_rule_requires_known_default(default, expected):
    net = stateful_network()
    incoming = interface(net, "R1", "g0/0")
    if default is not None:
        incoming["default_in"] = default
    result = verify(net, dict(FLOW, dst_port=80))
    assert result["result"] == expected
    if expected == "UNSUPPORTED":
        assert "기본·자동 규칙을 모릅니다" in result["reason"]
    else:
        hop = next(h for h in result["forward"]["hops"] if h["step"] == "firewall_in")
        assert hop["rule_seq"] is None and "사용자가 적은 기본 정책" in hop["detail"]


def test_first_match_wins_and_preserves_list_number():
    net = stateful_network()
    rules = interface(net, "R1", "g0/0")["rules_in"]
    rules.insert(0, dict(PASS_RULE, dst="10.20.20.6"))
    rules.insert(1, dict(PASS_RULE, action="block"))
    result = verify(net, FLOW)
    assert result["result"] == "DENY" and result["decisive"]["rule_seq"] == 2


@pytest.mark.parametrize("field, value", [("src", "10.11.0.0/16"), ("dst", "10.20.20.6"), ("proto", "udp"), ("src_port", "12345"), ("dst_port", "80")])
def test_rule_filters(field, value):
    net = stateful_network()
    incoming = interface(net, "R1", "g0/0")
    incoming["default_in"] = "block"
    incoming["rules_in"][0][field] = value
    result = verify(net, FLOW)
    assert result["result"] == "DENY" and result["decisive"]["rule_seq"] is None


@pytest.mark.parametrize("port", [443, "443", "any", None])
def test_supported_ports(port):
    net = stateful_network()
    interface(net, "R1", "g0/0")["rules_in"][0]["dst_port"] = port
    assert verify(net, FLOW)["result"] == "PASS"


@pytest.mark.parametrize("port", ["²", "9" * 5000, "0", "65536", "range 80 443", "https"])
def test_unsupported_ports_do_not_crash_or_guess(port):
    net = stateful_network()
    interface(net, "R1", "g0/0")["rules_in"][0]["dst_port"] = port
    assert verify(net, FLOW)["result"] == "UNSUPPORTED"


@pytest.mark.parametrize("port", [True, [], {}, 1.5, pytest.param(10**5000, id="huge-integer")])
def test_malformed_port_shapes(port):
    net = stateful_network()
    interface(net, "R1", "g0/0")["rules_in"][0]["dst_port"] = port
    assert verify(net, FLOW)["result"] == "INVALID"


@pytest.mark.parametrize("extra", [{"stateful": "true"}, {"stateful": 1}, {"stateful": None}])
def test_stateful_must_be_boolean(extra):
    net = one_router()
    device(net, "R1").update(extra)
    assert verify(net, FLOW)["result"] == "INVALID"


def test_stateful_host_invalid():
    net = one_router()
    device(net, "PC1")["stateful"] = True
    assert verify(net, FLOW)["result"] == "INVALID"


@pytest.mark.parametrize("field, value", [("rules_in", []), ("default_in", "block")])
@pytest.mark.parametrize("stateful", [None, False])
def test_stateless_device_rejects_structured_fields(field, value, stateful):
    net = one_router()
    if stateful is not None:
        device(net, "R1")["stateful"] = stateful
    interface(net, "R1", "g0/0")[field] = value
    assert verify(net, FLOW)["result"] == "INVALID"


@pytest.mark.parametrize("field", ["acl_in", "acl_out"])
def test_cannot_mix_acl_even_on_other_interface(field):
    net = stateful_network()
    net["acls"]["A"] = ["permit ip any any"]
    interface(net, "R1", "g0/1")[field] = "A"
    assert verify(net, FLOW)["result"] == "INVALID"


@pytest.mark.parametrize("rules", [None, {}, "pass", ["pass"], [None], [{"action": "pass"}], [{"action": "pass", "proto": "tcp", "src": [], "dst": "any"}]])
def test_malformed_rules(rules):
    net = stateful_network()
    interface(net, "R1", "g0/0")["rules_in"] = rules
    assert verify(net, FLOW)["result"] == "INVALID"


@pytest.mark.parametrize("default", [None, True, {}, [], "deny"])
def test_malformed_default(default):
    net = stateful_network()
    interface(net, "R1", "g0/0")["default_in"] = default
    assert verify(net, FLOW)["result"] == "INVALID"


@pytest.mark.parametrize("field, value", [("action", "reject"), ("proto", "ipv6"), ("src", "::/0"), ("dst", "BOARD_ALIAS"), ("schedule", "night"), ("limiter", "slow"), ("reply-to", "em0"), ("state", "none")])
def test_unsupported_rules_are_not_silently_ignored(field, value):
    net = stateful_network()
    incoming = interface(net, "R1", "g0/0")
    incoming["rules_in"][0][field] = value
    incoming["default_in"] = "block"
    assert verify(net, FLOW)["result"] == "UNSUPPORTED"


def test_unread_rule_after_first_match_is_irrelevant():
    net = stateful_network()
    interface(net, "R1", "g0/0")["rules_in"].append(dict(PASS_RULE, schedule="night"))
    assert verify(net, FLOW)["result"] == "PASS"
    assert verify(net, dict(FLOW, dst_port=80))["result"] == "UNSUPPORTED"


@pytest.mark.parametrize("level, option", [("network", "nat"), ("device", "floating"), ("device", "states"), ("device", "config_xml"), ("interface", "auto_rules"), ("interface", "reply-to"), ("interface", "ids")])
def test_unsupported_configuration(level, option):
    net = stateful_network()
    target = net if level == "network" else device(net, "R1") if level == "device" else interface(net, "R1", "g0/0")
    target[option] = True
    assert verify(net, FLOW)["result"] == "UNSUPPORTED"


@pytest.mark.parametrize("icmp", ["echo-reply", "0", 0, 3, 11])
def test_existing_icmp_state_is_unknown(icmp):
    result = verify(stateful_network(), dict(FLOW, proto="icmp", icmp=icmp, mode="one-way"))
    assert result["result"] == "UNSUPPORTED" and "기존 연결 상태" in result["reason"]


def test_missing_return_route_stays_deny():
    case = json.loads((Path(__file__).resolve().parents[2] / "cases/synthetic-02-missing-return-route.json").read_text(encoding="utf-8"))
    net = case["network"]
    for router in net["devices"]:
        if router["kind"] == "router":
            router["stateful"] = True
            for iface in router["interfaces"]:
                iface["default_in"] = "pass"
    result = verify(net, case["flow"])
    assert result["result"] == "DENY"
    assert (result["decisive"]["device"], result["decisive"]["step"]) == ("R2", "route")
    assert result["return"]["reason"] == "경로 없음"
    assert any(h["step"] == "state" for h in result["return"]["hops"])


@pytest.mark.parametrize("default, expected", [(None, "UNSUPPORTED"), ("block", "DENY"), ("pass", "PASS")])
def test_asymmetric_return_firewall_does_not_inherit_state(default, expected):
    net = stateful_network()
    device(net, "SRV")["gateway"] = "10.20.20.2"
    net["devices"].append({"id": "R2", "kind": "router", "stateful": True, "interfaces": [
        {"name": "lan", "ip": "10.20.20.2/24"}, {"name": "src", "ip": "10.10.10.2/24"}]})
    if default:
        interface(net, "R2", "lan")["default_in"] = default
    result = verify(net, FLOW)
    assert result["result"] == expected
    if result["return"]:
        assert not any(h["step"] == "state" for h in result["return"]["hops"])


def test_stateless_firewall_on_return_still_evaluates_acl(net2):
    device(net2, "R1")["stateful"] = True
    interface(net2, "R1", "g0/0")["default_in"] = "pass"
    interface(net2, "R1", "s0/0")["default_in"] = "block"
    net2["acls"]["B"] = ["deny ip any any"]
    interface(net2, "R2", "g0/0")["acl_in"] = "B"
    result = verify(net2, dict(FLOW, dst="10.30.30.5"))
    assert result["result"] == "DENY" and result["decisive"]["device"] == "R2"


def test_same_subnet_bypasses_firewall():
    net = stateful_network()
    device(net, "SRV")["interfaces"][0]["ip"] = "10.10.10.5/24"
    device(net, "SRV")["gateway"] = "10.10.10.1"
    for iface in device(net, "R1")["interfaces"]:
        iface["rules_in"] = []
        iface["default_in"] = "block"
    result = verify(net, dict(FLOW, dst="10.10.10.5"))
    assert result["result"] == "PASS"
    assert [h["step"] for h in result["forward"]["hops"]] == ["send", "deliver"]


def test_router_interface_destination_and_source():
    net = stateful_network()
    interface(net, "R1", "g0/0")["rules_in"] = [{"action": "pass", "proto": "ip", "src": "any", "dst": "any"}]
    assert verify(net, dict(FLOW, dst="10.20.20.1"))["result"] == "PASS"
    assert verify(net, dict(FLOW, src="10.10.10.1", dst="10.20.20.5"))["result"] == "DENY"
