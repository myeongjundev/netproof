import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FlowForm } from "./FlowForm";
import { blankDraft } from "../draft";
import type { Claim } from "../types";

const fixture = vi.hoisted(() => ({ controller: false }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual,
    useId: () => fixture.controller ? "claim-test" : actual.useId(),
    useState: (initial: unknown) => fixture.controller ? [initial, () => {}] : actual.useState(initial),
  };
});
afterEach(() => { fixture.controller = false; });

function find(node: unknown, match: (el: ReactElement<Record<string, any>>) => boolean): ReactElement<Record<string, any>> | undefined {
  if (Array.isArray(node)) return node.map(child => find(child, match)).find(Boolean);
  if (!isValidElement<Record<string, any>>(node)) return;
  return match(node) ? node : find(node.props.children, match);
}
const draft = blankDraft();
const claim: Claim = { expected: "PASS", kind: "ai", source: "ChatGPT · 원문 출처", text: "원문 일치·불일치 PASS" };
const render = (value = claim, hideClaim = false) => renderToStaticMarkup(createElement(FlowForm, {
  flow: draft.flow, claim: value, endpoints: [], onFlow: () => {}, onClaim: () => {}, hideClaim,
}));

it("답 입력은 하나이며 종류는 details 밖, 선택 메모는 안에 있다", () => {
  const html = render();
  expect(html.match(/role="radiogroup"/g)).toHaveLength(1);
  expect(html.match(/name="expected"/g)).toHaveLength(3);
  expect(html).toContain("종류 미정"); expect(html).toContain("AI 답"); expect(html).toContain("내 예상");
  const details = html.slice(html.indexOf('<details class="q-source"'));
  expect(html.indexOf("답의 종류")).toBeLessThan(html.indexOf('<details class="q-source"'));
  expect(details).not.toContain("<select");
  expect(details).toContain("출처·내용 적기(선택)");
  expect(details).toContain("출처(선택)"); expect(details).toContain("답 내용(선택)");
  expect(details).not.toContain("누구의 답인가"); expect(details).not.toContain('open=""');
});
it.each([null, undefined] as const)("출처에 ChatGPT가 있어도 종류 %s를 추론하지 않는다", kind => {
  const html = render({ ...claim, kind });
  expect(html).toContain('<option value="" selected="">종류 미정</option>');
  expect(html).not.toContain('<option value="ai" selected="">');
});
it("실습의 hideClaim은 답·종류·메모 컨트롤을 모두 숨긴다", () => {
  const html = render(claim, true);
  expect(html).not.toMatch(/radiogroup|name="expected"|q-kind|q-source|답의 종류|출처\(선택\)/);
  expect(html).toContain("출발지 IP"); expect(html).toContain("목적지 IP");
});
it.each(["ai", "self", null, undefined] as const)("종류 %s 변경·비교 안 함 왕복에서 다른 입력을 유지한다", kind => {
  fixture.controller = true;
  let current: Claim = { ...claim, kind };
  const onFlow = vi.fn();
  const tree = () => FlowForm({ flow: draft.flow, claim: current, endpoints: [], onFlow, onClaim: next => { current = next; } });
  const kindSelect = () => find(tree(), el => el.type === "label" && el.props.className === "q-kind")!.props.children[1];
  kindSelect().props.onChange({ target: { value: "self" } });
  expect(current).toEqual({ ...claim, kind: "self" });
  // 실제 컴포넌트 핸들러를 호출한다. DOM 통합은 브라우저 QA로 확인한다.
  find(tree(), el => el.type === "input" && el.props.name === "expected" && !el.props.checked)!.props.onChange();
  expect(current).toEqual({ ...claim, expected: null, kind: "self" });
  expect(find(tree(), el => el.props.className === "q-kind")).toBeUndefined();
  const radios = find(tree(), el => el.props.role === "radiogroup")!.props.children;
  radios[2].props.children[0].props.onChange();
  expect(current).toEqual({ ...claim, expected: "DENY", kind: "self" });
  kindSelect().props.onChange({ target: { value: "" } });
  expect(current).toEqual({ ...claim, expected: "DENY", kind: null });
  expect(onFlow).not.toHaveBeenCalled(); expect(draft.flow).toEqual(blankDraft().flow);
});
it("출처·내용 필드는 각각 자기 값만 바꾸고 종류를 추론하지 않는다", () => {
  fixture.controller = true;
  let current: Claim = { ...claim, kind: null };
  const tree = () => FlowForm({ flow: draft.flow, claim: current, endpoints: [], onFlow: () => {}, onClaim: next => { current = next; } });
  find(tree(), el => el.type === "input" && el.props.placeholder)!.props.onChange({ target: { value: "내 예상" } });
  expect(current).toEqual({ ...claim, kind: null, source: "내 예상" });
  find(tree(), el => el.type === "textarea")!.props.onChange({ target: { value: "내용만 수정" } });
  expect(current).toEqual({ ...claim, kind: null, source: "내 예상", text: "내용만 수정" });
});
