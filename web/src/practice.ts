export interface PracticeTask {
  case_id: string;
  title: string;
  question: string;
  checkpoints: string[];
}

export const PRACTICE: PracticeTask[] = [
  {
    case_id: "synthetic-01",
    title: "실습 · HTTPS와 입력 ACL",
    question: "PC1에서 SRV의 HTTPS에 접속할 수 있나요?",
    checkpoints: ["출발지와 목적지 주소", "ACL이 붙은 인터페이스와 방향", "ACL 규칙을 확인하는 순서"],
  },
  {
    case_id: "synthetic-02",
    title: "실습 · 왕복 경로",
    question: "PC1에서 SRV2로 보낸 통신이 왕복할 수 있나요?",
    checkpoints: ["흐름의 프로토콜과 판정 모드", "가는 경로의 게이트웨이와 정적 경로", "돌아오는 경로의 게이트웨이와 정적 경로"],
  },
  {
    case_id: "synthetic-03",
    title: "실습 · 출력 ACL",
    question: "PC1에서 SRV로 가는 통신에 출력 ACL은 어떻게 적용되나요?",
    checkpoints: ["패킷이 나가는 인터페이스", "ACL이 적용되는 방향", "흐름과 ACL의 주소·프로토콜 조건"],
  },
];

export function cloneTitle(title: string): string {
  return Array.from(`복제 · ${title}`).slice(0, 80).join("");
}
