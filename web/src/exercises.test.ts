import { EXERCISES, exerciseById, exerciseSpec, goalFlow, goalText, outsideChanges, exerciseFact, initializeFixDrafts, fixImport } from "./exercises";
import type { CaseItem, ChangeImpact, MatrixCell, PolicyMatrix } from "./types";
import example from "../../cases/synthetic-01-https-acl.json";

const task = EXERCISES[0];
const cells = task.goals.map(goal => ({ ...goal, result: goal.expect, policy: "AGREE", reason: "engine", decisive: null } as MatrixCell));
const matrix = { status: "OK", limit_exceeded: false, cells } as PolicyMatrix;
const impact = { status: "OK", limit_exceeded: false, changes: [], totals: { not_compared: 0 } } as unknown as ChangeImpact;
it("승인된 세 과제만 정의하고 해법·힌트 필드는 넣지 않는다", () => {
  expect(EXERCISES.map(item => item.id)).toEqual(["fix-01", "fix-02", "fix-03"]);
  expect(EXERCISES.map(item => item.baseCaseId)).toEqual(["synthetic-01", "synthetic-02", "synthetic-03"]);
  for (const exercise of EXERCISES) {
    expect(Object.keys(exercise).sort()).toEqual(["baseCaseId", "goals", "id", "prompt", "title"]);
    for (const goal of exercise.goals) {
      expect(Object.keys(goal).sort()).toEqual(["dst", "expect", "label", "service", "src"]);
      expect(["PASS", "DENY"]).toContain(goal.expect);
      expect(["tcp/22", "tcp/80", "tcp/443", "icmp/echo"]).toContain(goal.service);
      expect(goal.src).not.toBe(goal.dst);
    }
    expect(exercise.prompt + exercise.goals.map(goal => goal.label).join()).not.toMatch(/R1|R2|ACL|경로|규칙|원인|완료|성공|정답|점수|%/);
  }
  expect(JSON.stringify(EXERCISES)).not.toMatch(/solution|hint|answer|network|access-list/);
  expect(exerciseById("absent")).toBeUndefined();
});
it.each(EXERCISES)("$id의 session 의도와 기본 서비스 합집합이 요청에 들어간다", exercise => {
  const spec = exerciseSpec(exercise);
  expect(spec.mode).toBe("session"); expect(spec.services).toHaveLength(5);
  expect(spec.intents).toEqual(exercise.goals.map(({ src, dst, service, expect }) => ({ src, dst, service, expect })));
  exercise.goals.forEach(goal => {
    const flow = goalFlow(exercise, goal);
    expect(flow).toMatchObject({ src: goal.src, dst: goal.dst, mode: "session", proto: goal.service.split("/")[0] });
    if (flow.proto === "icmp") expect(flow.icmp).toBe("echo"); else expect(flow.dst_port).toBe(Number(goal.service.split("/")[1]));
  });
});
it("추가 서비스도 한 번만 합쳐 기본 목록을 변형하지 않는다", () => {
  const extended = { ...task, goals: [...task.goals, { ...task.goals[0], service: "udp/123" }, { ...task.goals[1], service: "udp/123" }] };
  expect(exerciseSpec(extended).services.at(-1)).toEqual({ proto: "udp", dst_port: 123 });
  expect(exerciseSpec(extended).services).toHaveLength(6); expect(exerciseSpec(task).services).toHaveLength(5);
});
it.each([["AGREE", "목표와 같음"], ["EXPOSED", "목표와 다름"], ["BLOCKED", "목표와 다름"], ["UNDECIDED", "판정 불가"], ["NO_POLICY", "판정 불가"]] as const)("%s는 %s로 표시한다", (policy, text) => {
  expect(goalText({ ...cells[0], policy })).toBe(text);
});
it("목표 칸만 빼며 엔진 분류·순서·객체를 유지한다", () => {
  const target = { ...task.goals[0], kind: "closed" };
  const a = { ...target, src: "10.20.20.5", dst: "10.10.10.10", kind: "other" };
  const b = { ...target, service: "udp/53", kind: "opened" };
  const c = { ...target, service: "tcp/80", kind: "closed" };
  const result = { ...impact, changes: [a, target, b, c] } as unknown as ChangeImpact;
  expect(outsideChanges(task, result)).toEqual([a, b, c]); expect(outsideChanges(task, result)[0]).toBe(a);
  expect(result.changes).toHaveLength(4);
});
it("전부 같음·비교된 목표 밖 변화 없음일 때만 사실 문장을 허용한다", () => {
  expect(exerciseFact(task, matrix, impact)).toBe(true);
  expect(exerciseFact(task, matrix, { ...impact, changes: task.goals as unknown as ChangeImpact["changes"] })).toBe(true);
  expect(exerciseFact(task, matrix, { ...impact, changes: [{ ...cells[0], service: "udp/53" }] as unknown as ChangeImpact["changes"] })).toBe(false);
  for (const policy of ["BLOCKED", "EXPOSED", "UNDECIDED", "NO_POLICY"] as const) expect(exerciseFact(task, { ...matrix, cells: [{ ...cells[0], policy }, cells[1]] }, impact)).toBe(false);
  expect(exerciseFact(task, { ...matrix, cells: cells.slice(1) }, impact)).toBe(false);
  expect(exerciseFact(task, matrix, { ...impact, totals: { ...impact.totals, not_compared: 1 } })).toBe(false);
});
it.each(["matrix", "impact"])("%s 누락·INVALID·상한 초과는 사실 문장을 만들지 않는다", side => {
  for (const patch of [null, { status: "INVALID" }, { limit_exceeded: true }]) {
    const m = side === "matrix" ? patch && { ...matrix, ...patch } as PolicyMatrix : matrix;
    const i = side === "impact" ? patch && { ...impact, ...patch } as ChangeImpact : impact;
    expect(exerciseFact(task, m, i)).toBe(false);
  }
});
it("과제별 메모리 입력은 원본과 분리하고 가져오기는 복사한다", () => {
  const first = initializeFixDrafts({}, task.id, example as CaseItem);
  expect(first[task.id].claim.expected).toBeNull(); expect(first[task.id].flow.mode).toBe("session");
  first[task.id].devices[0].id = "edited";
  expect(example.network.devices[0].id).toBe("PC1");
  expect(initializeFixDrafts(first, task.id, example as CaseItem)).toBe(first);
  const second = initializeFixDrafts(first, "fix-02", example as CaseItem);
  expect(second[task.id]).toBe(first[task.id]); expect(second["fix-02"]).not.toBe(first[task.id]);
  const imported = fixImport(task.id, first[task.id]); imported.draft.devices[0].id = "judge";
  expect(first[task.id].devices[0].id).toBe("edited"); expect(imported.label).toContain(task.title);
});
it("과제 코드와 App fixDrafts는 저장 API·주소·Storage에 구성을 쓰지 않는다", async () => {
  const { readFileSync } = await vi.importActual<{ readFileSync(path: URL, encoding: "utf8"): string }>("node:fs");
  const page = readFileSync(new URL("./pages/FixExercisePage.tsx", import.meta.url), "utf8");
  expect(page).not.toMatch(/localStorage|sessionStorage|createCase|updateCase|caseJson|share|location/);
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  expect(app).toContain("const [fixDrafts, setFixDrafts] = useState<Record<string, Draft>>({})");
  expect(app).toContain("draft={fixDrafts[route.id]}"); expect(app).toContain("initializeFixDrafts(current, exerciseId, example)");
});
