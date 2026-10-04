import { blankDraft, EMPTY_CLAIM, toNetwork } from "./draft";
import { LESSONS, lessonById, lessonByCaseId, practiceEntry, practiceDraft, practiceStartLabel } from "./learning";
import { PRACTICE } from "./practice";
import type { CaseItem } from "./types";
import case01 from "../../cases/synthetic-01-https-acl.json";
import case02 from "../../cases/synthetic-02-missing-return-route.json";
import case03 from "../../cases/synthetic-03-acl-out.json";
import learningSource from "./learning.ts?raw";

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

it.each([case01, case02, case03])("$id 경로 메타데이터는 실제 예시 장비와 ACL 연결에 일치한다", item => {
  const lesson = lessonByCaseId(item.id)!;
  // 이 세 직선 구성의 연결 순서(판정·ACL 규칙 해석은 하지 않는다).
  const devices = item.network.devices;
  const source = devices.find(device => device.interfaces.some(iface => iface.ip.split("/")[0] === item.flow.src))!;
  const target = devices.find(device => device.interfaces.some(iface => iface.ip.split("/")[0] === item.flow.dst))!;
  expect(lesson.path.nodes).toEqual(devices.map(device => ({ id: device.id, kind: device.kind })));
  expect(lesson.path.nodes[0].id).toBe(source.id);
  expect(lesson.path.nodes.at(-1)!.id).toBe(target.id);
  const acls = devices.flatMap(device => device.interfaces.flatMap(iface => {
    const bindings = iface as { name: string; acl_in?: string; acl_out?: string };
    return (["in", "out"] as const).flatMap(dir => bindings[`acl_${dir}`] ? [{ device: device.id, iface: iface.name, dir, name: bindings[`acl_${dir}`] }] : []);
  }));
  expect(lesson.path.acls).toEqual(acls);
  expect(!!lesson.path.roundTrip).toBe(item.id === "synthetic-02");
});
it("실행 코드에 사례 JSON·expect가 들어가지 않는다", () => {
  const source = learningSource;
  expect(source).not.toMatch(/(?:import|export)[^;]*cases\/|import\([^)]*cases\//);
  expect(source).not.toMatch(/\.expect\b|\[.expect.\]/);
});
it.each([case01, case02, case03])("$id 예상 질문은 실제 흐름의 프로토콜·포트와 일치한다", item => {
  const prompt = lessonByCaseId(item.id)!.guessPrompt;
  const flow = item.flow;
  expect(prompt).toContain(flow.proto.toUpperCase());
  if (flow.proto === "icmp") { expect(prompt).toContain("ping(ICMP)"); expect(prompt).not.toMatch(/TCP|UDP|\d+\)/); }
  else { expect(flow).toHaveProperty("dst_port"); expect(prompt).toContain(`${flow.proto.toUpperCase()} ${"dst_port" in flow ? flow.dst_port : ""}`); }
  const source = item.network.devices.find(device => device.interfaces.some(iface => iface.ip.split("/")[0] === flow.src))!;
  const target = item.network.devices.find(device => device.interfaces.some(iface => iface.ip.split("/")[0] === flow.dst))!;
  expect(prompt).toContain(source.id); expect(prompt).toContain(target.id);
  expect(prompt).not.toMatch(/막힘|없음|정답|ACL|expect/);
});
it.each(["PASS", "DENY"] as const)("학생의 %s 예상만 self 받은 답으로 옮긴다", guess => {
  const before = JSON.stringify(example);
  expect(practiceDraft(example, guess).claim).toEqual({ expected: guess, kind: "self", source: "", text: "" });
  expect(practiceDraft(example, guess)).not.toHaveProperty("expect");
  expect(JSON.stringify(example)).toBe(before);
});
it.each(PRACTICE)("$case_id 시작 알림에서 실습이 겹치지 않는다", task => {
  expect(practiceStartLabel(task)).toBe(`${task.title.replace(/^실습 · /, "")} 실습을 시작했습니다`);
  expect(practiceStartLabel(task).match(/실습/g)).toHaveLength(1);
});
