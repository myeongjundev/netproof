"""Pure conversion/comparison tests: optional pybatfish and Docker are not needed."""
import builtins
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace

import pytest

ROOT = Path(__file__).resolve().parents[2]


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / "batfish_diff.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


diff = load_script("batfish_diff")


def case(number):
    return json.loads(next((ROOT / "cases").glob(f"synthetic-{number:02d}-*.json")).read_text(encoding="utf-8"))["network"]


@pytest.mark.parametrize("number", [1, 2, 3])
def test_cisco_translation_retains_addresses_bindings_routes_and_acl_lines(number):
    network = case(number)
    configs = diff.cisco_configs(network)
    assert configs["PC1"].startswith("!\nversion 15.2\nhostname PC1\nip routing\n")
    assert "interface Ethernet0\n ip address 10.10.10.10 255.255.255.0\n no shutdown" in configs["PC1"]
    assert "ip route 0.0.0.0 0.0.0.0 10.10.10.1" in configs["PC1"]
    assert "interface GigabitEthernet0/0\n ip address 10.10.10.1 255.255.255.0" in configs["R1"]
    if number == 2:
        assert "interface Serial0/0\n ip address 192.168.12.1 255.255.255.252" in configs["R1"]
        assert "ip route 10.30.30.0 255.255.255.0 192.168.12.2" in configs["R1"]
        assert "ip route 10.10.10.0" not in configs["R2"]
        assert "ip route 0.0.0.0 0.0.0.0 10.30.30.1" in configs["SRV2"]
    else:
        acl, direction = ("101", "in") if number == 1 else ("110", "out")
        assert f" ip access-group {acl} {direction}" in configs["R1"]
        for line in network["acls"][acl]:
            assert line in configs["R1"]
            assert line not in configs["PC1"]
    assert network == case(number)  # Conversion cannot mutate the original cases.


@pytest.mark.parametrize("name,expected", [("g0/0", "GigabitEthernet0/0"), ("s0/1/2", "Serial0/1/2"),
    ("eth0", "Ethernet0"), ("e1", "Ethernet1"), ("f0/1", "FastEthernet0/1"), ("g0/0.10", "GigabitEthernet0/0.10")])
def test_interface_names(name, expected):
    assert diff.interface_name(name) == expected


@pytest.mark.parametrize("name", ["ens33", "wan", "g", "Gi0/0", "eth0;shutdown", "g0//0"])
def test_unknown_interface_skips_entire_configuration(name):
    network = case(1)
    network["devices"][0]["interfaces"][0]["name"] = name
    with pytest.raises(diff.SkipConfiguration, match="interface cannot be converted") as error:
        diff.cisco_configs(network)
    assert error.value.category == "conversion"


@pytest.mark.parametrize("location,field,value", [("device", "stateful", True), ("device", "stateful", False),
    ("device", "rules_in", []), ("interface", "rules_in", []), ("interface", "default_in", "block")])
def test_firewall_fields_are_out_of_scope_even_if_empty(location, field, value):
    network = case(1)
    device = network["devices"][1]
    (device if location == "device" else device["interfaces"][0])[field] = value
    with pytest.raises(diff.SkipConfiguration, match="stateful/structured") as error:
        diff.cisco_configs(network)
    assert error.value.category == "scope"


def test_mapping_collision_and_case_colliding_devices_are_not_guessed():
    network = case(1)
    network["devices"][1]["interfaces"] = [{"name": "e0", "ip": "10.1.0.1/24"}, {"name": "eth0", "ip": "10.2.0.1/24"}]
    with pytest.raises(diff.SkipConfiguration, match="mapping collision"):
        diff.cisco_configs(network)
    network = case(1)
    network["devices"][-1]["id"] = "pc1"
    with pytest.raises(diff.SkipConfiguration, match="case-colliding"):
        diff.cisco_configs(network)


def test_route_out_interface_is_translated():
    network = case(2)
    network["devices"][1]["routes"][0]["out_if"] = "s0/0"
    assert "ip route 10.30.30.0 255.255.255.0 Serial0/0 192.168.12.2" in diff.cisco_configs(network)["R1"]


@pytest.mark.parametrize("proto,port", [("tcp", 443), ("udp", 53), ("icmp", None)])
def test_forward_and_direct_reverse_packets(proto, port):
    flow = {"src": "10.10.10.10", "dst": "10.20.20.5", "proto": proto, "dst_port": port}
    forward, reverse = diff.packet_headers(flow), diff.packet_headers(flow, True)
    assert (forward["srcIps"], forward["dstIps"]) == (reverse["dstIps"], reverse["srcIps"])
    assert forward["ipProtocols"] == reverse["ipProtocols"] == [proto]
    if proto == "icmp":
        assert (forward["icmpTypes"], reverse["icmpTypes"]) == ([8], [0])
        assert forward["icmpCodes"] == reverse["icmpCodes"] == [0]
        assert "srcPorts" not in forward
    else:
        assert forward["srcPorts"] == reverse["dstPorts"] == "50000"
        assert forward["dstPorts"] == reverse["srcPorts"] == str(port)
        if proto == "tcp":
            assert forward["tcpFlags"] == {"syn": True, "ack": False}
            assert reverse["tcpFlags"] == {"syn": False, "ack": True}
        else:
            assert "tcpFlags" not in forward and "tcpFlags" not in reverse


@pytest.mark.parametrize("disposition,step", [("DENIED_IN", "acl_in"), ("DENIED_OUT", "acl_out"),
    ("NO_ROUTE", "route"), ("NULL_ROUTED", "route"), ("NEIGHBOR_UNREACHABLE", "route"),
    ("INSUFFICIENT_INFO", "route"), ("LOOP", "route"), ("EXITS_NETWORK", "other")])
def test_disposition_mapping_and_last_hop(disposition, step):
    trace = SimpleNamespace(disposition=disposition, hops=[SimpleNamespace(node="pc1"), SimpleNamespace(node="r1")])
    assert diff.trace_outcomes([trace]) == [diff.Outcome(disposition, "r1", step)]


def test_no_trace_is_an_execution_error_not_pass():
    with pytest.raises(RuntimeError, match="no traces"):
        diff.trace_outcomes([])


@pytest.mark.parametrize("mode,first_pass", [("one-way", True), ("session", False), ("session", True)])
def test_reverse_is_requested_only_for_a_forward_pass_in_session(mode, first_pass):
    flow = {"src": "10.10.10.10", "dst": "10.20.20.5", "proto": "icmp", "mode": mode}
    network = case(1)
    network["acls"]["101"] = ["access-list 101 permit ip any any"] if first_pass else ["access-list 101 deny ip any any"]
    calls = []
    def traceroute(headers):
        calls.append(headers)
        return [diff.Outcome("ACCEPTED", "srv", "other")] if first_pass else [diff.Outcome("DENIED_IN", "r1", "acl_in")]
    report = diff.compare_flow(flow, diff.verify(network, flow), traceroute)
    assert len(calls) == (2 if mode == "session" and first_pass else 1)
    assert report["result_same"]
    if len(calls) == 2:
        assert calls[1]["icmpTypes"] == [0]


@pytest.mark.parametrize("direction,device,step,expected", [("return", "r2", "route", True),
    ("forward", "r2", "route", False), ("return", "r1", "route", False), ("return", "r2", "other", False)])
def test_deny_compares_case_insensitive_device_stage_and_direction(direction, device, step, expected):
    flow = next(diff.host_flows(case(2)))
    verdict = diff.verify(case(2), flow)
    def traceroute(headers):
        if direction == "return" and headers["srcIps"] == flow["src"]:
            return [diff.Outcome("ACCEPTED", "srv2", "other")]
        return [diff.Outcome("NO_ROUTE", device, step)]
    report = diff.compare_flow(flow, verdict, traceroute)
    assert report["step_compared"] and report["step_same"] is expected


def test_every_trace_must_be_accepted_and_every_denied_stage_must_agree():
    flow = next(diff.host_flows(case(1)))
    verdict = diff.verify(case(1), {**flow, "dst_port": 443})
    report = diff.compare_flow(flow, verdict, lambda h: [diff.Outcome("ACCEPTED", "srv", "other"),
        diff.Outcome("DENIED_IN", "r1", "acl_in"), diff.Outcome("DENIED_OUT", "r1", "acl_out")])
    assert report["result_same"] and report["step_compared"] and not report["step_same"]


def test_random_shapes_reproducible_supported_and_cover_requested_grammar():
    first = list(diff.random_networks(20261010, 40))
    assert first == list(diff.random_networks(20261010, 40))
    assert first != list(diff.random_networks(1, 40))
    assert len(first) == 80
    lines, routes = [], []
    for name, network in first:
        assert len([d for d in network["devices"] if d["kind"] == "router"]) == (1 if "-A-" in name else 2)
        lines.extend(line for acl in network["acls"].values() for line in acl)
        routes.extend(route for device in network["devices"] for route in device.get("routes", []))
        diff.cisco_configs(network)
        flows = list(diff.host_flows(network))
        assert len(flows) == 20
        assert all(diff.verify(network, flow)["result"] != "INVALID" for flow in flows)
    text = "\n".join(lines)
    for token in (" permit ", " deny ", " ip ", " tcp ", " udp ", " icmp ", " any", " host ", "0.0.0.255",
                  " eq ", " neq ", " lt ", " gt ", " range ", " established", " echo", " echo-reply"):
        assert token in text
    assert {r["prefix"].split("/")[1] for r in routes} == {"16", "24", "32"}
    assert any(r["next_hop"] == "192.168.12.3" for r in routes)


def test_import_never_requires_pybatfish(monkeypatch):
    original = builtins.__import__
    def guarded(name, *args, **kwargs):
        assert not name.startswith("pybatfish")
        return original(name, *args, **kwargs)
    monkeypatch.setattr(builtins, "__import__", guarded)
    assert load_script("batfish_diff_import_guard").IMAGE == diff.IMAGE


@pytest.mark.parametrize("failure", [ImportError("not installed"), ConnectionError("unavailable")])
def test_execution_failure_gives_exit_two_and_pinned_loopback_setup(monkeypatch, capsys, failure):
    def fail(args):
        raise failure
    monkeypatch.setattr(diff, "run_batfish", fail)
    assert diff.main([]) == 2
    output = capsys.readouterr().err
    assert diff.IMAGE in output and "127.0.0.1:9996:9996" in output and "docker stop" in output


def fake_batfish(monkeypatch, answer):
    state = {"deleted": False, "calls": []}
    class Header:
        def __init__(self, **kwargs):
            self.values = kwargs
    class Flags(Header):
        pass
    class Match:
        def __init__(self, flags):
            self.flags = flags
    class Session:
        def __init__(self, host):
            self.q = self
        def set_network(self, name):
            assert name.startswith("netproof-diff-")
        def init_snapshot(self, folder, name):
            assert (Path(folder) / "configs" / "R1.cfg").is_file()
        def traceroute(self, *, startLocation, headers):
            state["calls"].append((startLocation, headers.values))
            trace = answer(headers.values)
            return SimpleNamespace(answer=lambda: SimpleNamespace(frame=lambda: {"Traces": [[trace]]}))
        def delete_network(self, name):
            assert name.startswith("netproof-diff-")
            state["deleted"] = True
    for name, members in {"pybatfish.client.session": {"Session": Session},
                          "pybatfish.datamodel.flow": {"HeaderConstraints": Header, "TcpFlags": Flags, "MatchTcpFlags": Match}}.items():
        module = ModuleType(name)
        module.__dict__.update(members)
        monkeypatch.setitem(sys.modules, name, module)
    return state


@pytest.mark.parametrize("mismatch", [False, True])
def test_run_preserves_only_mismatches_and_reports_counts_without_external_dependencies(monkeypatch, tmp_path, capsys, mismatch):
    network = case(1)
    flow = next(diff.host_flows(network))  # SSH session passes both ways.
    scope = deepcopy(network)
    scope["devices"][1]["stateful"] = False
    conversion = deepcopy(network)
    conversion["devices"][0]["interfaces"][0]["name"] = "ens33"
    invalid, unsupported = {**flow, "proto": "bad"}, {**flow, "proto": "icmp", "icmp": "echo-reply"}
    monkeypatch.setattr(diff, "configurations", lambda seed, count: iter([("valid", network), ("scope", scope), ("conversion", conversion)]))
    monkeypatch.setattr(diff, "host_flows", lambda net: iter([flow, invalid, unsupported]))
    def answer(headers):
        return SimpleNamespace(disposition="DENIED_IN" if mismatch else "ACCEPTED", hops=[SimpleNamespace(node="r1")])
    state = fake_batfish(monkeypatch, answer)
    assert diff.main(["--keep", str(tmp_path)]) == int(mismatch)
    output = capsys.readouterr().out
    assert "compared=1" in output and f"result_different={int(mismatch)}" in output
    assert "conversion=1 scope=1 UNSUPPORTED=3 INVALID=3" in output
    assert "elapsed_seconds=" in output and state["deleted"]
    assert state["calls"][0][0] == "pc1"
    assert state["calls"][0][1]["tcpFlags"][0].flags.values == {"syn": True, "ack": False}
    if mismatch:
        report = json.loads(next(line for line in output.splitlines() if '"configuration": "valid"' in line))
        assert report["flow"] == flow and report["engine"]["reason"]
        assert Path(report["configs_path"]) == tmp_path / "valid"
        assert (tmp_path / "valid" / "configs" / "R1.cfg").read_text() == diff.cisco_configs(network)["R1"]
        assert json.loads((tmp_path / "valid" / "network.json").read_text()) == network
    else:
        assert not list(tmp_path.iterdir())
        assert state["calls"][1][0] == "srv"
        assert state["calls"][1][1]["tcpFlags"][0].flags.values == {"syn": False, "ack": True}


def test_negative_count_is_rejected_before_optional_import():
    with pytest.raises(SystemExit) as error:
        diff.main(["--count", "-1"])
    assert error.value.code == 2


def test_observed_wrong_next_hop_stage_difference_is_kept_and_exits_one(monkeypatch, tmp_path, capsys):
    network = case(2)
    network["devices"][1]["routes"][0]["next_hop"] = "192.168.12.3"
    flow = next(diff.host_flows(network))
    assert diff.verify(network, flow)["decisive"]["step"] == "send"
    monkeypatch.setattr(diff, "configurations", lambda seed, count: iter([("wrong-next-hop", network)]))
    monkeypatch.setattr(diff, "host_flows", lambda net: iter([flow]))
    state = fake_batfish(monkeypatch, lambda headers: SimpleNamespace(
        disposition="NEIGHBOR_UNREACHABLE", hops=[SimpleNamespace(node="r1")]))
    assert diff.main(["--keep", str(tmp_path)]) == 1
    output = capsys.readouterr().out
    report = json.loads(output.splitlines()[0])
    assert report["result_same"] and report["step_compared"] and not report["step_same"]
    assert report["engine"]["decisive"]["step"] == "send"
    assert report["batfish"]["outcomes"][0]["step"] == "route"
    assert "result_different=0 step_compared=1 step_different=1" in output
    assert Path(report["configs_path"]).is_dir() and state["deleted"]


def test_network_and_empty_default_keep_are_cleaned_on_traceroute_failure(monkeypatch, tmp_path, capsys):
    network = case(1)
    flow = next(diff.host_flows(network))
    monkeypatch.setattr(diff, "configurations", lambda seed, count: iter([("valid", network)]))
    monkeypatch.setattr(diff, "host_flows", lambda net: iter([flow]))
    keep = tmp_path / "empty-keep"
    keep.mkdir()
    original_mkdtemp = diff.tempfile.mkdtemp
    def mkdtemp(*args, **kwargs):
        if kwargs.get("prefix") == "netproof-batfish-mismatches-":
            return str(keep)
        return original_mkdtemp(*args, **kwargs)
    monkeypatch.setattr(diff.tempfile, "mkdtemp", mkdtemp)
    def fail(headers):
        raise ConnectionError("interrupted traceroute")
    state = fake_batfish(monkeypatch, fail)
    assert diff.main([]) == 2
    assert state["deleted"] and not keep.exists()
    assert "interrupted traceroute" in capsys.readouterr().err
