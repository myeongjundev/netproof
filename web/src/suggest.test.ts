import { describe, expect, it } from "vitest";
import type { Suggestion, SuggestionEdit, Verdict } from "./types";
import { afterDescription, DISCLAIMER, editDescription, REASONS, sharedDescription, suggestionStatus, TRUNCATED } from "./suggest";

const response: Suggestion = { status: "OK", target: "PASS", reason: null, problems: [], engine_version: "0.1.4", truncated: false, before: null, candidates: [] };
const edit: SuggestionEdit = { acl: "101", anchor_before: 3, insert_at: 4, raw: "permit ip any any", action: "permit", device: "R1", interface: "g0/0", direction: "in", path: "forward", shared_by: [{ device: "R1", interface: "g0/0", direction: "in" }] };
describe("suggestion display (no decision or application)", () => {
  it("disclaims correctness, safety and other-flow coverage", () => {
    expect(DISCLAIMER).toBe("수정 후보는 판정이 아니며 정답이나 안전을 보장하지 않습니다. 이 흐름 하나만 다시 계산했고, 다른 통신에 미치는 영향은 계산하지 않았습니다.");
    expect(TRUNCATED).toBe("가는 길 ACL 단계 중 앞의 8곳만 계산했습니다.");
  });
  it.each(["OK", "ALREADY", "NO_CANDIDATE", "INVALID"] as const)("renders %s", (status) => {
    expect(suggestionStatus({ ...response, status, problems: ["bad"] })).toBeTruthy();
  });
  it.each(Object.keys(REASONS) as (keyof typeof REASONS)[])("renders reason %s", (reason) => {
    expect(suggestionStatus({ ...response, status: "NO_CANDIDATE", reason })).toBe(REASONS[reason]);
  });
  it("distinguishes original anchors from final positions", () => {
    expect(editDescription(edit)).toBe("101 · 원래 3번 줄 앞에 넣기 → 새 4번 줄 · R1 g0/0 in · 가는 길");
    expect(editDescription({ ...edit, anchor_before: null, direction: "out", path: "return" })).toBe("101 · 맨 끝에 넣기 → 새 4번 줄 · R1 g0/0 out · 돌아오는 길");
  });
  it("states all attachment sites, even a single site", () => {
    expect(sharedDescription(edit)).toBe("101 ACL은 1곳에 붙어 있어 이 줄은 모든 곳에 적용됩니다: R1 g0/0 in");
    expect(sharedDescription({ ...edit, acl: "abc" })).toMatch(/^abc ACL은 /);
    expect(sharedDescription(edit)).not.toContain("은(는)");
    expect(sharedDescription(edit)).toContain("1곳에 붙어");
    expect(sharedDescription({ ...edit, shared_by: [...edit.shared_by, { device: "R2", interface: "e", direction: "out" }] })).toContain("2곳에 붙어 있어 이 줄은 모든 곳에 적용됩니다: R1 g0/0 in, R2 e out");
  });
  it("renders engine after verbatim without recalculation", () => {
    expect(afterDescription({ result: "PASS", reason: "delivered" } as Verdict)).toBe("다시 판정: 통과 — delivered");
    expect(afterDescription({ result: "DENY", reason: "정방향 엔진 원문" } as Verdict)).toBe("다시 판정: 막힘 — 정방향 엔진 원문");
    expect(suggestionStatus({ ...response, status: "ALREADY" })).toContain("이미 목표 통과");
    expect(suggestionStatus({ ...response, status: "ALREADY", target: "DENY" })).toContain("이미 목표 막힘");
    expect(suggestionStatus({ ...response, status: "INVALID", problems: ["a", "b"] })).toContain("a · b");
  });
});
