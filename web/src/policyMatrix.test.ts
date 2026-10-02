import { defaultMatrixSpec, flowForCell, guardedRequest, matrixGrid, readMatrixSpec, serviceKey, setCellIntent, sortPolicyCells } from "./policyMatrix";
import type { MatrixCell, PolicyState } from "./types";

const cell = (policy: PolicyState = "NO_POLICY", patch: Partial<MatrixCell> = {}): MatrixCell => ({
  src: "10.0.0.1", dst: "10.0.0.2", service: "tcp/443", result: "PASS", expect: null, policy,
  reason: "synthetic", decisive: null, ...patch,
});

it("격자는 받은 셀만 배치하고 빠진 쌍을 판정하지 않는다", () => {
  const endpoints = ["10.0.0.1", "10.0.0.2"].map((ip, i) => ({ ip, device: `H${i}`, interface: "eth0" }));
  const forward = cell("EXPOSED");
  const reverse = cell("BLOCKED", { src: forward.dst, dst: forward.src, result: "DENY" });
  expect(matrixGrid(endpoints, [forward, reverse], "tcp/443")).toEqual([[null, forward], [reverse, null]]);
  expect(matrixGrid(endpoints, [forward], "icmp/echo")).toEqual([[null, null], [null, null]]);
});

it("서버의 정책 상태를 재판정하지 않고 노출부터 정렬한다", () => {
  const input = [cell("NO_POLICY"), cell("UNDECIDED"), cell("EXPOSED"), cell("AGREE"), cell("BLOCKED")];
  expect(sortPolicyCells(input).map(c => c.policy)).toEqual(["EXPOSED", "BLOCKED", "UNDECIDED", "AGREE", "NO_POLICY"]);
  expect(input[0].policy).toBe("NO_POLICY");
});

it("의도는 한 셀에 하나이며 메모를 보존하고 없음 선택으로 삭제한다", () => {
  const forward = cell();
  const old = [{ src: forward.src, dst: forward.dst, service: forward.service, expect: "DENY" as const, note: "human" }];
  const next = setCellIntent(old, forward, "PASS");
  expect(next).toEqual([{ ...old[0], expect: "PASS" }]);
  expect(old[0].expect).toBe("DENY");
  expect(setCellIntent(next, forward, null)).toEqual([]);
  expect(setCellIntent([], forward, "DENY")[0].expect).toBe("DENY");
});

it("ICMP 별칭과 서비스 포트를 표시 키로 정규화한다", () => {
  expect(serviceKey({ proto: "icmp", icmp: "008" })).toBe("icmp/echo");
  expect(serviceKey({ proto: "icmp", icmp: "0" })).toBe("icmp/echo-reply");
  expect(serviceKey({ proto: "udp", dst_port: 53 })).toBe("udp/53");
});

it("상세 요청은 계산했던 서비스와 모드만 사용한다", () => {
  const services = [{ key: "icmp/echo-reply", proto: "icmp" as const, icmp: "echo-reply" }];
  expect(flowForCell(cell("UNDECIDED", { service: services[0].key }), services, "one-way"))
    .toEqual({ src: "10.0.0.1", dst: "10.0.0.2", proto: "icmp", icmp: "echo-reply", mode: "one-way" });
  expect(() => flowForCell(cell(), [], "session")).toThrow();
});

it("저장 입력 손상은 기본값으로 복구하며 판정은 저장하지 않는다", () => {
  expect(readMatrixSpec("broken")).toEqual(defaultMatrixSpec());
  expect(readMatrixSpec('{"services":null}')).toEqual(defaultMatrixSpec());
  const spec = defaultMatrixSpec();
  expect(readMatrixSpec(JSON.stringify(spec))).toEqual(spec);
  expect(readMatrixSpec(JSON.stringify({ ...spec, services: [null] }))).toEqual(spec);
});

it.each([false, true])("입력 변경 후 늦은 성공/오류는 표시하지 않는다 (오류=%s)", async rejected => {
  let active = true;
  let resolve!: (value: string) => void;
  let reject!: (reason: Error) => void;
  const request = new Promise<string>((yes, no) => { resolve = yes; reject = no; });
  const success = vi.fn(); const failure = vi.fn();
  const pending = guardedRequest(() => request, () => active, success, failure);
  active = false;
  if (rejected) reject(Error("late")); else resolve("late");
  await pending;
  expect(success).not.toHaveBeenCalled(); expect(failure).not.toHaveBeenCalled();
});

it("현재 요청 성공과 오류는 전달한다", async () => {
  const success = vi.fn(); const failure = vi.fn();
  await guardedRequest(() => Promise.resolve("current"), () => true, success, failure);
  await guardedRequest(() => Promise.reject(Error("current error")), () => true, success, failure);
  expect(success).toHaveBeenCalledWith("current"); expect(failure).toHaveBeenCalledTimes(1);
});
