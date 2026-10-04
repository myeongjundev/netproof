import type { ReactNode } from "react";
import type { LESSONS, PracticeGuess } from "../learning";

export type OnGuess = (caseId: string, expected: PracticeGuess) => void;

/** 학생의 선택만 전달한다. 정답·판정·Draft는 이 컴포넌트가 갖지 않는다. */
export function GuessPuzzle({ lesson, heading = "h3", onGuess, primary = false, children }: {
  lesson: (typeof LESSONS)[number]; heading?: "h2" | "h3"; onGuess: OnGuess; primary?: boolean; children?: ReactNode;
}) {
  const Heading = heading;
  const questionId = `guess-question-${lesson.caseId}`;
  return <div className="home-puzzle" role="group" aria-labelledby={questionId}>
    <Heading>먼저 예상해 보세요</Heading><p id={questionId} className="home-puzzle-question">{lesson.guessPrompt}</p>
    {children}
    <div className="home-guess-actions">
      <button type="button" className={primary ? "primary" : "ghost"} onClick={() => onGuess(lesson.caseId, "PASS")}>통과할 것 같다</button>
      <button type="button" className={primary ? "primary" : "ghost"} onClick={() => onGuess(lesson.caseId, "DENY")}>막힐 것 같다</button>
    </div>
  </div>;
}
