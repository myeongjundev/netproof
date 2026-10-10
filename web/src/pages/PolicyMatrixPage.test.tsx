import { isValidElement, type ReactElement } from "react";
import { PolicyMatrixPage } from "./PolicyMatrixPage";
import { ResultPanel } from "../components/ResultPanel";
import { blankDraft, toNetwork } from "../draft";
import { defaultMatrixSpec, flowForCell } from "../policyMatrix";
import type { MatrixCell, PolicyMatrix, Verdict } from "../types";

const harness = vi.hoisted(() => ({ states: [] as unknown[], refs: [] as { current: unknown }[], index: 0, ref: 0 }));
vi.mock("react", async () => ({ ...await vi.importActual<typeof import("react")>("react"),
  useState: (initial: unknown) => {
    const i = harness.index++;
    if (!(i in harness.states)) harness.states[i] = typeof initial === "function" ? initial() : initial;
    return [harness.states[i], (value: unknown) => { harness.states[i] = typeof value === "function" ? value(harness.states[i]) : value; }];
  },
  useRef: (initial: unknown) => harness.refs[harness.ref++] ??= { current: initial },
  useMemo: (make: () => unknown) => make(), useEffect: () => {},
}));
function find(tree: unknown, match: (node: ReactElement<Record<string, any>>) => boolean): ReactElement<Record<string, any>> | undefined {
  if (Array.isArray(tree)) return tree.map(node => find(node, match)).find(Boolean);
  if (!isValidElement<Record<string, any>>(tree)) return;
  return match(tree) ? tree : find(tree.props.children, match);
}
const draft = blankDraft(), network = toNetwork(draft), spec = defaultMatrixSpec();
const cell: MatrixCell = { src: draft.flow.src, dst: draft.flow.dst, service: "tcp/443", result: "PASS", policy: "NO_POLICY", expect: null, reason: "engine", decisive: null };
const matrix = { status: "OK", problems: [], mode: "one-way", services: [{ proto: "tcp", dst_port: 443, key: "tcp/443" }, { proto: "tcp", dst_port: 80, key: "tcp/80" }],
  endpoints: [], cells: [cell], exposures: [], totals: {}, engine_version: "test", limit_exceeded: false } as unknown as PolicyMatrix;
const verdict: Verdict = { result: "PASS", comparison: "NO_CLAIM", reason: "engine", problems: [], forward: null, return: null, decisive: null };
beforeEach(() => {
  harness.states = [spec, true, { matrix, network, signature: JSON.stringify({ network, spec }) }, false, null, "tcp/443", cell, verdict, false, null]; harness.refs = [];
});
function render(current = draft) { harness.index = 0; harness.ref = 0; return PolicyMatrixPage({ draft: current }); }
it("셀 상세 재생은 계산된 network·서비스·모드로 구성한 정확한 flow만 받는다", () => {
  const panel = find(render(), node => node.type === ResultPanel)!;
  expect(panel.props.network).toBe(network); expect(panel.props.flow).toEqual(flowForCell(cell, matrix.services, matrix.mode));
  const edited = { ...draft, flow: { ...draft.flow, dst_port: 22 } };
  expect(find(render(edited), node => node.type === ResultPanel)!.props.flow.dst_port).toBe(443);
});
it("행렬 계산 중·상세 계산 중·구성 변경은 공유 재생을 차단한다", () => {
  harness.states[3] = true; expect(find(render(), node => node.type === ResultPanel)!.props.loading).toBe(true);
  harness.states[3] = false; harness.states[8] = true; expect(find(render(), node => node.type === ResultPanel)!.props.loading).toBe(true);
  const changed = { ...draft, devices: draft.devices.map((device, i) => i === 0 ? { ...device, id: "changed" } : device) };
  expect(find(render(changed), node => node.type === ResultPanel)!.props.stale).toBe(true);
});
it("표시 서비스를 바꾸면 이전 셀의 재생을 제거하고 상세 요청도 무효화한다", () => {
  const picker = find(render(), node => node.type === "select" && node.props.value === "tcp/443")!;
  picker.props.onChange({ target: { value: "tcp/80" } });
  expect(find(render(), node => node.type === ResultPanel)).toBeUndefined();
  expect(harness.states[6]).toBeNull(); expect(harness.states[7]).toBeNull();
});
