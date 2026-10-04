import { cloneTitle, PRACTICE } from "./practice";

describe("PRACTICE", () => {
  it("질문과 확인할 점에 판정·결정 규칙 번호를 넣지 않는다", () => {
    for (const task of PRACTICE) {
      expect(task.checkpoints.length).toBeGreaterThanOrEqual(2);
      expect(task.checkpoints.length).toBeLessThanOrEqual(4);
      expect([task.question, ...task.checkpoints].join(" ")).not.toMatch(/PASS|DENY|rule_seq/i);
      expect(Object.keys(task).sort()).toEqual(["case_id", "checkpoints", "question", "title"]);
    }
  });
});

describe("cloneTitle", () => {
  it("원제목에 복제 접두사를 붙인다", () => {
    expect(cloneTitle("HTTPS 실습")).toBe("복제 · HTTPS 실습");
  });

  it("서버처럼 유니코드 코드 포인트 80자로 자른다", () => {
    const title = cloneTitle("🧪".repeat(100));
    expect(Array.from(title)).toHaveLength(80);
    expect(title).toBe(`복제 · ${"🧪".repeat(75)}`);
  });
});
