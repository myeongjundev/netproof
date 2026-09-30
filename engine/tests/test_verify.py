import json
from pathlib import Path

import pytest

from conftest import device, interface

from netproof_engine import compare, verify

HTTPS = {"src": "10.10.10.10", "dst": "10.20.20.5", "proto": "tcp", "dst_port": 443}
HTTPS_FAR = {"src": "10.10.10.10", "dst": "10.30.30.5", "proto": "tcp", "dst_port": 443}


class TestTraceTarget:
    @pytest.mark.parametrize("filename", ["synthetic-01-https-acl.json", "synthetic-03-acl-out.json"])
    def test_blocked_forward_identifies_destination(self, filename):
        case = json.loads((Path(__file__).resolve().parents[2] / "cases" / filename).read_text(encoding="utf-8"))
        verdict = verify(case["network"], case["flow"])
        assert verdict["forward"]["target"] == {"device": "SRV", "interface": "eth0", "ip": "10.20.20.5"}
        assert verdict["forward"]["delivered"] is False
        assert verdict["return"] is None

    def test_blocked_return_identifies_source(self):
        case = json.loads((Path(__file__).resolve().parents[2] / "cases" / "synthetic-02-missing-return-route.json").read_text(encoding="utf-8"))
        verdict = verify(case["network"], case["flow"])
        assert verdict["forward"]["target"] == {"device": "SRV2", "interface": "eth0", "ip": "10.30.30.5"}
        assert verdict["forward"]["delivered"] is True
        assert verdict["return"]["target"] == {"device": "PC1", "interface": "eth0", "ip": "10.10.10.10"}
        assert verdict["return"]["delivered"] is False

    @pytest.mark.parametrize("blocked", [False, True])
    def test_router_interface_target(self, net1, blocked):
        if blocked:
            net1["acls"]["101"] = ["deny ip any any"]
            interface(net1, "R1", "g0/0")["acl_in"] = "101"
        verdict = verify(net1, {"src": "10.10.10.10", "dst": "10.20.20.1", "proto": "icmp"})
        assert verdict["forward"]["target"] == {"device": "R1", "interface": "g0/1", "ip": "10.20.20.1"}
        assert verdict["forward"]["delivered"] is not blocked
        if blocked:
            assert verdict["forward"]["hops"][-1]["device"] == "R1"
            assert verdict["return"] is None

    def test_one_way_has_no_return_target(self, net1):
        verdict = verify(net1, dict(HTTPS, mode="one-way"))
        assert verdict["forward"]["target"]["device"] == "SRV"
        assert verdict["return"] is None

    @pytest.mark.parametrize("dst, result", [("bad", "INVALID"), ("8.8.8.8", "UNSUPPORTED")])
    def test_unjudged_flow_has_no_traces(self, net1, dst, result):
        verdict = verify(net1, dict(HTTPS, dst=dst))
        assert verdict["result"] == result
        assert verdict["forward"] is None
        assert verdict["return"] is None


def step(verdict):
    d = verdict["decisive"]
    return (d["device"], d["step"], d["rule_seq"])


class TestBasics:
    def test_no_acl_passes_both_ways(self, net1):
        verdict = verify(net1, HTTPS)
        assert verdict["result"] == "PASS"
        assert verdict["return"]["delivered"]

    def test_example_from_plan_deny_on_rule_1(self, net1):
        net1["acls"]["101"] = ["deny tcp 10.10.10.0 0.0.0.255 10.20.20.0 0.0.0.255 eq 443", "permit ip any any"]
        interface(net1, "R1", "g0/0")["acl_in"] = "101"
        verdict = verify(net1, HTTPS)
        assert verdict["result"] == "DENY"
        assert step(verdict) == ("R1", "acl_in", 1)
        assert compare(verdict, "PASS") == "DISAGREE"

    def test_same_acl_lets_http_through(self, net1):
        net1["acls"]["101"] = ["deny tcp 10.10.10.0 0.0.0.255 10.20.20.0 0.0.0.255 eq 443", "permit ip any any"]
        interface(net1, "R1", "g0/0")["acl_in"] = "101"
        assert verify(net1, dict(HTTPS, dst_port=80))["result"] == "PASS"

    def test_acl_not_bound_to_interface_does_nothing(self, net1):
        net1["acls"]["101"] = ["deny ip any any"]
        assert verify(net1, HTTPS)["result"] == "PASS"

    def test_acl_out(self, net1):
        net1["acls"]["110"] = ["deny tcp any host 10.20.20.5 eq 22", "permit ip any any"]
        interface(net1, "R1", "g0/1")["acl_out"] = "110"
        verdict = verify(net1, dict(HTTPS, dst_port=22))
        assert step(verdict) == ("R1", "acl_out", 1)


class TestStatelessReturn:
    def test_return_blocked_by_implicit_deny(self, net1):
        net1["acls"]["120"] = ["permit icmp any any"]
        interface(net1, "R1", "g0/1")["acl_in"] = "120"
        verdict = verify(net1, HTTPS)
        assert verdict["result"] == "DENY"
        assert verdict["reason"].startswith("복귀")
        assert step(verdict) == ("R1", "acl_in", None)

    def test_established_lets_reply_back(self, net1):
        net1["acls"]["120"] = ["permit tcp 10.20.20.0 0.0.0.255 eq 443 10.10.10.0 0.0.0.255 established"]
        interface(net1, "R1", "g0/1")["acl_in"] = "120"
        assert verify(net1, HTTPS)["result"] == "PASS"

    def test_one_way_ignores_return(self, net1):
        net1["acls"]["120"] = ["deny ip any any"]
        interface(net1, "R1", "g0/1")["acl_in"] = "120"
        syslog = {"src": "10.10.10.10", "dst": "10.20.20.5", "proto": "udp", "dst_port": 514, "mode": "one-way"}
        assert verify(net1, syslog)["result"] == "PASS"
        assert verify(net1, dict(syslog, mode="session"))["result"] == "DENY"


class TestRouting:
    def test_two_routers_pass(self, net2):
        assert verify(net2, HTTPS_FAR)["result"] == "PASS"

    def test_missing_return_route_is_found(self, net2):
        device(net2, "R2")["routes"] = []
        verdict = verify(net2, HTTPS_FAR)
        assert verdict["result"] == "DENY"
        assert verdict["reason"] == "복귀 방향: 경로 없음"
        assert verdict["decisive"]["device"] == "R2"

    def test_longest_prefix_wins(self, net2):
        device(net2, "R1")["routes"] = [
            {"prefix": "10.30.0.0/16", "next_hop": "10.10.10.99"},
            {"prefix": "10.30.30.0/25", "next_hop": "192.168.12.2"},
        ]
        assert verify(net2, HTTPS_FAR)["result"] == "PASS"

    def test_connected_beats_static_of_same_length(self, net1):
        device(net1, "R1")["routes"] = [{"prefix": "10.20.20.0/24", "next_hop": "10.10.10.99"}]
        assert verify(net1, HTTPS)["result"] == "PASS"

    def test_equal_cost_routes_are_unsupported(self, net2):
        device(net2, "R1")["routes"].append({"prefix": "10.30.30.0/24", "next_hop": "10.10.10.99"})
        assert verify(net2, HTTPS_FAR)["result"] == "UNSUPPORTED"

    def test_recursive_next_hop_is_unsupported(self, net2):
        device(net2, "R1")["routes"] = [{"prefix": "10.30.30.0/24", "next_hop": "172.16.0.1"}]
        assert verify(net2, HTTPS_FAR)["result"] == "UNSUPPORTED"

    def test_routing_loop(self, net2):
        net2["devices"].append({"id": "HX", "kind": "host", "interfaces": [{"name": "eth0", "ip": "10.99.0.5/24"}]})
        device(net2, "R1")["routes"].append({"prefix": "10.99.0.0/16", "next_hop": "192.168.12.2"})
        device(net2, "R2")["routes"].append({"prefix": "10.99.0.0/16", "next_hop": "192.168.12.1"})
        verdict = verify(net2, dict(HTTPS_FAR, dst="10.99.0.5"))
        assert (verdict["result"], verdict["reason"]) == ("DENY", "정방향: 라우팅 루프")

    def test_host_does_not_forward(self, net1):
        net1["devices"].append({"id": "HX", "kind": "host", "interfaces": [{"name": "eth0", "ip": "10.30.30.5/24"}]})
        device(net1, "R1")["routes"] = [{"prefix": "10.30.30.0/24", "next_hop": "10.20.20.5"}]
        assert verify(net1, HTTPS_FAR)["reason"] == "정방향: 호스트가 전달하지 않음"


class TestHostsAndInputs:
    def test_no_gateway(self, net1):
        del device(net1, "PC1")["gateway"]
        assert verify(net1, HTTPS)["reason"] == "정방향: 기본 게이트웨이 없음"

    def test_gateway_that_nobody_owns(self, net1):
        device(net1, "PC1")["gateway"] = "10.10.10.254"
        assert verify(net1, HTTPS)["reason"] == "정방향: 다음 홉 없음"

    def test_subnet_mask_mismatch_is_explained(self, net1):
        interface(net1, "SRV", "eth0")["ip"] = "10.20.20.5/25"
        verdict = verify(net1, HTTPS)
        assert verdict["result"] == "DENY"
        assert "서브넷" in verdict["decisive"]["detail"]

    def test_gateway_outside_subnet_is_invalid(self, net1):
        device(net1, "PC1")["gateway"] = "10.20.20.1"
        assert verify(net1, HTTPS)["result"] == "INVALID"

    def test_duplicate_ip_is_invalid(self, net1):
        interface(net1, "SRV", "eth0")["ip"] = "10.10.10.10/24"
        verdict = verify(net1, HTTPS)
        assert verdict["result"] == "INVALID"
        assert any("함께 쓰였습니다" in p for p in verdict["problems"])

    def test_network_address_on_host_is_invalid(self, net1):
        interface(net1, "PC1", "eth0")["ip"] = "10.10.10.0/24"
        assert verify(net1, HTTPS)["result"] == "INVALID"

    def test_destination_outside_model_is_unsupported(self, net1):
        assert verify(net1, dict(HTTPS, dst="8.8.8.8"))["result"] == "UNSUPPORTED"

    def test_ping_router_interface(self, net1):
        assert verify(net1, {"src": "10.10.10.10", "dst": "10.20.20.1", "proto": "icmp"})["result"] == "PASS"

    def test_ping_blocked_then_not_comparable_claims(self, net1):
        net1["acls"]["130"] = ["deny icmp any any echo", "permit ip any any"]
        interface(net1, "R1", "g0/0")["acl_in"] = "130"
        verdict = verify(net1, {"src": "10.10.10.10", "dst": "10.20.20.5", "proto": "icmp"})
        assert step(verdict) == ("R1", "acl_in", 1)
        assert compare(verify(net1, dict(HTTPS, dst="8.8.8.8")), "PASS") == "NOT_COMPARABLE"

    def test_ping_reply_needs_its_own_permit(self, net1):
        ping = {"src": "10.10.10.10", "dst": "10.20.20.5", "proto": "icmp"}
        interface(net1, "R1", "g0/1")["acl_in"] = "140"
        net1["acls"]["140"] = ["permit icmp any any echo"]
        verdict = verify(net1, ping)
        assert (verdict["result"], verdict["reason"]) == ("DENY", "복귀 방향: " + verdict["return"]["reason"])
        net1["acls"]["140"] = ["permit icmp any any echo-reply"]
        assert verify(net1, ping)["result"] == "PASS"

    def test_session_icmp_other_than_echo_is_unsupported(self, net1):
        assert verify(net1, {"src": "10.10.10.10", "dst": "10.20.20.5", "proto": "icmp", "icmp": "3"})["result"] == "UNSUPPORTED"

    def test_garbage_never_raises(self):
        for bad in ({}, {"devices": [{"id": "X"}]}, {"devices": "nope"}):
            try:
                result = verify(bad, {"src": "1.1.1.1", "dst": "2.2.2.2", "proto": "tcp", "dst_port": 1})["result"]
            except Exception as error:  # noqa: BLE001 — 어떤 입력에도 네 값 중 하나여야 한다
                raise AssertionError(f"{bad!r}에서 예외: {error!r}") from error
            assert result in ("INVALID", "UNSUPPORTED")
