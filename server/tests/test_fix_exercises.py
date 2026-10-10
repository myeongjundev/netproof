"""Approved tasks are model-checkable; solution configurations stay in this file."""
import copy
import json
from pathlib import Path

import pytest
from netproof_engine import policy_matrix

ROOT = Path(__file__).resolve().parents[2]
EXERCISES = json.loads((ROOT / "web/src/exercises.json").read_text(encoding="utf-8"))
CASES = {item["id"]: item for path in (ROOT / "cases").glob("*.json")
         if (item := json.loads(path.read_text(encoding="utf-8"))).get("id")}
SERVICES = [{"proto": "tcp", "dst_port": 22}, {"proto": "tcp", "dst_port": 80},
            {"proto": "tcp", "dst_port": 443}, {"proto": "udp", "dst_port": 53},
            {"proto": "icmp", "icmp": "echo"}]
SERVICE_KEYS = {"tcp/22", "tcp/80", "tcp/443", "udp/53", "icmp/echo"}


def matrix(network, exercise):
    return policy_matrix(network, {"mode": "session", "services": SERVICES,
                                  "intents": [{key: goal[key] for key in ("src", "dst", "service", "expect")}
                                              for goal in exercise["goals"]]})


def goal_cells(result, exercise):
    assert result["status"] == "OK", result["problems"]
    keys = {(goal["src"], goal["dst"], goal["service"]) for goal in exercise["goals"]}
    cells = [cell for cell in result["cells"] if (cell["src"], cell["dst"], cell["service"]) in keys]
    assert len(cells) == len(exercise["goals"])
    return cells


def modified_network(exercise):
    # Deliberately not exported as an example, fixture, document or browser data.
    network = copy.deepcopy(CASES[exercise["baseCaseId"]]["network"])
    if exercise["id"] == "fix-01":
        network["acls"]["101"] = [
            "access-list 101 deny tcp 10.10.10.0 0.0.0.255 10.20.20.0 0.0.0.255 eq 22",
            "access-list 101 permit ip any any",
        ]
    elif exercise["id"] == "fix-02":
        router = next(device for device in network["devices"] if device["id"] == "R2")
        router["routes"] = [{"prefix": "10.10.10.0/24", "next_hop": "192.168.12.1"}]
    elif exercise["id"] == "fix-03":
        network["acls"]["110"] = [
            "access-list 110 deny tcp host 10.10.10.10 host 10.20.20.5 eq 22",
            "access-list 110 deny tcp host 10.20.20.5 host 10.10.10.10 eq 22",
            "access-list 110 permit ip any any",
        ]
        router = next(device for device in network["devices"] if device["id"] == "R1")
        next(iface for iface in router["interfaces"] if iface["name"] == "g0/1")["acl_in"] = "110"
    else:
        raise AssertionError("Unexpected exercise")
    return network


@pytest.mark.parametrize("exercise", EXERCISES, ids=lambda item: item["id"])
def test_goals_use_existing_host_addresses_and_services(exercise):
    assert set(exercise) == {"id", "title", "baseCaseId", "prompt", "goals"}
    addresses = {iface["ip"].split("/")[0]
                 for device in CASES[exercise["baseCaseId"]]["network"]["devices"] if device["kind"] == "host"
                 for iface in device["interfaces"]}
    for goal in exercise["goals"]:
        assert set(goal) == {"src", "dst", "service", "expect", "label"}
        assert goal["src"] in addresses and goal["dst"] in addresses and goal["src"] != goal["dst"]
        assert goal["service"] in SERVICE_KEYS
        assert goal["expect"] in {"PASS", "DENY"}


@pytest.mark.parametrize("exercise", EXERCISES, ids=lambda item: item["id"])
def test_starting_network_has_a_goal_that_differs(exercise):
    result = matrix(CASES[exercise["baseCaseId"]]["network"], exercise)
    assert any(cell["policy"] != "AGREE" for cell in goal_cells(result, exercise))


@pytest.mark.parametrize("exercise", EXERCISES, ids=lambda item: item["id"])
def test_goals_can_all_agree_without_changing_original_cases(exercise):
    original = copy.deepcopy(CASES[exercise["baseCaseId"]])
    result = matrix(modified_network(exercise), exercise)
    assert all(cell["policy"] == "AGREE" for cell in goal_cells(result, exercise))
    assert CASES[exercise["baseCaseId"]] == original
