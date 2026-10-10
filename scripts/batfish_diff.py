"""Local Batfish cross-check, never an engine verdict or real-device observation."""
from __future__ import annotations

import argparse
from copy import deepcopy
from dataclasses import dataclass
import ipaddress
import json
from pathlib import Path
import random
import re
import sys
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "engine" / "src"))
from netproof_engine.verify import verify

IMAGE = "batfish/allinone@sha256:54cb0ed94fd9a3c1ca0985f73e5be479e955cee9b9f6a6799b66be3364fd8e5c"
SERVICES = (("tcp", 22), ("tcp", 80), ("tcp", 443), ("udp", 53), ("icmp", None))
STEPS = {"DENIED_IN": "acl_in", "DENIED_OUT": "acl_out",
         **dict.fromkeys(("NO_ROUTE", "NULL_ROUTED", "NEIGHBOR_UNREACHABLE", "INSUFFICIENT_INFO", "LOOP"), "route")}


class SkipConfiguration(ValueError):
    def __init__(self, category, reason):
        self.category = category
        super().__init__(reason)


def interface_name(name):
    match = re.fullmatch(r"(eth|g|s|e|f)([0-9]+(?:/[0-9]+)*(?:\.[0-9]+)?)", name)
    if not match:
        raise SkipConfiguration("conversion", f"interface cannot be converted: {name!r}")
    return {"g": "GigabitEthernet", "s": "Serial", "eth": "Ethernet", "e": "Ethernet", "f": "FastEthernet"}[match[1]] + match[2]


def cisco_configs(network):
    """Translate only explicit supported fields; do not invent interface names."""
    configs = {}
    seen = set()
    for device in network.get("devices", []):
        if any(key in device for key in ("stateful", "rules_in", "default_in")) or any(
            any(key in iface for key in ("stateful", "rules_in", "default_in")) for iface in device.get("interfaces", [])
        ):
            raise SkipConfiguration("scope", f"stateful/structured firewall fields on {device.get('id')}")
        name = device["id"]
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*", name) or name.lower() in seen:
            raise SkipConfiguration("conversion", f"unsafe or case-colliding hostname: {name!r}")
        seen.add(name.lower())
        lines = ["!", "version 15.2", f"hostname {name}", "ip routing"]
        attached = set()
        converted = set()
        for iface in device["interfaces"]:
            ios_name = interface_name(iface["name"])
            if ios_name in converted:
                raise SkipConfiguration("conversion", f"interface mapping collision on {name}: {ios_name}")
            converted.add(ios_name)
            address = ipaddress.IPv4Interface(iface["ip"])
            lines.extend(("!", f"interface {ios_name}", f" ip address {address.ip} {address.netmask}", " no shutdown"))
            for direction in ("in", "out"):
                acl = iface.get(f"acl_{direction}")
                if acl is not None:
                    attached.add(str(acl))
                    lines.append(f" ip access-group {acl} {direction}")
        for route in device.get("routes", []):
            prefix = ipaddress.IPv4Network(route["prefix"])
            target = []
            if route.get("out_if"):
                target.append(interface_name(route["out_if"]))
            if route.get("next_hop"):
                target.append(route["next_hop"])
            lines.append(f"ip route {prefix.network_address} {prefix.netmask} {' '.join(target)}")
        if device["kind"] == "host" and device.get("gateway"):
            lines.append(f"ip route 0.0.0.0 0.0.0.0 {device['gateway']}")
        for acl in sorted(attached):
            lines.extend(network["acls"][acl])
        configs[name] = "\n".join((*lines, "end", ""))
    return configs


def host_flows(network):
    hosts = [str(ipaddress.IPv4Interface(iface["ip"]).ip)
             for device in network.get("devices", []) if device.get("kind") == "host"
             for iface in device.get("interfaces", [])]
    for src in hosts:
        for dst in hosts:
            if src == dst:
                continue
            for proto, port in SERVICES:
                for mode in ("session", "one-way"):
                    flow = {"src": src, "dst": dst, "proto": proto, "mode": mode}
                    if port is not None:
                        flow.update(src_port=50000, dst_port=port)
                    else:
                        flow["icmp"] = "echo"
                    yield flow


def packet_headers(flow, returning=False):
    headers = {"srcIps": flow["dst" if returning else "src"], "dstIps": flow["src" if returning else "dst"],
               "ipProtocols": [flow["proto"]]}
    if flow["proto"] == "icmp":
        headers.update(icmpTypes=[0 if returning else 8], icmpCodes=[0])
    else:
        sport, dport = flow.get("src_port", 50000), flow["dst_port"]
        headers.update(srcPorts=str(dport if returning else sport), dstPorts=str(sport if returning else dport))
        if flow["proto"] == "tcp":
            # All flag bits are constrained in the Batfish adapter, not just SYN/ACK.
            headers["tcpFlags"] = {"syn": not returning, "ack": returning}
    return headers


@dataclass(frozen=True)
class Outcome:
    disposition: str
    device: str | None
    step: str


def trace_outcomes(traces):
    if not traces:
        raise RuntimeError("Batfish returned no traces; cannot compare")
    return [Outcome(trace.disposition, str(trace.hops[-1].node) if trace.hops else None,
                    STEPS.get(trace.disposition, "other")) for trace in traces]


def engine_direction(verdict):
    return "forward" if not verdict["forward"]["delivered"] else "return"


def compare_flow(flow, verdict, traceroute):
    forward = traceroute(packet_headers(flow))
    direction, outcomes = "forward", forward
    passed = all(item.disposition == "ACCEPTED" for item in forward)
    if passed and flow["mode"] == "session":
        direction, outcomes = "return", traceroute(packet_headers(flow, True))
        passed = all(item.disposition == "ACCEPTED" for item in outcomes)
    result = "PASS" if passed else "DENY"
    result_same = verdict["result"] == result
    step_compared = result_same and result == "DENY"
    decisive = verdict.get("decisive") or {}
    denied = [item for item in outcomes if item.disposition != "ACCEPTED"]
    step_same = step_compared and direction == engine_direction(verdict) and all(
        item.device and item.device.lower() == str(decisive.get("device", "")).lower()
        and item.step != "other" and item.step == decisive.get("step") for item in denied
    )
    report = {"flow": flow, "engine": {"result": verdict["result"], "reason": verdict["reason"],
               "decisive": decisive, "direction": engine_direction(verdict) if verdict["result"] == "DENY" else None},
              "batfish": {"result": result, "direction": direction,
                          "outcomes": [vars(item) for item in outcomes]},
              "result_same": result_same, "step_compared": step_compared, "step_same": bool(step_same)}
    return report


def random_acl(rng, number, addresses):
    def address():
        ip = rng.choice(addresses)
        subnet = ipaddress.IPv4Network(f"{ip}/24", strict=False)
        return rng.choice(("any", f"host {ip}", f"{subnet.network_address} 0.0.0.255"))

    def port():
        op = rng.choice(("eq", "neq", "lt", "gt", "range"))
        value = rng.choice((22, 53, 80, 443, 50000))
        return f" {op} {value}" + (f" {min(65535, value + rng.choice((1, 1000)))}" if op == "range" else "")

    lines = []
    for _ in range(rng.randint(1, 6)):
        proto = rng.choice(("ip", "tcp", "udp", "icmp"))
        line = f"access-list {number} {rng.choice(('permit', 'deny'))} {proto} {address()}"
        if proto in ("tcp", "udp") and rng.randrange(3) == 0:
            line += port()
        line += f" {address()}"
        if proto in ("tcp", "udp") and rng.randrange(2) == 0:
            line += port()
        if proto == "tcp" and rng.randrange(3) == 0:
            line += " established"
        if proto == "icmp" and rng.randrange(2) == 0:
            line += " " + rng.choice(("echo", "echo-reply"))
        lines.append(line)
    if rng.choice((True, False)):
        lines.append(f"access-list {number} permit ip any any")
    return lines


def random_networks(seed, count):
    rng = random.Random(seed)
    templates = [json.loads(path.read_text(encoding="utf-8"))["network"]
                 for path in (ROOT / "cases" / "synthetic-01-https-acl.json", ROOT / "cases" / "synthetic-02-missing-return-route.json")]
    for shape, template in zip(("A", "B"), templates):
        for index in range(count):
            network = deepcopy(template)
            network["acls"] = {}
            addresses = [str(ipaddress.IPv4Interface(d["interfaces"][0]["ip"]).ip)
                         for d in network["devices"] if d["kind"] == "host"]
            number = 100
            for device in network["devices"]:
                if device["kind"] != "router":
                    continue
                for iface in device["interfaces"]:
                    iface.pop("acl_in", None)
                    iface.pop("acl_out", None)
                    for direction in ("in", "out"):
                        number += 1
                        iface[f"acl_{direction}"] = str(number)
                        network["acls"][str(number)] = random_acl(rng, number, addresses)
                if shape == "B":
                    is_r1 = device["id"] == "R1"
                    remote = addresses[1 if is_r1 else 0]
                    prefix = ipaddress.IPv4Network(f"{remote}/24", strict=False)
                    next_hop = "192.168.12.2" if is_r1 else "192.168.12.1"
                    route_kind = rng.choice(("correct", "missing", "wrong", "wider", "narrower"))
                    device["routes"] = []
                    if route_kind != "missing":
                        if route_kind == "wider":
                            prefix = prefix.supernet(new_prefix=16)
                        elif route_kind == "narrower":
                            prefix = ipaddress.IPv4Network(f"{remote}/32")
                        elif route_kind == "wrong":
                            next_hop = "192.168.12.3"
                        device["routes"].append({"prefix": str(prefix), "next_hop": next_hop})
            yield f"random-{shape}-{index:03d}", network


def configurations(seed, count):
    for path in sorted((ROOT / "cases").glob("*.json")):
        yield path.stem, json.loads(path.read_text(encoding="utf-8"))["network"]
    yield from random_networks(seed, count)


def write_snapshot(directory, configs):
    folder = directory / "configs"
    folder.mkdir(parents=True, exist_ok=True)
    for name, text in configs.items():
        (folder / f"{name}.cfg").write_text(text, encoding="utf-8")


def run_batfish(args):
    # Optional dependencies must never be imported by ordinary pytest/module import.
    from pybatfish.client.session import Session
    from pybatfish.datamodel.flow import HeaderConstraints, MatchTcpFlags, TcpFlags

    bf = Session(host=args.host)
    network_name = f"netproof-diff-{uuid.uuid4().hex}"
    bf.set_network(network_name)
    totals = dict(compared=0, result_same=0, result_different=0, step_compared=0, step_different=0,
                  conversion=0, scope=0, UNSUPPORTED=0, INVALID=0)
    keep = args.keep or Path(tempfile.mkdtemp(prefix="netproof-batfish-mismatches-"))
    mismatched = False
    started = time.monotonic()
    try:
        for index, (name, network) in enumerate(configurations(args.seed, args.count)):
            flows = list(host_flows(network))
            verdicts = [(flow, verify(network, flow)) for flow in flows]
            supported = []
            for flow, verdict in verdicts:
                if verdict["result"] in ("UNSUPPORTED", "INVALID"):
                    totals[verdict["result"]] += 1
                else:
                    supported.append((flow, verdict))
            if not supported:
                continue
            try:
                configs = cisco_configs(network)
            except SkipConfiguration as error:
                totals[error.category] += len(supported)
                print(json.dumps({"skipped_configuration": name, "category": error.category,
                                  "flows": len(supported), "reason": str(error)}), flush=True)
                continue
            with tempfile.TemporaryDirectory(prefix="netproof-batfish-snapshot-") as folder:
                write_snapshot(Path(folder), configs)
                bf.init_snapshot(folder, name=name)
                cache = {}

                def traceroute(headers):
                    key = json.dumps(headers, sort_keys=True)
                    if key not in cache:
                        options = dict(headers)
                        flags = options.pop("tcpFlags", None)
                        if flags is not None:
                            options["tcpFlags"] = [MatchTcpFlags(TcpFlags(**flags))]
                        src = headers["srcIps"]
                        owner = next(d["id"] for d in network["devices"]
                                     if any(str(ipaddress.IPv4Interface(i["ip"]).ip) == src for i in d["interfaces"]))
                        frame = bf.q.traceroute(startLocation=owner.lower(), headers=HeaderConstraints(**options)).answer().frame()
                        traces = [trace for row in frame["Traces"] for trace in row]
                        cache[key] = trace_outcomes(traces)
                    return cache[key]

                for flow, verdict in supported:
                    report = compare_flow(flow, verdict, traceroute)
                    totals["compared"] += 1
                    totals["result_same" if report["result_same"] else "result_different"] += 1
                    if report["step_compared"]:
                        totals["step_compared"] += 1
                        totals["step_different"] += not report["step_same"]
                    if not report["result_same"] or (report["step_compared"] and not report["step_same"]):
                        mismatched = True
                        preserved = keep / name
                        write_snapshot(preserved, configs)
                        (preserved / "network.json").write_text(json.dumps(network, ensure_ascii=False, indent=2), encoding="utf-8")
                        report.update(configuration=name, configs_path=str(preserved.resolve()))
                        # ASCII JSON escapes preserve Korean reasons in Windows redirected output too.
                        print(json.dumps(report), flush=True)
            if index % 10 == 0:
                print(f"checked configuration {index + 1}: {name}", file=sys.stderr, flush=True)
    finally:
        # Each run owns its uniquely named network. The external Docker owner stops its container.
        try:
            bf.delete_network(network_name)
        finally:
            if args.keep is None and keep.is_dir() and not any(keep.iterdir()):
                keep.rmdir()
    print("Cross-check only; not ground truth or real-device results. " +
          " ".join(f"{key}={value}" for key, value in totals.items()) +
          f" seed={args.seed} count_per_shape={args.count} elapsed_seconds={time.monotonic() - started:.2f}", flush=True)
    return 1 if mismatched else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--seed", type=int, default=20261010)
    parser.add_argument("--count", type=int, default=40, help="random configurations per shape")
    parser.add_argument("--keep", type=Path, help="preserve mismatching snapshots here (default: new temporary directory)")
    args = parser.parse_args(argv)
    if args.count < 0:
        parser.error("--count must be nonnegative")
    try:
        return run_batfish(args)
    except Exception as error:
        print(f"Batfish execution failed ({type(error).__name__}: {error}); exit 2. Install scripts/requirements-batfish.txt in a separate venv.\n"
              f"Start: docker run -d --name netproof-batfish -p 127.0.0.1:9996:9996 -p 127.0.0.1:9997:9997 {IMAGE}\n"
              "After execution: docker stop netproof-batfish", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
