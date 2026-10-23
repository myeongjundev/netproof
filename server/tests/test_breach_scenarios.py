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


def reach(scenario, result):
    sources = {endpoint["ip"] for endpoint in result["endpoints"] if endpoint["device"] == scenario["breached"]}
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


@pytest.mark.parametrize("scenario", BREACHES, ids=lambda item: item["id"])
def test_starting_network_keeps_services_but_reaches_widely(scenario):
    result = matrix(scenario, scenario["network"])
    assert set(keep_policies(scenario, result).values()) == {"AGREE"}
    endpoints = {endpoint["ip"]: endpoint["device"] for endpoint in result["endpoints"]}
    assert len({endpoints[dst] for dst, _ in reach(scenario, result)}) >= 3


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
