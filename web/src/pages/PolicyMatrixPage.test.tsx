import { isValidElement, type ReactElement } from "react";
import { PolicyMatrixPage } from "./PolicyMatrixPage";
import { ResultPanel } from "../components/ResultPanel";
import { blankDraft, toNetwork } from "../draft";
import { defaultMatrixSpec, flowForCell } from "../policyMatrix";
import type { MatrixCell, PolicyMatrix, Verdict } from "../types";
import { NetworkDiagram } from "../components/NetworkDiagram";
import { api } from "../api";
import { breachById, breachDraft, breachSpec } from "../breach";
import responses from "../testFixtures/breach-responses.json";

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

describe("이 장비가 뚫리면", () => {
  const scenario = breachById("breach-01")!, breachDraftValue = breachDraft(scenario), breachNetwork = toNetwork(breachDraftValue);
  const breachSpecValue = breachSpec(scenario), start = responses.start as unknown as PolicyMatrix;
  const findAll = (tree: unknown, match: (node: ReactElement<Record<string, any>>) => boolean): ReactElement<Record<string, any>>[] => {
    if (Array.isArray(tree)) return tree.flatMap(node => findAll(node, match));
    if (!isValidElement<Record<string, any>>(tree)) return [];
    return [...(match(tree) ? [tree] : []), ...findAll(tree.props.children, match)];
  };
  const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join("") : isValidElement<Record<string, any>>(node) ? text(node.props.children) : typeof node === "string" || typeof node === "number" ? String(node) : "";
  const show = (breached: string) => {
    harness.states = [breachSpecValue, true, { matrix: start, network: breachNetwork, signature: JSON.stringify({ network: breachNetwork, spec: breachSpecValue }) },
      false, null, "tcp/22", null, null, false, null, breached];
    return render(breachDraftValue);
  };
  const picker = (tree: unknown) => find(tree, node => node.type === "select" && node.props["aria-label"] === "뚫렸다고 가정할 장비")!;

  it("고르기 전에는 장비 목록만 보이고 피해 범위는 그리지 않는다", () => {
    const tree = show("");
    expect(findAll(picker(tree).props.children, node => node.type === "option").map(option => option.props.value)).toEqual(["", "ADMIN", "DB", "OUTSIDE", "WEB"]);
    expect(find(tree, node => node.type === NetworkDiagram)).toBeUndefined();
    expect(findAll(tree, node => node.type === "button" && String(node.props.className).includes("reach-service"))).toHaveLength(0);
  });

  it("WEB을 고르면 엔진 칸을 묶어 3곳·15개, 구성도 표시, 서비스 단추를 보인다", () => {
    const tree = show("WEB");
    expect(text(tree)).toContain("WEB에서 시작하는 연결이 닿는 곳: 3곳 · 서비스 15개");
    expect(text(tree)).toContain("서비스가 실제로 열려 있는지, 취약한지는 계산하지 않습니다.");
    const diagram = find(tree, node => node.type === NetworkDiagram)!;
    expect(diagram.props.network).toBe(breachNetwork);
    expect(diagram.props.marks.WEB).toEqual({ tone: "breached", text: "뚫림" });
    expect(diagram.props.flow.src).toBe("10.0.10.10");
    expect(findAll(tree, node => node.type === "button" && String(node.props.className).includes("reach-service"))).toHaveLength(15);
  });

  it("서비스 단추는 그 칸으로 기존 통신 상세를 연다", () => {
    vi.spyOn(api, "verify").mockResolvedValue(verdict);
    const button = findAll(show("WEB"), node => node.type === "button" && String(node.props.className).includes("reach-service") && text(node).includes("DB · MySQL"))[0];
    void button.props.onClick();
    expect(harness.states[6]).toMatchObject({ src: "10.0.10.10", dst: "10.0.20.10", service: "tcp/3306" });
    vi.restoreAllMocks();
  });

  it("다시 계산해 장비가 사라지면 고르지 않은 상태로 본다", () => {
    expect(find(show("NOPE"), node => node.type === NetworkDiagram)).toBeUndefined();
    expect(picker(show("NOPE")).props.value).toBe("");
  });
});
