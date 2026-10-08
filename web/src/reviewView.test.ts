import { describe, expect, it } from "vitest";
import { relatedLesson } from "./reviewView";
import type { CaseDetail, Hop, Result } from "./types";

const decisive: Hop = { device: "R1", step: "acl_in", result: "drop", detail: "saved evidence",
  in_if: "g0", out_if: null, rule: null, rule_seq: null };
const item: Pick<CaseDetail, "result" | "cause" | "verdict"> = { result: "DENY", cause: { tag: "acl_rule", direction: "forward" },
  verdict: { result: "DENY", reason: "saved reason", problems: [], forward: null, return: null, decisive } };

describe("저장된 원인으로 관련 개념 고르기", () => {
  it.each(["PASS", "UNSUPPORTED", "INVALID"] as Result[])("%s는 복귀 태그라도 연결하지 않는다", result => {
    expect(relatedLesson({ ...item, result, cause: { tag: "no_route", direction: "return" } })).toBeNull();
  });
  it.each(["acl_rule", "acl_implicit", "no_route", "other"])("복귀 방향은 %s보다 우선한다", tag => {
    expect(relatedLesson({ ...item, cause: { tag, direction: "return" }, verdict: { ...item.verdict, decisive: { ...decisive, step: "acl_out" } } })?.id).toBe("round-trip");
  });
  it.each(["acl_rule", "acl_implicit"])("%s는 저장된 in/out 단계로 주제를 구분한다", tag => {
    for (const [step, id] of [["acl_in", "https-acl"], ["acl_out", "output-acl"]] as const) {
      expect(relatedLesson({ ...item, cause: { tag, direction: "forward" }, verdict: { ...item.verdict, decisive: { ...decisive, step } } })?.id).toBe(id);
    }
  });
  it.each(["no_route", "no_gateway", "no_next_hop"])("%s는 왕복 경로로 연결한다", tag => {
    expect(relatedLesson({ ...item, cause: { tag, direction: "forward" } })?.id).toBe("round-trip");
  });
  it.each(["host_no_forward", "routing_loop", "other", "firewall_in"])("%s는 개념을 추측하지 않는다", tag => {
    expect(relatedLesson({ ...item, cause: { tag, direction: "forward" } })).toBeNull();
  });
  it("결정 단계가 없으면 원인·방향과 무관하게 연결하지 않는다", () => {
    for (const tag of ["acl_rule", "no_route", "other"]) {
      for (const direction of ["forward", "return"] as const) {
        expect(relatedLesson({ ...item, cause: { tag, direction }, verdict: { ...item.verdict, decisive: null } })).toBeNull();
      }
    }
  });
  it("ACL 태그라도 저장된 단계가 ACL 단계가 아니면 연결하지 않는다", () => {
    expect(relatedLesson({ ...item, verdict: { ...item.verdict, decisive: { ...decisive, step: "route" } } })).toBeNull();
  });
  it("저장된 입력과 판정은 변경하지 않는다", () => {
    const before = structuredClone(item);
    Object.freeze(item.cause); Object.freeze(item.verdict); Object.freeze(item);
    relatedLesson(item);
    expect(item).toEqual(before);
  });
});
