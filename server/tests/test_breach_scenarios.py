"""침해 가정 실습은 엔진으로 계산 가능한 요구사항만 담는다. 참고 구성은 이 파일에만 둔다."""
import copy
import json
from pathlib import Path

import pytest
from netproof_engine import policy_matrix

ROOT = Path(__file__).resolve().parents[2]
BREACHES = json.loads((ROOT / "web/src/breach.json").read_text(encoding="utf-8"))


def matrix(scenario, network):
    spec = {"mode": "session", "services": scenario["services"],
            "intents": [{key: keep[key] for key in ("src", "dst", "service", "expect")} for keep in scenario["keep"]]}
    result = policy_matrix(network, spec)
    assert result["status"] == "OK", result["problems"]
    return result


def keep_policies(scenario, result):
    keys = {(keep["src"], keep["dst"], keep["service"]): keep["label"] for keep in scenario["keep"]}
    return {keys[(cell["src"], cell["dst"], cell["service"])]: cell["policy"]
            for cell in result["cells"] if (cell["src"], cell["dst"], cell["service"]) in keys}


def reach(scenario, result, device=None):
    sources = {endpoint["ip"] for endpoint in result["endpoints"] if endpoint["device"] == (device or scenario["breached"])}
    return {(cell["dst"], cell["service"]) for cell in result["cells"] if cell["src"] in sources and cell["result"] == "PASS"}


def firewall_with_em1(scenario, rules):
    # Deliberately not exported as an example, fixture, document or browser data.
    network = copy.deepcopy(scenario["network"])
    firewall = next(device for device in network["devices"] if device.get("stateful"))
    next(iface for iface in firewall["interfaces"] if iface["name"] == "em1")["rules_in"] = rules
    return network


@pytest.mark.parametrize("scenario", BREACHES, ids=lambda item: item["id"])
def test_scenario_shape_uses_existing_hosts_and_services(scenario):
    assert set(scenario) == {"id", "title", "story", "task", "breached", "roles", "services", "keep", "network"}
    devices = {device["id"]: device for device in scenario["network"]["devices"]}
    assert devices[scenario["breached"]]["kind"] == "host"
    assert set(scenario["roles"]) == set(devices)
    addresses = {iface["ip"].split("/")[0] for device in devices.values() if device["kind"] == "host" for iface in device["interfaces"]}
    services = {f"{s['proto']}/{s.get('dst_port', s.get('icmp'))}" for s in scenario["services"]}
    for keep in scenario["keep"]:
        assert set(keep) == {"src", "dst", "service", "expect", "label", "why"}
        assert keep["src"] in addresses and keep["dst"] in addresses and keep["service"] in services
        assert keep["expect"] == "PASS"


# breach-03은 규칙을 이미 좁힌 뒤라 우회 길 하나(LOG)와 DB만 닿는다.
WIDE_REACH = {"breach-01": 3, "breach-02": 3, "breach-03": 2, "breach-04": 5}


@pytest.mark.parametrize("scenario", BREACHES, ids=lambda item: item["id"])
def test_starting_network_keeps_services_but_reaches_widely(scenario):
    result = matrix(scenario, scenario["network"])
    assert set(keep_policies(scenario, result).values()) == {"AGREE"}
    endpoints = {endpoint["ip"]: endpoint["device"] for endpoint in result["endpoints"]}
    assert len({endpoints[dst] for dst, _ in reach(scenario, result)}) >= WIDE_REACH[scenario["id"]]


def test_breach_01_can_shrink_to_the_database_service_only():
    scenario = next(item for item in BREACHES if item["id"] == "breach-01")
    original = copy.deepcopy(scenario)
    result = matrix(scenario, firewall_with_em1(scenario, [
        {"action": "pass", "proto": "tcp", "src": "10.0.10.10", "dst": "10.0.20.10", "dst_port": "3306"}]))
    assert set(keep_policies(scenario, result).values()) == {"AGREE"}
    assert reach(scenario, result) == {("10.0.20.10", "tcp/3306")}
    assert scenario == original


def test_breach_01_blocking_everything_breaks_the_database_service():
    scenario = next(item for item in BREACHES if item["id"] == "breach-01")
    result = matrix(scenario, firewall_with_em1(scenario, []))
    assert reach(scenario, result) == set()
    assert {label: policy for label, policy in keep_policies(scenario, result).items() if policy != "AGREE"} == {"WEB → DB · MySQL": "BLOCKED"}


def firewall_with(scenario, name, rules):
    network = copy.deepcopy(scenario["network"])
    firewall = next(device for device in network["devices"] if device.get("stateful"))
    next(iface for iface in firewall["interfaces"] if iface["name"] == name)["rules_in"] = rules
    return network


def test_breach_02_continues_from_a_narrowed_dmz():
    first, second = (next(item for item in BREACHES if item["id"] == key) for key in ("breach-01", "breach-02"))
    assert second["breached"] == "ADMIN"
    assert second["network"] == firewall_with_em1(first, [
        {"action": "pass", "proto": "tcp", "src": "10.0.10.10", "dst": "10.0.20.10", "dst_port": "3306"}])


def test_breach_02_can_shrink_to_the_management_ports_only():
    scenario = next(item for item in BREACHES if item["id"] == "breach-02")
    result = matrix(scenario, firewall_with(scenario, "em3", [
        {"action": "pass", "proto": "tcp", "src": "10.0.30.10", "dst": "10.0.10.10", "dst_port": "22"},
        {"action": "pass", "proto": "tcp", "src": "10.0.30.10", "dst": "10.0.20.10", "dst_port": "22"}]))
    assert set(keep_policies(scenario, result).values()) == {"AGREE"}
    assert reach(scenario, result) == {("10.0.10.10", "tcp/22"), ("10.0.20.10", "tcp/22")}


def test_breach_02_blocking_everything_breaks_management():
    scenario = next(item for item in BREACHES if item["id"] == "breach-02")
    result = matrix(scenario, firewall_with(scenario, "em3", []))
    assert reach(scenario, result) == set()
    assert {label: policy for label, policy in keep_policies(scenario, result).items() if policy != "AGREE"} == {
        "ADMIN → WEB · SSH": "BLOCKED", "ADMIN → DB · SSH": "BLOCKED"}


# 한 단계 더 가정(2차 확산, docs/breach-practice-design.md §4.1): 화면은 같은 매트릭스에서 다음 장비 출발 칸만 고른다.
def test_breach_01_one_more_assumption_stops_at_the_database():
    scenario = next(item for item in BREACHES if item["id"] == "breach-01")
    result = matrix(scenario, firewall_with_em1(scenario, [
        {"action": "pass", "proto": "tcp", "src": "10.0.10.10", "dst": "10.0.20.10", "dst_port": "3306"}]))
    assert reach(scenario, result, "DB") == set()


def test_breach_02_one_more_assumption_reaches_mysql_through_web():
    scenario = next(item for item in BREACHES if item["id"] == "breach-02")
    result = matrix(scenario, firewall_with(scenario, "em3", [
        {"action": "pass", "proto": "tcp", "src": "10.0.30.10", "dst": "10.0.10.10", "dst_port": "22"},
        {"action": "pass", "proto": "tcp", "src": "10.0.30.10", "dst": "10.0.20.10", "dst_port": "22"}]))
    from_web = reach(scenario, result, "WEB")
    assert from_web == {("10.0.20.10", "tcp/3306")}
    assert not from_web & reach(scenario, result)
    assert keep_policies(scenario, result)["WEB → DB · MySQL"] == "AGREE"


def without_interface(scenario, device_id, name):
    network = copy.deepcopy(scenario["network"])
    device = next(device for device in network["devices"] if device["id"] == device_id)
    device["interfaces"] = [iface for iface in device["interfaces"] if iface["name"] != name]
    return network


def test_breach_03_continues_with_a_dual_homed_log_server():
    second, third = (next(item for item in BREACHES if item["id"] == key) for key in ("breach-02", "breach-03"))
    expected = firewall_with(second, "em3", [
        {"action": "pass", "proto": "tcp", "src": "10.0.30.10", "dst": "10.0.10.10", "dst_port": "22"},
        {"action": "pass", "proto": "tcp", "src": "10.0.30.10", "dst": "10.0.20.10", "dst_port": "22"}])
    expected["devices"].insert(4, {"id": "LOG", "kind": "host", "gateway": "10.0.30.1", "interfaces": [
        {"name": "eth0", "ip": "10.0.30.20/24"}, {"name": "eth1", "ip": "10.0.10.20/24"}]})
    assert third["breached"] == "WEB" and third["keep"] == second["keep"]
    assert third["network"] == expected


def test_breach_03_reaches_the_log_server_around_the_firewall():
    scenario = next(item for item in BREACHES if item["id"] == "breach-03")
    result = matrix(scenario, scenario["network"])
    assert reach(scenario, result) == {("10.0.20.10", "tcp/3306")} | {("10.0.10.20", service) for service in
                                                                     ("tcp/22", "tcp/80", "tcp/443", "tcp/3306", "icmp/echo")}


def test_breach_03_firewall_rules_alone_do_not_close_the_bypass():
    scenario = next(item for item in BREACHES if item["id"] == "breach-03")
    network = copy.deepcopy(scenario["network"])
    firewall = next(device for device in network["devices"] if device.get("stateful"))
    for iface in firewall["interfaces"]:
        iface["rules_in"] = []
    result = matrix(scenario, network)
    assert {dst for dst, _ in reach(scenario, result)} == {"10.0.10.20"}
    assert set(keep_policies(scenario, result).values()) == {"BLOCKED"}


def test_breach_03_removing_the_extra_card_leaves_the_database_service_only():
    scenario = next(item for item in BREACHES if item["id"] == "breach-03")
    result = matrix(scenario, without_interface(scenario, "LOG", "eth1"))
    assert set(keep_policies(scenario, result).values()) == {"AGREE"}
    assert reach(scenario, result) == {("10.0.20.10", "tcp/3306")}


def test_breach_03_one_more_assumption_reaches_the_admin_pc():
    scenario = next(item for item in BREACHES if item["id"] == "breach-03")
    result = matrix(scenario, scenario["network"])
    from_log = {(dst, service) for dst, service in reach(scenario, result, "LOG") if dst != "10.0.10.10"}
    assert from_log == {("10.0.30.10", service) for service in ("tcp/22", "tcp/80", "tcp/443", "tcp/3306", "icmp/echo")}
    assert not from_log & reach(scenario, result)


def test_breach_04_continues_with_a_vendor_vpn():
    third, fourth = (next(item for item in BREACHES if item["id"] == key) for key in ("breach-03", "breach-04"))
    expected = without_interface(third, "LOG", "eth1")
    expected["devices"].insert(5, {"id": "VENDOR", "kind": "host", "gateway": "10.8.0.1", "interfaces": [{"name": "tun0", "ip": "10.8.0.10/24"}]})
    next(device for device in expected["devices"] if device.get("stateful"))["interfaces"].append(
        {"name": "ovpns1", "ip": "10.8.0.1/24", "default_in": "block", "rules_in": [{"action": "pass", "proto": "ip", "src": "10.8.0.0/24", "dst": "any"}]})
    assert fourth["breached"] == "VENDOR" and fourth["keep"][:4] == third["keep"]
    assert fourth["network"] == expected


def test_breach_04_vpn_reaches_every_host_with_every_service():
    scenario = next(item for item in BREACHES if item["id"] == "breach-04")
    result = matrix(scenario, scenario["network"])
    endpoints = {endpoint["ip"]: endpoint["device"] for endpoint in result["endpoints"]}
    assert {endpoints[dst] for dst, _ in reach(scenario, result)} == {"OUTSIDE", "WEB", "DB", "ADMIN", "LOG"}
    assert len(reach(scenario, result)) == 25


def test_breach_04_only_the_maintenance_app_left():
    scenario = next(item for item in BREACHES if item["id"] == "breach-04")
    result = matrix(scenario, firewall_with(scenario, "ovpns1", [
        {"action": "pass", "proto": "tcp", "src": "10.8.0.10", "dst": "10.0.20.10", "dst_port": "22"}]))
    assert set(keep_policies(scenario, result).values()) == {"AGREE"}
    assert reach(scenario, result) == {("10.0.20.10", "tcp/22")}


def test_breach_04_blocking_the_vpn_breaks_vendor_maintenance():
    scenario = next(item for item in BREACHES if item["id"] == "breach-04")
    result = matrix(scenario, firewall_with(scenario, "ovpns1", []))
    assert reach(scenario, result) == set()
    assert {label: policy for label, policy in keep_policies(scenario, result).items() if policy != "AGREE"} == {"VENDOR → DB · SSH": "BLOCKED"}
