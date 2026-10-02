import { applyObservation } from "./observe";
import type { CaseDetail, Observation } from "./types";

const actual: CaseDetail["actual"] = { result: "DENY", source: "device", note: "직접 쓴 메모" };
const candidate: Observation = { status: "OK", problems: [], tool: "ping", observed: "reply", result: "PASS", source: "ping", note: "요약", target: "192.0.2.5", evidence: [] };

it("미정 후보는 기존 결과를 지우지 않고 출처와 메모만 적용한다", () => {
  expect(applyObservation(actual, { ...candidate, result: null })).toEqual({ result: "DENY", source: "ping", note: "직접 쓴 메모\n요약" });
  expect(actual.note).toBe("직접 쓴 메모");
});
it("빈 메모에는 초안을 넣고 성공 후보를 적용한다", () => {
  expect(applyObservation({ result: null, source: null, note: "" }, candidate)).toEqual({ result: "PASS", source: "ping", note: "요약" });
});
it("거절 후보는 아무것도 바꾸지 않는다", () => {
  expect(applyObservation(actual, { ...candidate, status: "REJECTED" })).toBe(actual);
});
it("메모는 이모지를 자르지 않고 서버의 코드포인트 1000자에 맞춘다", () => {
  const next = applyObservation({ ...actual, note: "🧪".repeat(999) }, candidate);
  expect(next.note).toBe("🧪".repeat(999) + "\n");
  expect(Array.from(next.note)).toHaveLength(1000);
});
it("빈 후보 메모·출처는 기존 값을 유지한다", () => {
  expect(applyObservation(actual, { ...candidate, note: "", source: null, result: null })).toEqual(actual);
});
