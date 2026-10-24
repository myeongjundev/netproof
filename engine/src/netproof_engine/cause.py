"""저장된 판정의 근거를 분류한다. 판정을 다시 계산하지 않는다."""

CAUSE_TAGS = ("acl_rule", "acl_implicit", "firewall_rule", "firewall_default", "no_route", "no_gateway", "no_next_hop",
              "host_no_forward", "routing_loop", "no_block", "other")
# 결정적 단계 → (규칙에 걸림, 일치 규칙 없음). 방화벽의 "일치 규칙 없음"은 사용자가 적은 기본 차단(default_in: block)이다.
_RULE_STEPS = {"acl_in": ("acl_rule", "acl_implicit"), "acl_out": ("acl_rule", "acl_implicit"),
               "firewall_in": ("firewall_rule", "firewall_default")}
_REASONS = {
    "경로 없음": "no_route",
    "기본 게이트웨이 없음": "no_gateway",
    "다음 홉 없음": "no_next_hop",
    "호스트가 전달하지 않음": "host_no_forward",
    "라우팅 루프": "routing_loop",
}


def cause(verdict) -> dict[str, str]:
    """알 수 없는 JSON 형태는 추측하지 않고 other로 둔다."""
    if not isinstance(verdict, dict):
        return {"tag": "other", "direction": "forward"}
    backward = verdict.get("return")
    direction = "return" if isinstance(backward, dict) and backward.get("delivered") is False else "forward"
    tag = "other"
    if verdict.get("result") == "PASS":
        tag = "no_block"
    elif verdict.get("result") == "DENY":
        decisive = verdict.get("decisive")
        step = decisive.get("step") if isinstance(decisive, dict) else None
        if isinstance(step, str) and step in _RULE_STEPS:
            matched, unmatched = _RULE_STEPS[step]
            seq = decisive.get("rule_seq")
            if seq is None:
                tag = unmatched
            elif type(seq) is int and seq > 0:
                tag = matched
        else:
            blocked = verdict.get(direction)
            reason = blocked.get("reason") if isinstance(blocked, dict) else None
            if isinstance(reason, str):
                tag = _REASONS.get(reason, "other")
    return {"tag": tag, "direction": direction}
