import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { blankDraft, toNetwork } from "../draft";
import type { Hop, Verdict } from "../types";
import { AclEvidence, aclEvidence, aclSelection } from "./AclEvidence";
import { ResultPanel } from "./ResultPanel";

const hop: Hop = { device: "R1", step: "acl_in", result: "drop", detail: "", in_if: "g0/0", out_if: null,
  rule: "deny tcp any any eq 443", rule_seq: 20, acl: "101", rule_line: 2 };
const acls = { "101": ["remark 설명", "20 deny tcp any any eq 443", "30 permit ip any any"] };
function verdict(h: Hop = hop): Verdict {
  return { result: "DENY", reason: "", problems: [], decisive: h, comparison: "NO_CLAIM",
    forward: { delivered: false, reason: "", hops: [h] }, return: null };
}

it("가운데 차단 줄 앞은 불일치, 뒤는 도달 안 함이며 순번과 줄 위치를 혼동하지 않는다", () => {
  const [block] = aclEvidence(verdict(), acls);
  expect(block.title).toBe("가는 길 · R1 g0/0 들어올 때 · ACL 101");
  expect(block.lines.map((l) => [l.number, l.state])).toEqual([[1, "불일치"], [2, "걸림-차단"], [3, "도달 안 함"]]);
});

it("두 번째 줄 허용도 엔진 결과만 사용한다", () => {
  const [block] = aclEvidence(verdict({ ...hop, result: "ok" }), acls);
  expect(block.lines.map((l) => l.state)).toEqual(["불일치", "걸림-허용", "도달 안 함"]);
});

it("암묵적 deny는 모든 줄 불일치와 별도 끝줄을 표시한다", () => {
  const result = verdict({ ...hop, rule_line: null, rule_seq: null, rule: null });
  const [block] = aclEvidence(result, acls);
  expect(block.implicitDeny).toBe(true);
  expect(block.lines.every((l) => l.state === "불일치")).toBe(true);
  const html = renderToStaticMarkup(createElement(AclEvidence, { verdict: result, acls, stale: false }));
  expect(html).toContain('class="acl-hit-deny">암묵적 deny — 모든 줄이 맞지 않음');
  expect(aclEvidence(result, { "101": [] })[0].implicitDeny).toBe(true);
});

it("같은 ACL도 정방향과 복귀 순서대로 블록을 따로 만든다", () => {
  const result = verdict({ ...hop, result: "ok" });
  result.return = { delivered: false, reason: "", hops: [{ ...hop, step: "acl_out", in_if: null, out_if: "g0/1" }] };
  const blocks = aclEvidence(result, acls);
  expect(blocks).toHaveLength(2);
  expect(blocks[1].title).toBe("돌아오는 길 · R1 g0/1 나갈 때 · ACL 101");
});

it("옛 Hop이나 없는 ACL·잘못된 줄 위치로는 근거를 만들지 않는다", () => {
  for (const patch of [{ acl: undefined }, { rule_line: undefined }, { acl: null }, { acl: "missing" }, { rule_line: 0 }, { rule_line: 99 }, { step: "route" as const }]) {
    expect(aclEvidence(verdict({ ...hop, ...patch }), acls)).toEqual([]);
  }
});

it("빈 줄과 remark를 포함한 입력에서 보낸 줄의 문자 범위를 찾는다", () => {
  const text = "\n  remark 한글 🧪\n  \n  10 deny tcp any any eq 443  \n\npermit ip any any\n";
  const draft = blankDraft();
  draft.acls = [{ name: "101", text }];
  const sent = toNetwork(draft).acls["101"];
  sent.forEach((line, index) => {
    const range = aclSelection(text, index + 1)!;
    expect(text.slice(range.start, range.end).trim()).toBe(line);
  });
  expect(aclSelection(text, null)).toEqual({ start: 0, end: text.length });
  expect(aclSelection(text, 4)).toBeNull();
  expect(aclSelection(text, 0)).toBeNull();
  expect(aclSelection("", null)).toEqual({ start: 0, end: 0 });
});

it("판정 때 저장한 ACL로 stale 근거를 표시하고 입력 이동은 비활성화한다", () => {
  const draft = blankDraft();
  draft.acls = [{ name: "101", text: acls["101"].join("\n") }];
  const network = structuredClone(toNetwork(draft));
  draft.acls[0].text = "새 입력";
  const html = renderToStaticMarkup(createElement(ResultPanel, {
    verdict: verdict(), claim: draft.claim, stale: true, network, error: null, loading: false, onShowAcl: () => {},
  }));
  expect(html).toContain("20 deny tcp any any eq 443");
  expect(html).not.toContain("새 입력");
  expect(html).toContain('disabled="">입력에서 보기');
});

it("사례 상세에는 입력 이동 단추가 없고 규칙은 HTML이 아닌 텍스트로 표시한다", () => {
  const html = renderToStaticMarkup(createElement(AclEvidence, {
    verdict: verdict(), acls: { "101": ["<script>alert(1)</script>", "deny ip any any"] }, stale: false,
  }));
  expect(html).not.toContain("입력에서 보기");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("걸림-차단");
  expect(html).not.toContain("<script>");
});
