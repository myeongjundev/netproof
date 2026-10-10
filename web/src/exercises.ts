import data from "./exercises.json";
import { defaultMatrixSpec, flowForCell, serviceKey } from "./policyMatrix";
import { practiceDraft } from "./learning";
import type { CaseItem, ChangeImpact, Draft, Flow, MatrixCell, MatrixSpec, PolicyIntent, PolicyMatrix } from "./types";

export interface ExerciseGoal extends PolicyIntent { label: string }
export interface Exercise { id: string; title: string; baseCaseId: string; prompt: string; goals: ExerciseGoal[] }
export const EXERCISES = data as Exercise[];
export const EXERCISE_FACT = "모든 목표 통신이 목표와 같고, 검사한 서비스 범위에서 목표에 없는 통신의 변화는 없습니다. 검사하지 않은 통신은 알 수 없습니다.";
export function exerciseById(id: string) { return EXERCISES.find(item => item.id === id); }

export function exerciseSpec(exercise: Exercise): MatrixSpec {
  const services = defaultMatrixSpec().services;
  for (const goal of exercise.goals) {
    if (!services.some(service => serviceKey(service) === goal.service)) {
      const [proto, value] = goal.service.split("/");
      services.push(proto === "icmp" ? { proto, icmp: value } : { proto: proto as "tcp" | "udp", dst_port: Number(value) });
    }
  }
  return { mode: "session", services, intents: exercise.goals.map(({ src, dst, service, expect }) => ({ src, dst, service, expect })) };
}
export function goalFlow(exercise: Exercise, goal: ExerciseGoal): Flow {
  const spec = exerciseSpec(exercise);
  return flowForCell(goal, spec.services.map(service => ({ ...service, key: serviceKey(service) })), spec.mode);
}
export function sameGoal(cell: Pick<MatrixCell, "src" | "dst" | "service">, goal: ExerciseGoal) {
  return cell.src === goal.src && cell.dst === goal.dst && cell.service === goal.service;
}
export function goalCell(matrix: PolicyMatrix | null, goal: ExerciseGoal) {
  return matrix?.status === "OK" && !matrix.limit_exceeded ? matrix.cells.find(cell => sameGoal(cell, goal)) : undefined;
}
export function goalText(cell?: MatrixCell): string {
  if (!cell) return "판정 불가";
  return cell.policy === "AGREE" ? "목표와 같음" : cell.policy === "EXPOSED" || cell.policy === "BLOCKED" ? "목표와 다름" : "판정 불가";
}
/** 화면 목록에서 목표만 제외한다. 엔진의 분류·순서를 그대로 유지한다. */
export function outsideChanges(exercise: Exercise, impact: ChangeImpact) {
  return impact.changes.filter(change => !exercise.goals.some(goal => sameGoal(change, goal)));
}
export function exerciseFact(exercise: Exercise, matrix: PolicyMatrix | null, impact: ChangeImpact | null): boolean {
  return !!matrix && matrix.status === "OK" && !matrix.limit_exceeded && !!impact && impact.status === "OK"
    && !impact.limit_exceeded && impact.totals.not_compared === 0
    && exercise.goals.every(goal => goalCell(matrix, goal)?.policy === "AGREE") && outsideChanges(exercise, impact).length === 0;
}
export function initializeFixDrafts(current: Record<string, Draft>, id: string, example: CaseItem): Record<string, Draft> {
  if (current[id]) return current;
  const exercise = exerciseById(id)!;
  return { ...current, [id]: { ...practiceDraft(example), flow: goalFlow(exercise, exercise.goals[0]) } };
}
export function fixImport(id: string, draft: Draft) {
  return { draft: structuredClone(draft), label: `${exerciseById(id)!.title} 구성을 판정기로 가져왔습니다` };
}
