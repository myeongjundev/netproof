import { blankDraft, toNetwork } from "./draft";
import type { Draft } from "./types";

const initialInput = JSON.stringify(blankDraft());

/** 표시 비교만 한다. 유효성·판정·저장 여부를 뜻하지 않는다. */
export function hasCurrentInput(draft: Draft): boolean {
  return JSON.stringify(draft) !== initialInput;
}

/** 입력 요약만 표시한다. 판정 결과·저장 여부를 만들지 않는다. */
export function draftSummary(draft: Draft): string {
  const { flow, claim } = draft;
  const network = toNetwork(draft);
  const port = flow.proto !== "icmp" && flow.dst_port !== undefined ? ` ${flow.dst_port}` : "";
  const who = claim.kind === "ai" ? "AI 답" : claim.kind === "self" ? "내 예상" : "받은 답";
  const answer = claim.expected ? `${who} ${claim.expected === "PASS" ? "통과" : "막힘"}` : "예상 없음";
  return `${flow.src.trim() || "출발지 미입력"} → ${flow.dst.trim() || "목적지 미입력"} · ${flow.proto.toUpperCase()}${port} · ${answer} · 장비 ${network.devices.length}대 · ACL ${Object.keys(network.acls).length}개`;
}
