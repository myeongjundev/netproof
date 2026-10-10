import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FixExercisePage } from "./FixExercisePage";
import { NetworkEditor } from "../components/NetworkEditor";
import { ResultPanel } from "../components/ResultPanel";
import { api } from "../api";
import { EXERCISES, EXERCISE_FACT, exerciseSpec, goalFlow, initializeFixDrafts } from "../exercises";
import { toNetwork } from "../draft";
import type { CaseItem, ChangeImpact, Draft, MatrixCell, PolicyMatrix, Verdict } from "../types";
import example from "../../../cases/synthetic-01-https-acl.json";

const fixture = vi.hoisted(() => ({ enabled: false, states: [] as any[], refs: [] as any[], effects: [] as any[], queue: [] as (() => void)[], s: 0, r: 0, e: 0 }));
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return { ...actual,
    useState: (initial: any) => {
      if (!fixture.enabled) return actual.useState(initial);
      const i = fixture.s++; if (!(i in fixture.states)) fixture.states[i] = typeof initial === "function" ? initial() : initial;
      return [fixture.states[i], (value: any) => { fixture.states[i] = typeof value === "function" ? value(fixture.states[i]) : value; }];
    },
    useRef: (initial: any) => fixture.enabled ? (fixture.refs[fixture.r++] ??= { current: initial }) : actual.useRef(initial),
    useMemo: (make: () => any, deps: any[]) => fixture.enabled ? make() : actual.useMemo(make, deps),
    useEffect: (effect: () => any, deps: any[]) => {
      if (!fixture.enabled) return actual.useEffect(effect, deps);
      const i = fixture.e++, old = fixture.effects[i];
      if (!old || deps.some((value, index) => !Object.is(value, old.deps[index]))) {
        fixture.effects[i] = { deps, cleanup: old?.cleanup };
        fixture.queue.push(() => { old?.cleanup?.(); fixture.effects[i].cleanup = effect(); });
      }
    },
  };
});
const task = EXERCISES[0];
const cells = task.goals.map(goal => ({ ...goal, policy: "AGREE", result: goal.expect, decisive: null, reason: "engine response" } as MatrixCell));
const matrix = { status: "OK", problems: [], cells, mode: "session", services: [], endpoints: [], limit_exceeded: false } as unknown as PolicyMatrix;
const impact = { status: "OK", problems: [], changes: [], services: [], limit_exceeded: false,
  totals: { not_compared: 0, checks: 10 } } as unknown as ChangeImpact;
const verdict: Verdict = { result: "PASS", comparison: "NO_CLAIM", reason: "engine response", problems: [], forward: null, return: null, decisive: null };
beforeEach(() => { vi.spyOn(api, "examples").mockResolvedValue([example as CaseItem]); vi.spyOn(api, "policyMatrix").mockResolvedValue(matrix); vi.spyOn(api, "changeImpact").mockResolvedValue(impact); vi.spyOn(api, "verify").mockResolvedValue(verdict); });
afterEach(() => { fixture.enabled = false; fixture.states = []; fixture.refs = []; fixture.effects = []; fixture.queue = []; vi.restoreAllMocks(); });
function findAll(node: unknown, test: (node: ReactElement<any>) => boolean): ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap(item => findAll(item, test));
  if (!isValidElement<any>(node)) return [];
  return [...(test(node) ? [node] : []), ...findAll(node.props.children, test)];
}
function text(node: unknown): string {
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (isValidElement<any>(node)) return text(node.props.children);
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}
async function driver() {
  fixture.enabled = true;
  let draft = initializeFixDrafts({}, task.id, example as CaseItem)[task.id];
  const onReady = vi.fn(), onImport = vi.fn();
  const setDraft = vi.fn((update: (current: Draft) => Draft) => { draft = update(draft); });
  const render = () => {
    fixture.s = 0; fixture.r = 0; fixture.e = 0;
    return FixExercisePage({ id: task.id, draft, setDraft, onReady, onImport });
  };
  const effects = async () => { for (const effect of fixture.queue.splice(0)) effect(); await Promise.resolve(); await Promise.resolve(); };
  render(); await effects(); render(); await effects();
  const button = (label: string) => findAll(render(), node => node.type === "button" && text(node.props.children).trim() === label)[0];
  const goals = () => findAll(render(), node => node.type === "button" && text(node.props.children).startsWith("근거 보기"));
  const panel = () => findAll(render(), node => node.type === ResultPanel)[0];
  const edit = (value = "edited input") => findAll(render(), node => node.type === NetworkEditor)[0].props.onAcls([{ name: "101", text: value }]);
  const unmount = () => { fixture.effects.forEach(effect => effect?.cleanup?.()); };
  return { render, effects, button, goals, panel, edit, onReady, onImport, unmount, get draft() { return draft; }, externalEdit() { draft = { ...draft, acls: [] }; } };
}
function deferred<T>() { let resolve!: (value: T) => void, reject!: (error: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

it("확인 전 목표와 메모리 안내를 보이며 조회만으로 계산·저장하지 않는다", async () => {
  const d = await driver(); expect(text(d.render())).toContain("확인 전"); expect(text(d.render())).toContain("새로고침하면 사라집니다");
  expect(d.goals().every(button => button.props.disabled)).toBe(true); expect(api.examples).toHaveBeenCalledTimes(1);
  expect(api.policyMatrix).not.toHaveBeenCalled(); expect(api.changeImpact).not.toHaveBeenCalled(); expect(api.verify).not.toHaveBeenCalled();
});
it("한 번의 확인은 각 API를 한 번씩 정확한 session 본문으로 요청한다", async () => {
  const d = await driver(); d.edit(); const after = toNetwork(d.draft); const check = d.button("확인하기");
  const pending = check.props.onClick(); await check.props.onClick(); await pending;
  expect(api.policyMatrix).toHaveBeenCalledTimes(1); expect(api.changeImpact).toHaveBeenCalledTimes(1);
  expect(api.policyMatrix).toHaveBeenCalledWith(after, exerciseSpec(task));
  expect(api.changeImpact).toHaveBeenCalledWith(example.network, after, goalFlow(task, task.goals[0]), exerciseSpec(task).services);
  expect(api.verify).not.toHaveBeenCalled(); expect(text(d.render())).toContain(EXERCISE_FACT);
});
it("두 요청은 동시에 시작하고 먼저 받은 쪽을 즉시 보여 준다", async () => {
  const m = deferred<PolicyMatrix>(), i = deferred<ChangeImpact>(); vi.mocked(api.policyMatrix).mockReturnValue(m.promise); vi.mocked(api.changeImpact).mockReturnValue(i.promise);
  const d = await driver(); const pending = d.button("확인하기").props.onClick();
  expect(api.policyMatrix).toHaveBeenCalledTimes(1); expect(api.changeImpact).toHaveBeenCalledTimes(1);
  m.resolve(matrix); await Promise.resolve(); expect(text(d.render())).toContain("목표와 같음"); expect(text(d.render())).not.toContain(EXERCISE_FACT);
  expect(d.button("계산 중…").props.disabled).toBe(true); i.resolve(impact); await pending; expect(text(d.render())).toContain(EXERCISE_FACT);
});
it.each([["AGREE", "목표와 같음"], ["EXPOSED", "목표와 다름"], ["BLOCKED", "목표와 다름"], ["UNDECIDED", "판정 불가"]] as const)("%s 결과 문구와 엔진 결과를 함께 표시한다", async (policy, label) => {
  vi.mocked(api.policyMatrix).mockResolvedValue({ ...matrix, cells: [{ ...cells[0], policy, result: policy === "UNDECIDED" ? "UNSUPPORTED" : "DENY" }, cells[1]] });
  const d = await driver(); await d.button("확인하기").props.onClick(); expect(text(d.render())).toContain(label); expect(text(d.render())).toContain(policy === "UNDECIDED" ? "UNSUPPORTED" : "DENY");
  if (policy !== "AGREE") expect(text(d.render())).not.toContain(EXERCISE_FACT);
});
it("목표 칸은 빼고 나머지 분류와 순서를 그대로 표시한다", async () => {
  const change = (service: string, kind: "opened" | "closed" | "other", reason: string) => ({ ...task.goals[0], service, kind, src_device: "PC1", dst_device: "SRV", before: { result: "DENY", reason: "before", decisive: null }, after: { result: "PASS", reason, decisive: null } });
  vi.mocked(api.changeImpact).mockResolvedValue({ ...impact, changes: [change("udp/53", "other", "first"), change("tcp/443", "opened", "hidden"), change("tcp/80", "closed", "last")] } as ChangeImpact);
  const d = await driver(); await d.button("확인하기").props.onClick(); const output = text(d.render());
  expect(output).toContain("그 밖의 변화"); expect(output).toContain("새로 막힘"); expect(output).not.toContain("hidden");
  expect(output.indexOf("first")).toBeLessThan(output.indexOf("last")); expect(output).not.toContain(EXERCISE_FACT);
});
it.each(["matrix", "impact"])("%s가 실패해도 받은 다른 결과를 보관한다", async side => {
  if (side === "matrix") vi.mocked(api.policyMatrix).mockRejectedValue(new Error("matrix error")); else vi.mocked(api.changeImpact).mockRejectedValue(new Error("impact error"));
  const d = await driver(); await d.button("확인하기").props.onClick(); const output = text(d.render());
  expect(output).toContain(`${side} error`); expect(output).toContain(side === "matrix" ? "목표에 없는 통신의 변화 0건" : "목표와 같음"); expect(output).not.toContain(EXERCISE_FACT);
});
it.each(["matrix", "impact"])("%s INVALID/limit 문제 원문을 그대로 보인다", async side => {
  const patch = { status: "INVALID" as const, limit_exceeded: true, problems: ["engine limit_exceeded 원문"] };
  if (side === "matrix") vi.mocked(api.policyMatrix).mockResolvedValue({ ...matrix, ...patch }); else vi.mocked(api.changeImpact).mockResolvedValue({ ...impact, ...patch });
  const d = await driver(); await d.button("확인하기").props.onClick(); expect(text(d.render())).toContain(patch.problems[0]); expect(text(d.render())).not.toContain(EXERCISE_FACT);
});
it("근거는 클릭할 때만 그 목표 flow·구성 스냅샷을 판정한다", async () => {
  const d = await driver(); await d.button("확인하기").props.onClick(); expect(api.verify).not.toHaveBeenCalled();
  await d.goals()[1].props.onClick(); expect(api.verify).toHaveBeenCalledWith(toNetwork(d.draft), goalFlow(task, task.goals[1]), { expected: null, source: "", text: "" });
  const snapshot = structuredClone({ network: d.panel().props.network, flow: d.panel().props.flow });
  expect(d.panel().props.claim.expected).toBeNull(); d.edit(); expect(d.panel().props.stale).toBe(true);
  expect(d.goals().every(button => button.props.disabled)).toBe(true); expect(text(d.render())).toContain("이전 결과"); expect(text(d.render())).not.toContain(EXERCISE_FACT);
  expect({ network: d.panel().props.network, flow: d.panel().props.flow }).toEqual(snapshot);
  await d.goals()[0].props.onClick(); expect(api.verify).toHaveBeenCalledTimes(1);
});
it.each(["edit", "external", "leave"])("%s 뒤 늦게 받은 확인 응답 두 개를 폐기한다", async action => {
  const m = deferred<PolicyMatrix>(), i = deferred<ChangeImpact>(); vi.mocked(api.policyMatrix).mockReturnValue(m.promise); vi.mocked(api.changeImpact).mockReturnValue(i.promise);
  const d = await driver(); const pending = d.button("확인하기").props.onClick();
  if (action === "edit") d.edit(); else if (action === "external") { d.externalEdit(); d.render(); await d.effects(); } else d.unmount();
  m.resolve(matrix); i.resolve(impact); await pending;
  expect(text(d.render())).not.toContain("목표와 같음"); expect(text(d.render())).not.toContain(EXERCISE_FACT);
});
it.each(["edit", "leave"])("%s 뒤 늦게 받은 확인 오류도 폐기한다", async action => {
  const m = deferred<PolicyMatrix>(), i = deferred<ChangeImpact>(); vi.mocked(api.policyMatrix).mockReturnValue(m.promise); vi.mocked(api.changeImpact).mockReturnValue(i.promise);
  const d = await driver(); const pending = d.button("확인하기").props.onClick(); action === "edit" ? d.edit() : d.unmount();
  m.reject(new Error("late matrix")); i.reject(new Error("late impact")); await pending; expect(text(d.render())).not.toContain("late");
});
it.each(["edit", "leave", "recheck"])("%s 뒤 늦은 근거는 붙이지 않는다", async action => {
  const v = deferred<Verdict>(); vi.mocked(api.verify).mockReturnValue(v.promise);
  const d = await driver(); await d.button("확인하기").props.onClick(); const pending = d.goals()[0].props.onClick();
  if (action === "edit") d.edit(); else if (action === "leave") d.unmount(); else await d.button("확인하기").props.onClick();
  v.resolve(verdict); await pending; expect(d.panel().props.verdict).toBeNull();
});
it("같은 입력으로 돌아와도 이전 결과이며 재확인 전 근거는 막는다", async () => {
  const d = await driver(); const original = d.draft.acls[0].text; await d.button("확인하기").props.onClick();
  d.edit(); d.edit(original); expect(text(d.render())).toContain("이전 결과"); expect(d.goals()[0].props.disabled).toBe(true);
  await d.button("확인하기").props.onClick(); expect(d.goals()[0].props.disabled).toBe(false);
});
it("초기화·되돌리기도 요청을 무효화하며 판정기 가져오기만 별도 복사를 보낸다", async () => {
  const d = await driver(); d.edit(); const edited = structuredClone(d.draft);
  await d.button("확인하기").props.onClick(); d.button("처음 구성으로").props.onClick(); expect(d.draft.acls).not.toEqual(edited.acls);
  expect(d.goals()[0].props.disabled).toBe(true); d.button("되돌리기").props.onClick(); expect(d.draft).toEqual(edited);
  d.button("판정기로 가져가기").props.onClick(); expect(d.onImport).toHaveBeenCalledWith(edited); expect(d.onImport.mock.calls[0][0]).not.toBe(d.draft);
});
it("새 확인은 이전 성공 결과와 오류를 섞지 않는다", async () => {
  const d = await driver(); await d.button("확인하기").props.onClick();
  vi.mocked(api.policyMatrix).mockRejectedValue(new Error("new error")); const i = deferred<ChangeImpact>(); vi.mocked(api.changeImpact).mockReturnValue(i.promise);
  const pending = d.button("확인하기").props.onClick(); await Promise.resolve();
  expect(text(d.render())).not.toContain("목표와 같음"); expect(text(d.render())).not.toContain(EXERCISE_FACT);
  i.resolve(impact); await pending; expect(text(d.render())).toContain("new error");
});
it("페이지가 만드는 문구는 채점·배지·축하 표현을 넣지 않는다", async () => {
  vi.mocked(api.policyMatrix).mockResolvedValue({ ...matrix, cells: cells.map(cell => ({ ...cell, reason: "정방향 · 복귀 방향 모두 통과" })) });
  const d = await driver(); await d.button("확인하기").props.onClick();
  expect(text(d.render())).toContain("정방향 · 복귀 방향 모두 통과");
  expect(text(d.render())).not.toMatch(/완료|성공|정답|점수|%/);
  expect(findAll(d.render(), node => typeof node.props.className === "string" && /badge|success|celebrat/.test(node.props.className))).toHaveLength(0);
});
it.each(EXERCISES)("$id SSR는 과제·목표 순서를 보이고 계산하지 않는다", exercise => {
  const html = renderToStaticMarkup(createElement(FixExercisePage, { id: exercise.id, setDraft: () => {}, onReady: () => {}, onImport: () => {} }));
  expect(html).toContain(exercise.title); expect(html).toContain(exercise.prompt); expect(html).toContain("처음 구성을 불러오는 중");
  expect(html).not.toMatch(/완료|성공|정답|점수|%|badge/); expect(api.policyMatrix).not.toHaveBeenCalled();
});
