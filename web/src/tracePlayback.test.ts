import data from "./testFixtures/topology-verdicts.json";
import type { Verdict } from "./types";
import { decisivePosition, observePlayback, stepText, TracePlayback } from "./tracePlayback";

const fixtures = data as unknown as { id: string; verdict: Verdict }[];
const both = fixtures[4].verdict;
afterEach(() => vi.useRealTimers());

it.each(fixtures)("$id: 결정 근거 방향의 마지막 단계로 시작하고 원래 순서를 유지한다", ({ id, verdict }) => {
  const copy = structuredClone(verdict), player = new TracePlayback(verdict);
  const direction = id === "synthetic-02-missing-return-route" ? "return" : "forward";
  const index = Math.max(0, (verdict[direction]?.hops.length ?? 0) - 1);
  expect(player.getSnapshot()).toMatchObject({ direction, index, selectedDevice: verdict[direction]?.hops[index]?.device ?? null, playing: false });
  expect(player.trace()).toBe(verdict[direction]);
  player.select(0); player.direction("return"); player.select(0);
  expect(verdict).toEqual(copy);
  player.dispose();
});
it("복귀 decisive가 마지막 앞에 있어도 마지막 단계와 그 장비에서 멈춰 시작한다", () => {
  const base = fixtures[1].verdict, last = { ...base.return!.hops.at(-1)!, device: "last device", result: "ok" as const };
  const verdict = { ...base, return: { ...base.return!, hops: [...base.return!.hops, last] } };
  const player = new TracePlayback(verdict);
  expect(player.getSnapshot()).toMatchObject({ direction: "return", index: 2, selectedDevice: "last device", playing: false });
  expect(player.trace()).toBe(verdict.return); player.dispose();
});
it.each(["none", "unmatched", "ambiguous"])("복귀 응답이 있어도 decisive가 %s이면 정방향 마지막에서 시작한다", variant => {
  const base = fixtures[1].verdict;
  const verdict = variant === "none" ? { ...base, decisive: null }
    : variant === "unmatched" ? { ...base, decisive: { ...base.decisive!, detail: "unmatched" } }
    : { ...base, forward: { ...base.forward!, hops: [...base.forward!.hops, base.decisive!] } };
  const player = new TracePlayback(verdict);
  expect(player.getSnapshot()).toMatchObject({ direction: "forward", index: verdict.forward!.hops.length - 1, selectedDevice: verdict.forward!.hops.at(-1)!.device, playing: false });
  player.dispose();
});
it("복귀로 시작해도 방향 변경·재생·편집 정지의 기존 규칙을 유지한다", () => {
  vi.useFakeTimers(); const player = new TracePlayback(fixtures[1].verdict);
  player.play(); expect(player.getSnapshot()).toMatchObject({ direction: "return", index: 0, playing: true });
  vi.advanceTimersByTime(1000); expect(player.getSnapshot()).toMatchObject({ direction: "return", index: 1, playing: false });
  player.direction("forward"); expect(player.getSnapshot().index).toBe(fixtures[1].verdict.forward!.hops.length - 1);
  player.play(); player.setBusy(true); expect(player.getSnapshot().playing).toBe(false); expect(vi.getTimerCount()).toBe(0);
  player.setBusy(false); expect(player.getSnapshot().playing).toBe(false); player.dispose();
});
it("첫 단계 재생·일시정지·다음부터 이어가기·마지막 정지·다시 재생", () => {
  vi.useFakeTimers(); const player = new TracePlayback(both);
  player.play(); expect(player.getSnapshot().index).toBe(0);
  vi.advanceTimersByTime(1000); expect(player.getSnapshot().index).toBe(1);
  player.pause(); vi.advanceTimersByTime(10000); expect(player.getSnapshot().index).toBe(1);
  player.play(); vi.advanceTimersByTime(1000); expect(player.getSnapshot().index).toBe(2);
  vi.advanceTimersByTime(1000); expect(player.getSnapshot()).toMatchObject({ index: 3, playing: false });
  expect(vi.getTimerCount()).toBe(0);
  player.play(); expect(player.getSnapshot().index).toBe(0); player.dispose();
});
it("방향 변경·장비 선택·수동 이동은 정지하며 장비 선택은 커서를 바꾸지 않는다", () => {
  vi.useFakeTimers(); const player = new TracePlayback(both);
  player.play(); vi.advanceTimersByTime(1000); player.selectDevice("SRV");
  expect(player.getSnapshot()).toMatchObject({ index: 1, selectedDevice: "SRV", playing: false });
  player.select(2); expect(player.getSnapshot().selectedDevice).toBe(both.forward!.hops[2].device);
  player.play(); player.direction("return");
  expect(player.getSnapshot()).toMatchObject({ direction: "return", index: 3, playing: false });
  expect(player.trace()).toBe(both.return); expect(vi.getTimerCount()).toBe(0); player.dispose();
});
it("범위를 벗어난 수동 이동과 반복 장비·루프 drop도 원래 배열 인덱스다", () => {
  const hop = both.forward!.hops[0];
  const trace = { ...both.forward!, hops: [hop, { ...hop, step: "route" as const }, { ...hop, device: "R1" }, { ...hop, result: "drop" as const }] };
  const player = new TracePlayback({ ...both, forward: trace });
  player.select(-5); expect(player.getSnapshot().index).toBe(0);
  player.select(500); expect(player.getSnapshot().index).toBe(3);
  expect(player.trace()!.hops.map(h => h.device)).toEqual([hop.device, hop.device, "R1", hop.device]);
});
it.each(["busy", "hidden", "reduced", "dispose"] as const)("%s에서 타이머를 해제하고 해제 뒤 자동 재개하지 않는다", reason => {
  vi.useFakeTimers(); const player = new TracePlayback(both); player.play();
  if (reason === "busy") { player.setBusy(true); player.play(); player.select(2); expect(player.getSnapshot().index).toBe(0); player.setBusy(false); }
  if (reason === "hidden") { player.setHidden(true); player.play(); player.setHidden(false); }
  if (reason === "reduced") { player.setReduced(true); player.play(); player.select(1); expect(player.getSnapshot().index).toBe(1); player.setReduced(false); }
  if (reason === "dispose") player.dispose();
  expect(vi.getTimerCount()).toBe(0); vi.advanceTimersByTime(10000);
  expect(player.getSnapshot().index).toBe(reason === "reduced" ? 1 : 0);
});
it("숨김·busy 조건을 각각 유지하며 새 판정은 별도 초기 상태", () => {
  const player = new TracePlayback(both); player.setHidden(true); player.setBusy(true); player.setHidden(false);
  expect(player.getSnapshot().blocked).toBe(true); player.setBusy(false);
  expect(player.getSnapshot().blocked).toBe(false); player.direction("return");
  expect(new TracePlayback(both).getSnapshot().direction).toBe("forward");
});
it("문서 visibility·motion 변경과 unmount를 실제 EventTarget으로 관찰·해제한다", () => {
  vi.useFakeTimers();
  const page = Object.assign(new EventTarget(), { hidden: false }), motion = Object.assign(new EventTarget(), { matches: false });
  const player = new TracePlayback(both), cleanup = observePlayback(player, page as unknown as Document, motion as unknown as MediaQueryList);
  player.play(); page.hidden = true; page.dispatchEvent(new Event("visibilitychange")); expect(vi.getTimerCount()).toBe(0);
  page.hidden = false; page.dispatchEvent(new Event("visibilitychange")); expect(player.getSnapshot().playing).toBe(false);
  player.play(); motion.matches = true; motion.dispatchEvent(new Event("change")); expect(vi.getTimerCount()).toBe(0);
  motion.matches = false; motion.dispatchEvent(new Event("change")); player.play(); cleanup(); expect(vi.getTimerCount()).toBe(0);
  page.hidden = true; page.dispatchEvent(new Event("visibilitychange")); expect(player.getSnapshot().blocked).toBe(false);
});
it("trace 없음·한 단계·복귀 없음은 이동을 발명하거나 반복 재생하지 않는다", () => {
  vi.useFakeTimers(); const none = new TracePlayback(fixtures[5].verdict); none.play(); none.direction("return");
  expect(none.getSnapshot()).toMatchObject({ playing: false, index: 0, direction: "forward" });
  const single = new TracePlayback({ ...both, return: null, forward: { ...both.forward!, hops: [both.forward!.hops[0]] } });
  single.play(); single.direction("return"); expect(single.getSnapshot().playing).toBe(false); expect(vi.getTimerCount()).toBe(0);
});
it("엔진 decisive는 유일하게 같은 drop 위치에만 붙고 복귀 실패는 정방향에 붙지 않는다", () => {
  expect(decisivePosition(fixtures[1].verdict)).toEqual({ direction: "return", index: 1 });
  expect(decisivePosition(fixtures[0].verdict)).toEqual({ direction: "forward", index: 1 });
  const verdict = fixtures[0].verdict;
  expect(decisivePosition({ ...verdict, return: verdict.forward })).toBeNull();
  expect(decisivePosition({ ...verdict, decisive: { ...verdict.decisive!, detail: "different" } })).toBeNull();
  expect(decisivePosition({ ...verdict, decisive: verdict.forward!.hops[0] })).toBeNull();
  expect(decisivePosition(both)).toBeNull();
});
it("state·firewall과 미래 step은 근거를 덧붙이지 않고 표시한다", () => {
  expect(stepText("state")).toBe("복귀 상태"); expect(stepText("firewall_in")).toBe("방화벽 들어옴");
  expect(stepText("future")).toBe("알 수 없는 단계: future");
});
