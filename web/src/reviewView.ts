import { lessonById } from "./learning";
import type { CaseDetail } from "./types";

/** 저장된 원인 근거로 개념 링크만 고른다. 판정이나 비교를 다시 계산하지 않는다. */
export function relatedLesson(item: Pick<CaseDetail, "result" | "cause" | "verdict">) {
  if (item.result !== "DENY" || !item.verdict.decisive) return null;
  if (item.cause.direction === "return") return lessonById("round-trip")!;
  const step = item.verdict.decisive.step;
  if (item.cause.tag === "acl_rule" || item.cause.tag === "acl_implicit") {
    if (step === "acl_in") return lessonById("https-acl")!;
    if (step === "acl_out") return lessonById("output-acl")!;
  }
  if (["no_route", "no_gateway", "no_next_hop"].includes(item.cause.tag)) return lessonById("round-trip")!;
  return null;
}
