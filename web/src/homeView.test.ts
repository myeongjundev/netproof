import { blankDraft } from "./draft";
import { hasCurrentInput, draftSummary } from "./homeView";

it("초기 템플릿과 같은 입력에는 돌아가기 안내가 없다", () => {
  expect(hasCurrentInput(blankDraft())).toBe(false);
  expect(hasCurrentInput(structuredClone(blankDraft()))).toBe(false);
});

it.each(["tcp", "udp"] as const)("%s 요약은 통신·받은 답·toNetwork 개수만 보인다", proto => {
  const draft = blankDraft(); draft.flow.proto = proto;
  draft.claim = { expected: "PASS", kind: "self", source: "", text: "" };
  draft.acls = [{ name: "101", text: "permit ip any any" }, { name: " 101 ", text: "" }, { name: " ", text: "" }];
  const before = JSON.stringify(draft);
  expect(draftSummary(draft)).toBe(`10.10.10.10 → 10.20.20.5 · ${proto.toUpperCase()} 443 · 내 예상 통과 · 장비 3대 · ACL 1개`);
  expect(JSON.stringify(draft)).toBe(before);
});
it("ICMP는 잔존 포트를 요약에 보이지 않고 빈 주소와 예상 없음을 표시한다", () => {
  const draft = blankDraft(); draft.flow.proto = "icmp"; draft.flow.src = " "; draft.flow.dst = "";
  expect(draftSummary(draft)).toBe("출발지 미입력 → 목적지 미입력 · ICMP · 예상 없음 · 장비 3대 · ACL 0개");
});
it.each([
  ["ai", "PASS", "AI 답 통과"], ["self", "DENY", "내 예상 막힘"],
  [null, "DENY", "받은 답 막힘"], [undefined, "PASS", "받은 답 통과"],
] as const)("%s/%s는 %s로 표시한다", (kind, expected, label) => {
  const draft = blankDraft(); draft.claim = { kind, expected, source: "do not show", text: "do not show" };
  const summary = draftSummary(draft);
  expect(summary).toContain(label);
  expect(summary).not.toContain("do not show");
});

it.each(["flow", "acl", "claim", "device"])("%s 편집은 안내하되 원래 입력을 고치지 않는다", (kind) => {
  const draft = blankDraft();
  if (kind === "flow") draft.flow.src = "10.10.10.11";
  if (kind === "acl") draft.acls.push({ name: "101", text: "permit ip any any" });
  if (kind === "claim") draft.claim.text = "검토 중인 예상";
  if (kind === "device") draft.devices[0].id = "편집 중";
  const before = JSON.stringify(draft);
  expect(hasCurrentInput(draft)).toBe(true);
  expect(JSON.stringify(draft)).toBe(before);
  expect(hasCurrentInput(blankDraft())).toBe(false);
});
