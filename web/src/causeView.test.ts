import { describe, expect, it } from "vitest";
import { causeName, causeRatio, causeText } from "./causeView";

describe("서버가 준 원인 표시", () => {
  it.each([
    ["acl_rule", "ACL 규칙에서 차단"], ["acl_implicit", "ACL 암묵적 deny(일치 규칙 없음)"],
    ["no_route", "경로 없음"], ["no_gateway", "기본 게이트웨이 없음"],
    ["no_next_hop", "다음 홉 없음"], ["host_no_forward", "호스트가 전달하지 않음"],
    ["routing_loop", "라우팅 루프"], ["no_block", "막는 곳 없음(통과)"],
    ["other", "분류 못 함"], ["old_tag", "분류 못 함"], ["constructor", "분류 못 함"],
  ])("%s", (tag, label) => expect(causeName(tag)).toBe(label));
  it.each([[0, 0, "—"], [0, 3, "0%"], [1, 3, "33%"], [2, 3, "67%"], [3, 3, "100%"]] as const)(
    "비율 %s/%s", (count, total, text) => expect(causeRatio(count, total)).toBe(text));
  it("복귀와 정방향은 서버 값으로 표시한다", () => {
    expect(causeText({ tag: "no_route", direction: "return" })).toBe("경로 없음 · 복귀 방향");
    expect(causeText({ tag: "acl_rule", direction: "forward" })).toBe("ACL 규칙에서 차단 · 정방향");
  });
});
