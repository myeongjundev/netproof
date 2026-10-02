"""붙여넣은 관측을 실제 결과 입력 후보로 변환한다. verify 판정과는 별개다."""

import re
from ipaddress import IPv4Address


def _ip(value):
    if not isinstance(value, str):
        return None
    try:
        return str(IPv4Address(value))
    except ValueError:
        return None


def _number(value):
    if not isinstance(value, str) or not 1 <= len(value) <= 7 or not value.isascii() or not value.isdecimal():
        return None
    return int(value)


def observe(text: str, flow: dict) -> dict:
    """상한·단일 대상·흐름 일치를 확인하며 원문을 반환/저장하지 않는다."""
    result = dict(status="REJECTED", problems=[], tool=None, observed="unknown", result=None,
                  source=None, note="", target=None, evidence=[])

    def reject(problem):
        result["problems"] = [problem[:200]]
        return result

    if not isinstance(text, str) or not text.strip():
        return reject("출력 텍스트를 붙여넣으세요")
    if len(text) > 4000 or len(text.splitlines()) > 80:
        return reject("출력은 4000자·80줄까지입니다")
    if any(ord(c) < 32 and c not in "\r\n\t" for c in text):
        return reject("제어문자가 있는 출력은 지원하지 않습니다")
    if not isinstance(flow, dict) or (dst := _ip(flow.get("dst"))) is None:
        return reject("흐름의 목적지 IPv4가 필요합니다")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    ips = re.findall(r"(?<![\w.])[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+(?![\w.])", text)
    if not ips or any(_ip(ip) != dst for ip in ips):
        return reject("출력의 목적지 IPv4가 사례와 다르거나 다른 장비 주소가 섞여 있습니다")
    result["target"] = dst
    nmap = [line for line in lines if line.startswith("Nmap scan report for ")]
    ping_headers = [line for line in lines if re.match(r"(?:PING |Pinging |Ping (?!statistics))", line)]
    ping_stats = [line for line in lines if "ping statistics" in line.lower() or re.search(r"(?:의|에 대한) (?:Ping )?통계", line)]
    if nmap and (ping_headers or ping_stats):
        return reject("ping과 Nmap 출력을 섞지 마세요")
    evidence = []
    if nmap:
        if len(nmap) != 1:
            return reject("Nmap 대상은 하나만 지원합니다")
        header = re.fullmatch(r"Nmap scan report for (?:[^()\n]+ \()?([0-9.]+)\)?", nmap[0])
        if not header or _ip(header[1]) != dst:
            return reject("Nmap 대상 IPv4를 읽을 수 없습니다")
        ports = [line for line in lines if re.match(r"\S+/(?:tcp|udp)\s", line)]
        if len(ports) != 1:
            return reject("Nmap 단일 포트 결과 한 줄이 필요합니다")
        port = re.fullmatch(r"([0-9]+)/([a-z]+)\s+(open|closed|filtered|open\|filtered)(?:\s+.*)?", ports[0])
        if not port:
            return reject("지원하지 않는 포트 숫자·상태입니다")
        expected_port = flow.get("dst_port")
        if isinstance(expected_port, int) and not isinstance(expected_port, bool):
            expected_port = str(expected_port)
        number = _number(port[1])
        if number is None or not 1 <= number <= 65535 or number != _number(expected_port) or port[2] != flow.get("proto"):
            return reject("출력의 프로토콜·목적지 포트가 사례와 다릅니다")
        tool = "nmap"
        observed = "filtered" if port[3] == "open|filtered" else port[3]
        evidence = [nmap[0], ports[0]]
    else:
        if len(ping_headers) != 1 or len(ping_stats) != 1:
            return reject("단일 대상 ping 머리글과 통계 블록이 필요합니다")
        if flow.get("proto") != "icmp" or flow.get("icmp", "echo") not in ("echo", 8, "8"):
            return reject("ping은 ICMP echo 흐름에만 적용할 수 있습니다")
        if not re.search(r"(?<![0-9.])" + re.escape(dst) + r"(?![0-9.])", ping_headers[0]) or dst not in ping_stats[0]:
            return reject("ping 머리글과 통계의 목적지가 사례와 다릅니다")
        summaries = [line for line in lines if re.search(r"(?:%\s*(?:packet loss|loss|손실))", line)]
        if len(summaries) != 1:
            return reject("ping 손실 통계 한 줄이 필요합니다")
        summary = summaries[0]
        linux = re.fullmatch(r"([0-9]+) packets transmitted, ([0-9]+) (?:packets )?received,(?: \+[0-9]+ errors,)? ([0-9]+(?:\.[0-9]+)?)% packet loss(?:,.*)?", summary)
        windows = re.fullmatch(r"(?:Packets: Sent|패킷: 보냄) = ([0-9]+), (?:Received|받음) = ([0-9]+), (?:Lost|손실) = ([0-9]+) \(([0-9]+)% (?:loss|손실)\),?", summary)
        if linux:
            sent, received = _number(linux[1]), _number(linux[2])
            percent = linux[3]
        elif windows:
            sent, received = _number(windows[1]), _number(windows[2])
            lost, percent = _number(windows[3]), windows[4]
            if sent is None or received is None or lost != sent - received:
                return reject("ping 패킷 수가 서로 맞지 않습니다")
        else:
            return reject("지원하는 Windows·Linux ping 통계 형식이 아닙니다")
        if len(percent) > 7 or not re.fullmatch(r"[0-9]{1,3}(?:\.[0-9]{1,3})?", percent):
            return reject("지원하지 않는 손실 숫자입니다")
        loss = float(percent)
        if sent is None or received is None or sent < 1 or not 0 <= received <= sent or not 0 <= loss <= 100:
            return reject("ping 통계 숫자가 범위를 벗어났습니다")
        if (loss == 0 and received != sent) or (loss == 100 and received != 0) or (0 < loss < 100 and not 0 < received < sent):
            return reject("ping 손실률과 받은 패킷 수가 맞지 않습니다")
        # Windows는 오류 응답도 Received에 셀 수 있다. 0%만으로 성공시키지 않는다.
        if loss == 0 and re.search(r"unreachable|general failure|timed out|TTL expired|도달할 수 없|일반 오류|요청 시간이 만료|기간이 만료|\+[0-9]+ errors", text, re.I):
            return reject("오류 응답과 손실 없는 통계가 섞여 있어 성공으로 볼 수 없습니다")
        tool = "ping"
        observed = "reply" if loss == 0 else "no_reply" if loss == 100 else "partial"
        evidence = [ping_stats[0], summary]
    value = "PASS" if observed in ("reply", "open") else None
    problems = [] if value else ["무응답·부분 손실·포트 상태만으로 통신 차단을 확정하지 않습니다. 기존 선택을 유지하고 직접 확인하세요."]
    evidence = [line[:120] for line in evidence[:2]]
    note = (f"{tool} 관측: {observed} · 목적지 {dst}\n" + "\n".join(evidence))[:1000]
    result.update(status="OK", problems=problems, tool=tool, observed=observed, result=value,
                  source=tool, note=note, evidence=evidence)
    return result
