import { blankDraft, EMPTY_CLAIM, toNetwork } from "./draft";
import { LESSONS, lessonById, lessonByCaseId, practiceEntry, practiceDraft } from "./learning";
import { PRACTICE } from "./practice";
import type { CaseItem } from "./types";

const example: CaseItem = { id: "synthetic-01", source: "synthetic", network: toNetwork(blankDraft()), flow: blankDraft().flow, claim: { expected: "DENY", text: "not an answer to copy", source: "test", kind: "ai" }, expect: { result: "DENY" } } as CaseItem;

it("세 주제는 기존 실습 체크포인트를 연결하고 정답 필드를 만들지 않는다", () => {
  expect(LESSONS).toHaveLength(3);
  for (const lesson of LESSONS) {
    expect(lesson.task).toBe(PRACTICE.find(task => task.case_id === lesson.caseId));
    expect(lessonById(lesson.id)).toBe(lesson);
    expect(lessonByCaseId(lesson.caseId)).toBe(lesson);
    expect(lesson).not.toHaveProperty("expect");
    expect(lesson).not.toHaveProperty("result");
    expect(lesson.sources.every(source => source.href.startsWith("https://github.com/myeongjundev/netproof/blob/main/docs/semantics.md#"))).toBe(true);
  }
  expect(lessonById("unknown")).toBeUndefined();
  expect(lessonByCaseId("synthetic-04")).toBeUndefined();
});

it("실습 불러오기는 원문과 무관하게 받은 답을 비우고 구성은 복사한다", () => {
  const before = JSON.stringify(example);
  const draft = practiceDraft(example);
  expect(draft.claim).toEqual(EMPTY_CLAIM);
  expect(draft).not.toHaveProperty("expect");
  draft.devices[0].id = "changed";
  expect(JSON.stringify(example)).toBe(before);
});

it("조회 중·실패·누락·완료를 구분하며 ID 없는 다른 예시로 대체하지 않는다", () => {
  expect(practiceEntry("synthetic-01", [], "loading")).toEqual({ kind: "loading" });
  expect(practiceEntry("synthetic-01", [example], "error")).toEqual({ kind: "error" });
  expect(practiceEntry("synthetic-01", [], "ready")).toEqual({ kind: "missing" });
  expect(practiceEntry("synthetic-02", [example], "ready")).toEqual({ kind: "missing" });
  expect(practiceEntry("synthetic-01", [example], "ready")).toEqual({ kind: "ready", example });
  expect(JSON.stringify(example)).toContain("not an answer to copy");
});
