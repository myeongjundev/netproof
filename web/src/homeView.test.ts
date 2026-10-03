import { blankDraft } from "./draft";
import { hasCurrentInput } from "./homeView";

it("초기 템플릿과 같은 입력에는 돌아가기 안내가 없다", () => {
  expect(hasCurrentInput(blankDraft())).toBe(false);
  expect(hasCurrentInput(structuredClone(blankDraft()))).toBe(false);
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
