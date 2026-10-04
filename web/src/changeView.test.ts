import { advanceChange, type ChangeHistory, type Judgment } from "./changeView";
import { blankDraft, toNetwork } from "./draft";
import type { Verdict } from "./types";

const draft = blankDraft();
const verdict: Verdict = { result: "DENY", reason: "engine", problems: [], decisive: null, forward: null, return: null, comparison: "AGREE" };
const first: Judgment = { network: toNetwork(draft), flow: draft.flow, verdict };
const empty: ChangeHistory = { last: null, before: null };

it("같은 통신·다른 구성은 직전 판정, 세 번째는 두 번째를 기준으로 한다", () => {
  const second = { ...first, network: { ...first.network, acls: { A: ["permit ip any any"] } } };
  const h = advanceChange(advanceChange(empty, first), second);
  expect(h.before).toBe(first);
  const third = { ...second, network: { ...second.network, acls: {} } };
  expect(advanceChange(h, third).before).toBe(second);
});
it("같은 구성·통신은 받은 답/결과/이유가 달라도 기존 기준을 유지한다", () => {
  const h = { last: first, before: { ...first, network: { ...first.network, acls: { A: [] } } } };
  expect(advanceChange(h, { ...first, verdict: { ...verdict, result: "PASS", comparison: "DISAGREE", reason: "different" } }).before).toBe(h.before);
  expect(advanceChange({ last: first, before: null }, first).before).toBeNull();
});
it.each(["src", "dst", "proto", "dst_port", "icmp", "mode"] as const)("통신의 %s가 바뀌면 기준이 없다", field => {
  const values = { src: "1.1.1.1", dst: "2.2.2.2", proto: "udp", dst_port: 80, icmp: "0", mode: "one-way" };
  const next = { ...first, flow: { ...first.flow, [field]: values[field] } } as Judgment;
  expect(advanceChange({ last: first, before: first }, next).before).toBeNull();
});
it("통신 필드 비교는 JSON 키 순서에 의존하지 않고 기본 session을 정규화한다", () => {
  const { src, dst, proto, dst_port } = first.flow;
  expect(advanceChange({ last: first, before: first }, { ...first, flow: { mode: "session", dst_port, proto, dst, src } }).before).toBe(first);
});
it("불러오기는 기억과 변경 전을 함께 지운다", () => {
  expect(advanceChange({ last: first, before: first }, null)).toEqual(empty);
});
