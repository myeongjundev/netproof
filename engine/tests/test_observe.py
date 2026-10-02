import pytest
from hypothesis import given, strategies as st

from netproof_engine import observe

DST = "192.0.2.5"
ICMP = {"src": "192.0.2.1", "dst": DST, "proto": "icmp"}
TCP = {**ICMP, "proto": "tcp", "dst_port": 443}
KEYS = {"status", "problems", "tool", "observed", "result", "source", "note", "target", "evidence"}


def ping(received=4, loss=0, locale="linux"):
    if locale == "windows":
        return f"Pinging {DST} with 32 bytes of data:\nPing statistics for {DST}:\nPackets: Sent = 4, Received = {received}, Lost = {4-received} ({loss}% loss),"
    if locale == "korean":
        return f"Ping {DST} 32바이트 데이터 사용:\n{DST}에 대한 Ping 통계:\n패킷: 보냄 = 4, 받음 = {received}, 손실 = {4-received} ({loss}% 손실),"
    return f"PING {DST} ({DST}) 56(84) bytes of data.\n--- {DST} ping statistics ---\n4 packets transmitted, {received} received, {loss}% packet loss, time 3003ms"


def nmap(state="open", port="443", proto="tcp"):
    return f"Nmap scan report for {DST}\nHost is up (0.001s latency).\nPORT STATE SERVICE\n{port}/{proto} {state} https\nNmap done: 1 IP address (1 host up) scanned in 0.1 seconds"


@pytest.mark.parametrize("locale", ["linux", "windows", "korean"])
@pytest.mark.parametrize("received,loss,observed,result", [(4, 0, "reply", "PASS"), (0, 100, "no_reply", None), (3, 25, "partial", None)])
def test_ping_mapping(locale, received, loss, observed, result):
    actual = observe(ping(received, loss, locale), ICMP)
    assert (actual["status"], actual["observed"], actual["result"], actual["source"]) == ("OK", observed, result, "ping")
    assert set(actual) == KEYS


@pytest.mark.parametrize("proto,port", [("tcp", "443"), ("udp", "53")])
@pytest.mark.parametrize("state,observed,result", [("open", "open", "PASS"), ("closed", "closed", None), ("filtered", "filtered", None), ("open|filtered", "filtered", None)])
def test_nmap_mapping(proto, port, state, observed, result):
    actual = observe(nmap(state, port, proto), {**TCP, "proto": proto, "dst_port": int(port)})
    assert (actual["status"], actual["observed"], actual["result"]) == ("OK", observed, result)


def test_nmap_hostname_with_ipv4_and_numeric_string_port():
    text = nmap().replace(f"for {DST}", f"for practice.local ({DST})")
    assert observe(text, {**TCP, "dst_port": "443"})["result"] == "PASS"


@pytest.mark.parametrize("text,flow", [
    (nmap(), {**TCP, "dst": "192.0.2.6"}),
    (nmap(), ICMP), (ping(), TCP), (ping(), {**ICMP, "icmp": "echo-reply"}),
    (nmap(), {**TCP, "dst_port": 80}), (nmap(), {**TCP, "dst_port": True}),
    (nmap() + "\n80/tcp open http", TCP), (nmap() + "\nNmap scan report for 192.0.2.5", TCP),
    (nmap() + "\n80/sctp open service", TCP),
    (nmap() + "\n4 packets transmitted, 4 received, 0% packet loss", TCP),
    (ping() + "\n443/tcp open https", ICMP),
    (ping() + "\n--- 192.0.2.5 ping statistics ---", ICMP),
    (ping() + "\n" + nmap(), TCP), (nmap().split("\n")[0], TCP),
    (ping().split("\n")[0], ICMP), (ping() + "\nFrom 192.0.2.254: Host unreachable", ICMP),
    (nmap().replace(DST, "practice.local"), TCP),
    ("", ICMP), (None, ICMP), (False, ICMP), ("x" * 4001, ICMP), ("\n" * 81, ICMP),
    (ping(), None), (ping(), "flow"), (ping(), {}), (ping(), {"dst": 1}),
    (ping().replace("0%", "²%"), ICMP), (nmap(port="４４３"), TCP),
    (nmap(port="1" * 500), TCP), (ping().replace("4 packets", "9" * 500 + " packets"), ICMP),
    (ping() + "\x00", ICMP), (ping().replace("0%", "101%"), ICMP),
    (ping(3, 0), ICMP), (ping(4, 100), ICMP),
    (ping(4, 0, "windows") + "\nReply from 192.0.2.5: Destination host unreachable.", ICMP),
    (ping(4, 0, "korean") + "\n192.0.2.5의 응답: 대상 호스트에 도달할 수 없습니다.", ICMP),
])
def test_reject_mismatch_incomplete_ambiguous_or_invalid(text, flow):
    actual = observe(text, flow)
    assert actual["status"] == "REJECTED" and actual["result"] is None
    assert actual["problems"] and actual["note"] == "" and not actual["evidence"]


def test_evidence_bounded_and_raw_output_not_returned():
    text = nmap().replace("https", "service" + "x" * 500) + "\nRAW_PRIVATE_MARKER"
    actual = observe(text, TCP)
    assert actual["status"] == "OK" and len(actual["evidence"]) == 2
    assert all(len(line) <= 120 for line in actual["evidence"])
    assert len(actual["note"]) <= 1000 and "RAW_PRIVATE_MARKER" not in str(actual)
    assert observe(text, TCP) == actual


@given(st.text(max_size=4200), st.one_of(st.none(), st.text(), st.dictionaries(st.text(max_size=10), st.one_of(st.none(), st.integers(), st.text(max_size=20)))))
def test_arbitrary_inputs_do_not_raise(text, flow):
    actual = observe(text, flow)
    assert set(actual) == KEYS and actual["result"] in (None, "PASS")


def test_full_timeout_remains_unknown_and_echo_explicit_supported():
    text = ping(0, 100, "windows") + "\nRequest timed out."
    assert observe(text, {**ICMP, "icmp": 8})["observed"] == "no_reply"


def test_korean_alternative_statistics_label():
    text = ping(locale="korean").replace("에 대한 Ping 통계", "의 통계")
    assert observe(text, ICMP)["result"] == "PASS"


@pytest.mark.parametrize("separator", ["\x85", "\u2028", "\u2029", "\u200b", "\x7f", "\ud800"])
def test_invisible_separators_cannot_hide_extra_ports(separator):
    text = nmap() + f"\n80/{separator}tcp filtered http"
    assert observe(text, TCP)["status"] == "REJECTED"


@pytest.mark.parametrize("line", [
    f"Reply from {DST}: Packet filtered.",
    f"{DST}의 응답: 대상 호스트에 연결할 수 없습니다.",
    f"{DST}의 응답: 전송 중 TTL이 만료되었습니다.",
    f"Reply from {DST}: Unknown error.",
])
def test_windows_error_responses_never_become_pass(line):
    assert observe(ping(locale="windows") + "\n" + line, ICMP)["status"] == "REJECTED"


def test_windows_normal_echo_response_supported():
    text = ping(locale="windows") + f"\nReply from {DST}: bytes=32 time<1ms TTL=128"
    assert observe(text, ICMP)["result"] == "PASS"


@pytest.mark.parametrize("timeout", ["Request timed out.", "요청 시간이 만료되었습니다."])
def test_nmap_with_identifiable_ping_timeout_rejected(timeout):
    assert observe(nmap() + "\n" + timeout, TCP)["status"] == "REJECTED"


def test_rejected_without_target_header_has_null_target_and_specific_problem():
    actual = observe("443/tcp open https", TCP)
    assert actual["target"] is None and "IPv4" in actual["problems"][0]
    actual = observe("443/tcp open service-for-192.0.2.5", TCP)
    assert actual["target"] is None


def test_limits_are_not_truncated_and_boundary_is_accepted():
    base = nmap()
    assert observe(base + "\nx" + "x" * (3998 - len(base)), TCP)["status"] == "OK"
    assert observe(base + "\nx" + "x" * (3999 - len(base)), TCP)["status"] == "REJECTED"
