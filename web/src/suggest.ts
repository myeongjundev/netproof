import type { Suggestion, SuggestionEdit, SuggestionReason, Verdict } from "./types";

export const DISCLAIMER = "수정 후보는 판정이 아니며 정답이나 안전을 보장하지 않습니다. 이 흐름 하나만 다시 계산했고, 다른 통신에 미치는 영향은 계산하지 않았습니다.";
export const TRUNCATED = "가는 길 ACL 단계 중 앞의 8곳만 계산했습니다.";
export const REASONS: Record<SuggestionReason, string> = {
  not_decidable: "현재 입력은 판정할 수 없어 후보를 만들지 않았습니다.",
  not_acl_cause: "막힌 원인은 ACL이 아니어서 줄 삽입 후보를 만들지 않았습니다.",
  no_acl_on_path: "가는 길 경로에 ACL이 없어 삽입 후보를 만들지 않았습니다.",
  edit_limit: "최대 4줄 삽입으로 목표에 도달하지 못했습니다.",
  reverify_failed: "다시 판정해 목표 결과를 확인하지 못했습니다.",
  line_limit: "삽입하면 ACL 전체 500줄 한도를 넘습니다.",
};
export function suggestionStatus(result: Suggestion): string {
  switch (result.status) {
    case "OK": return "다시 판정으로 확인한 삽입 후보입니다.";
    case "ALREADY": return `현재 판정이 이미 목표 ${result.target === "PASS" ? "통과" : result.target === "DENY" ? "막힘" : "미선택"}입니다.`;
    case "INVALID": return `입력을 확인하세요: ${result.problems.join(" · ")}`;
    case "NO_CANDIDATE": return result.reason ? REASONS[result.reason] : "후보를 만들지 않았습니다.";
  }
}
export function editDescription(edit: SuggestionEdit): string {
  const anchor = edit.anchor_before === null ? "맨 끝" : `원래 ${edit.anchor_before}번 줄 앞`;
  return `${edit.acl} · ${anchor}에 넣기 → 새 ${edit.insert_at}번 줄 · ${edit.device} ${edit.interface} ${edit.direction} · ${edit.path === "forward" ? "가는 길" : "돌아오는 길"}`;
}
export function sharedDescription(edit: SuggestionEdit): string {
  return `${edit.acl} ACL은 ${edit.shared_by.length}곳에 붙어 있어 이 줄은 모든 곳에 적용됩니다: ${edit.shared_by.map((site) => `${site.device} ${site.interface} ${site.direction}`).join(", ")}`;
}
export function afterDescription(after: Omit<Verdict, "comparison">): string {
  const title = { PASS: "통과", DENY: "막힘", INVALID: "입력 오류", UNSUPPORTED: "판정 불가" }[after.result];
  return `다시 판정: ${title} — ${after.reason}`;
}
