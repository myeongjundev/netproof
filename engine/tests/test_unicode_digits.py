import json
from pathlib import Path

import pytest

from netproof_engine import verify
from netproof_engine.acl import PortMatch, parse_rule


CASE_PATH = Path(__file__).resolve().parents[2] / "cases/synthetic-01-https-acl.json"


def case():
    return json.loads(CASE_PATH.read_text(encoding="utf-8"))


@pytest.mark.parametrize("digit", ["²", "①"])
@pytest.mark.parametrize("line", [
    "{digit} deny ip any any",
    "deny tcp any any eq {digit}",
    "permit icmp any any {digit}",
])
def test_unconvertible_acl_digit_returns_unsupported(digit, line):
    data = case()
    raw = line.format(digit=digit)
    data["network"]["acls"]["101"] = [raw]

    verdict = verify(data["network"], data["flow"])

    assert verdict["result"] == "UNSUPPORTED"
    assert "1번 줄" in verdict["reason"]
    assert raw in verdict["reason"]


@pytest.mark.parametrize("digit", ["²", "①"])
def test_unconvertible_flow_icmp_digit_returns_invalid(digit):
    data = case()
    flow = dict(data["flow"], proto="icmp", icmp=digit)

    verdict = verify(data["network"], flow)

    assert verdict["result"] == "INVALID"
    assert any(digit in problem for problem in verdict["problems"])


def test_unconvertible_extra_port_is_not_a_second_port():
    data = case()
    data["network"]["acls"]["101"] = ["deny tcp any any eq 443 ²"]

    verdict = verify(data["network"], data["flow"])

    assert verdict["result"] == "UNSUPPORTED"
    assert "지원하지 않는 옵션" in verdict["reason"]


def test_ascii_sequence_and_port_still_work():
    assert parse_rule("10 deny tcp any any eq 443", 1).seq == 10
    assert parse_rule("permit tcp any any eq 8080", 1).dst_port == PortMatch("eq", 8080)

    data = case()
    data["network"]["acls"]["101"] = ["permit tcp any any eq 8080"]
    verdict = verify(data["network"], dict(data["flow"], dst_port=8080, mode="one-way"))

    assert verdict["result"] == "PASS"


def test_ascii_icmp_rule_and_flow_still_work():
    assert parse_rule("permit icmp any any 8", 1).icmp_type == 8

    data = case()
    data["network"]["acls"]["101"] = ["permit icmp any any 8"]
    verdict = verify(data["network"], dict(data["flow"], proto="icmp", icmp="8", mode="one-way"))

    assert verdict["result"] == "PASS"


def test_engine_source_does_not_use_digit_predicate_before_int():
    source = Path(__file__).resolve().parents[1] / "src/netproof_engine"
    assert all("isdigit(" not in path.read_text(encoding="utf-8") for path in source.rglob("*.py"))


def verdict_for_long_digit_path(path, digits):
    data = case()
    flow = data["flow"]
    if path == "port":
        data["network"]["acls"]["101"] = [f"deny tcp any any eq {digits}"]
    elif path == "sequence":
        data["network"]["acls"]["101"] = [f"{digits} deny ip any any"]
    elif path == "acl_icmp":
        data["network"]["acls"]["101"] = [f"permit icmp any any {digits}"]
        flow = dict(flow, proto="icmp", icmp="echo", mode="one-way")
    else:
        flow = dict(flow, proto="icmp", icmp=digits, mode="one-way")
    return verify(data["network"], flow)


@pytest.mark.parametrize("path", ["port", "sequence", "acl_icmp", "flow_icmp"])
def test_5000_digit_values_follow_existing_error_paths(path):
    verdict = verdict_for_long_digit_path(path, "9" * 5000)

    assert verdict["result"] == ("INVALID" if path == "flow_icmp" else "UNSUPPORTED")


@pytest.mark.parametrize("length", [1, 3, 5, 10, 11, 4300, 4301, 5000])
@pytest.mark.parametrize("path", ["port", "sequence", "acl_icmp", "flow_icmp"])
def test_digit_lengths_never_escape_as_exceptions(path, length):
    verdict = verdict_for_long_digit_path(path, "9" * length)

    assert verdict["result"] in ("PASS", "DENY", "UNSUPPORTED", "INVALID")


@pytest.mark.parametrize("path,value", [
    ("port", "0000000443"),
    ("sequence", "4294967295"),
    ("acl_icmp", "0000000008"),
    ("flow_icmp", "0000000008"),
])
def test_ten_digit_boundary_keeps_existing_numeric_behavior(path, value):
    verdict = verdict_for_long_digit_path(path, value)

    assert verdict["result"] in ("PASS", "DENY")


def test_ten_digit_port_and_sequence_keep_their_values():
    assert parse_rule("permit tcp any any eq 0000000443", 1).dst_port == PortMatch("eq", 443)
    assert parse_rule("4294967295 deny ip any any", 1).seq == 4294967295


@pytest.mark.parametrize("path,value", [
    ("port", "00000000443"),
    ("sequence", "04294967295"),
    ("acl_icmp", "00000000008"),
    ("flow_icmp", "00000000008"),
])
def test_eleven_digit_boundary_uses_existing_error_paths(path, value):
    verdict = verdict_for_long_digit_path(path, value)

    assert verdict["result"] == ("INVALID" if path == "flow_icmp" else "UNSUPPORTED")
