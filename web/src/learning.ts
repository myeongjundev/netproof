import { EMPTY_CLAIM, fromCase } from "./draft";
import { PRACTICE } from "./practice";
import type { CaseItem, Draft } from "./types";

export type PracticeGuess = "PASS" | "DENY";
export interface LessonPath {
  nodes: { id: string; kind: "host" | "router" }[];
  acls: { device: string; iface: string; dir: "in" | "out"; name: string }[];
  roundTrip?: boolean;
}

const semantics = "https://github.com/myeongjundev/netproof/blob/main/docs/semantics.md";
const metadata: { id: string; caseId: string; title: string; category: string; focus: string; guessPrompt: string; concept: string; analogy: string; sources: { label: string; href: string }[]; path: LessonPath }[] = [
  {
    id: "https-acl", caseId: "synthetic-01", title: "HTTPS와 입력 ACL", category: "ACL 기초",
    focus: "입력 ACL이 HTTPS 통신에 어떻게 적용되는지",
    guessPrompt: "PC1에서 SRV의 HTTPS(TCP 443)에 접속할 수 있을까요?",
    path: { nodes: [{ id: "PC1", kind: "host" }, { id: "R1", kind: "router" }, { id: "SRV", kind: "host" }], acls: [{ device: "R1", iface: "g0/0", dir: "in", name: "101" }] },
    concept: "입력 ACL은 라우터 인터페이스로 들어오는 패킷의 조건을 확인합니다. 위에서부터 처음 일치하는 규칙의 동작을 따르며, 붙은 ACL에서 일치하는 규칙이 없으면 암묵적으로 막힙니다.",
    analogy: "입구에서 위에 적힌 조건부터 차례로 확인하는 출입 명단을 떠올려 보세요.",
    sources: [{ label: "5절 라우터", href: `${semantics}#5-라우터` }, { label: "6절 ACL 규칙 일치", href: `${semantics}#6-acl-규칙-일치` }],
  },
  {
    id: "round-trip", caseId: "synthetic-02", title: "왕복 경로", category: "경로 확인",
    focus: "가는 길과 돌아오는 길이 모두 있는지",
    guessPrompt: "PC1에서 SRV2로 보낸 ping(ICMP)이 왕복할 수 있을까요?",
    path: { nodes: [{ id: "PC1", kind: "host" }, { id: "R1", kind: "router" }, { id: "R2", kind: "router" }, { id: "SRV2", kind: "host" }], acls: [], roundTrip: true },
    concept: "NetProof의 기본 session 모드는 가는 길과 돌아오는 길을 모두 계산합니다. ACL은 무상태이므로 가는 길이 허용됐다고 돌아오는 길이 자동으로 허용되지는 않습니다. 상태 기반 방화벽의 동작은 이 모델의 지원 범위 밖입니다.",
    analogy: "편지를 보낼 길뿐 아니라 답장이 돌아올 길도 확인하는 것과 같습니다.",
    sources: [{ label: "2절 통신 가능의 뜻", href: `${semantics}#2-통신-가능의-뜻-adr-005` }, { label: "4절 호스트", href: `${semantics}#4-호스트` }, { label: "5절 라우터", href: `${semantics}#5-라우터` }],
  },
  {
    id: "output-acl", caseId: "synthetic-03", title: "출력 ACL", category: "적용 방향",
    focus: "출력 ACL이 나가는 패킷에 어떻게 적용되는지",
    guessPrompt: "PC1에서 SRV의 SSH(TCP 22)에 접속할 수 있을까요?",
    path: { nodes: [{ id: "PC1", kind: "host" }, { id: "R1", kind: "router" }, { id: "SRV", kind: "host" }], acls: [{ device: "R1", iface: "g0/1", dir: "out", name: "110" }] },
    concept: "라우터는 입력 ACL을 확인하고 경로를 조회한 뒤, 나가는 인터페이스의 출력 ACL을 확인합니다. in과 out은 그 인터페이스를 기준으로 패킷이 들어오고 나가는 방향입니다. 같은 통신도 ACL이 붙은 위치와 방향을 함께 살펴봐야 합니다.",
    analogy: "건물 입구와 출구에 서로 다른 출입 명단이 있을 수 있는 것과 같습니다.",
    sources: [{ label: "5절 라우터", href: `${semantics}#5-라우터` }, { label: "6절 ACL 규칙 일치", href: `${semantics}#6-acl-규칙-일치` }],
  },
];

export const LESSONS = metadata.map((lesson) => {
  const task = PRACTICE.find(item => item.case_id === lesson.caseId);
  if (!task) throw new Error(`실습 메타데이터 연결 없음: ${lesson.caseId}`);
  return { ...lesson, task };
});

export function lessonById(id: string) { return LESSONS.find(lesson => lesson.id === id); }
export function lessonByCaseId(id: string) { return LESSONS.find(lesson => lesson.caseId === id); }

/** 실습의 출발점만 사용한다. 결과나 정답에 따른 추천이 아니다. */
export function nextLesson(caseId?: string | null) {
  const index = LESSONS.findIndex(lesson => lesson.caseId === caseId);
  return LESSONS[(index + 1) % LESSONS.length];
}

export type ExampleStatus = "loading" | "ready" | "error";
export function practiceEntry(id: string, examples: CaseItem[], status: ExampleStatus):
  { kind: "loading" | "error" | "missing" } | { kind: "ready"; example: CaseItem } {
  if (status === "loading" || status === "error") return { kind: status };
  const example = examples.find(item => item.id === id);
  return example ? { kind: "ready", example } : { kind: "missing" };
}

/** 명시적으로 실습을 시작할 때만 호출한다. 예시의 답과 expect는 입력으로 옮기지 않는다. */
export function practiceDraft(example: CaseItem, guess?: PracticeGuess): Draft {
  return { ...fromCase(example), claim: guess ? { expected: guess, kind: "self", source: "", text: "" } : { ...EMPTY_CLAIM } };
}
