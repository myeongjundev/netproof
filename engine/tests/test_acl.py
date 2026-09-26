import ipaddress

import pytest

from netproof_engine.acl import Packet, PortMatch, parse_acl, parse_rule, wildcard_network
from netproof_engine.errors import Unsupported

A = ipaddress.IPv4Address
N = ipaddress.IPv4Network


def tcp(src, dst, dport, sport=50000, ack=False):
    return Packet(A(src), A(dst), "tcp", sport=sport, dport=dport, ack=ack)


class TestWildcard:
    def test_class_c(self):
        assert wildcard_network("10.10.10.0", "0.0.0.255") == N("10.10.10.0/24")

    def test_zero_wildcard_means_one_host_not_everything(self):
        # ipaddress는 0.0.0.0을 넷마스크(/0)로 읽는다. 와일드카드에서는 호스트 하나다.
        assert wildcard_network("10.10.10.7", "0.0.0.0") == N("10.10.10.7/32")

    def test_all_ones_wildcard_means_any(self):
        assert wildcard_network("0.0.0.0", "255.255.255.255") == N("0.0.0.0/0")

    def test_host_bits_in_address_are_ignored(self):
        assert wildcard_network("10.10.10.7", "0.0.0.255") == N("10.10.10.0/24")

    def test_noncontiguous_wildcard_is_unsupported(self):
        with pytest.raises(Unsupported):
            wildcard_network("10.0.0.0", "0.0.255.0")


class TestParse:
    def test_access_list_prefix_and_wildcards(self):
        rule = parse_rule("access-list 101 deny tcp 10.10.10.0 0.0.0.255 10.20.20.0 0.0.0.255 eq 443", 1)
        assert (rule.action, rule.proto, rule.src, rule.dst) == ("deny", "tcp", N("10.10.10.0/24"), N("10.20.20.0/24"))
        assert rule.dst_port == PortMatch("eq", 443)

    def test_sequence_number_from_named_acl(self):
        assert parse_rule("20 permit ip any any", 1).seq == 20

    def test_cidr_is_accepted_as_convenience(self):
        assert parse_rule("deny tcp 10.10.10.0/24 10.20.20.0/24 eq 443", 1).src == N("10.10.10.0/24")

    def test_remark_is_skipped(self):
        assert parse_rule("remark 웹 차단", 1) is None

    def test_log_is_ignored(self):
        assert parse_rule("deny ip any any log", 1).action == "deny"

    def test_port_names_and_range(self):
        assert parse_rule("permit tcp any any eq www", 1).dst_port == PortMatch("eq", 80)
        assert parse_rule("permit udp any range 1000 2000 any", 1).src_port == PortMatch("range", 1000, 2000)

    def test_icmp_type(self):
        assert parse_rule("permit icmp any any echo-reply", 1).icmp_type == 0

    @pytest.mark.parametrize(
        "line",
        [
            "permit gre any any",
            "permit tcp any any eq 80 443",
            "permit icmp any any eq 80",
            "permit tcp any any eq https",
            "permit tcp any any range 90 80",
            "permit ip object-group WEB any",
            "permit tcp any any fragments",
            "permit udp any any established",
            "allow ip any any",
            "permit tcp 10.0.0.0 any",
        ],
    )
    def test_unknown_syntax_is_unsupported_not_guessed(self, line):
        with pytest.raises(Unsupported):
            parse_rule(line, 1)


class TestEvaluate:
    def test_first_match_wins(self):
        acl = parse_acl("101", ["deny tcp any any eq 443", "permit ip any any"])
        action, rule = acl.evaluate(tcp("10.10.10.10", "10.20.20.5", 443))
        assert (action, rule.seq) == ("deny", 1)
        assert acl.evaluate(tcp("10.10.10.10", "10.20.20.5", 80))[0] == "permit"

    def test_implicit_deny_has_no_rule(self):
        acl = parse_acl("101", ["permit udp any any"])
        assert acl.evaluate(tcp("10.10.10.10", "10.20.20.5", 80)) == ("deny", None)

    def test_established_skips_first_syn(self):
        acl = parse_acl("102", ["permit tcp any any established"])
        assert acl.evaluate(tcp("10.20.20.5", "10.10.10.10", 50000, sport=443, ack=True))[0] == "permit"
        assert acl.evaluate(tcp("10.10.10.10", "10.20.20.5", 443))[0] == "deny"

    def test_unread_line_before_decision_stops(self):
        acl = parse_acl("103", ["permit gre any any", "permit ip any any"])
        with pytest.raises(Unsupported):
            acl.evaluate(tcp("10.10.10.10", "10.20.20.5", 80))

    def test_unread_line_after_decision_does_not_matter(self):
        acl = parse_acl("104", ["permit ip any any", "permit gre any any"])
        assert acl.evaluate(tcp("10.10.10.10", "10.20.20.5", 80))[0] == "permit"
