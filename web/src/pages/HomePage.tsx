import { draftSummary, hasCurrentInput } from "../homeView";
import { LESSONS, type PracticeGuess } from "../learning";
import { PathStrip } from "../components/PathStrip";
import type { Draft, User } from "../types";

function GuessPuzzle({ onGuess, heading = "h3" }: { onGuess: (expected: PracticeGuess) => void; heading?: "h2" | "h3" }) {
  const lesson = LESSONS[0];
  const Heading = heading;
  return <div className="home-puzzle">
    <Heading>먼저 예상해 보세요</Heading><p className="home-puzzle-question">{lesson.task.question}</p>
    <PathStrip {...lesson.path} outside />
    <div className="home-guess-actions"><button type="button" className="ghost" onClick={() => onGuess("PASS")}>통과할 것 같다</button><button type="button" className="ghost" onClick={() => onGuess("DENY")}>막힐 것 같다</button></div>
    <p className="home-caption">NetProof는 모델 안에서 계산합니다. 실제 장비 결과는 따로 확인합니다.</p>
  </div>;
}

export function HomePage({ draft, user, checked, onGuess }: { draft: Draft; user: User | null; checked: boolean; onGuess: (expected: PracticeGuess) => void }) {
  const resume = hasCurrentInput(draft);
  return <div className="home-page">
    <section className={`home-hero${resume ? " home-hero-resuming" : ""}`} aria-labelledby="home-title">
      {resume ? <div>
        <p className="home-eyebrow">네트워크 설정 검증 실습실</p><h1 id="home-title">작성하던 입력이 있어요</h1>
        <p className="home-description home-draft-summary">{draftSummary(draft)}</p>
        <div className="home-actions"><a className="home-primary" href="#/">이어서 하기</a></div>
        <p className="home-caption">새로고침하면 입력이 사라집니다.</p>
      </div> : <>
        <div>
          <p className="home-eyebrow">네트워크 설정 검증 실습실</p><h1 id="home-title">왜 통과하고,<br />어디서 막힐까요?</h1>
          <p className="home-description">내 예상이나 받은 답을 NetProof 계산과 비교하고, 경로와 ACL 근거를 직접 살펴보세요.</p>
          <div className="home-actions"><a href="#/learn">학습실 전체 보기</a><a href="#/">판정기 바로 열기 →</a></div>
          <p className="home-caption">판정기: 구성과 통신을 넣으면 경로와 ACL을 계산해 통과·막힘과 근거를 보여 줍니다.</p>
        </div>
        <GuessPuzzle onGuess={onGuess} heading="h2" />
      </>}
    </section>
    {resume && <section className="home-new-practice" aria-labelledby="home-new-title"><h2 id="home-new-title">새 실습 시작하기</h2><GuessPuzzle onGuess={onGuess} /></section>}
    <section aria-labelledby="home-topics-title">
      <div className="home-section-head"><div><h2 id="home-topics-title">어떤 내용을 확인해 볼까요?</h2><p>연습용 네트워크 3개로 경로와 ACL을 확인합니다.</p></div><a href="#/learn">학습실 전체 보기 →</a></div>
      <div className="learning-cards">{LESSONS.map(lesson => <article className="learning-card" key={lesson.id}>
        <p className="home-eyebrow">{lesson.category}</p><h3>{lesson.title}</h3><PathStrip {...lesson.path} size="small" /><p>{lesson.task.question}</p>
        <a href={`#/learn/${lesson.id}`} aria-label={`${lesson.title} 실습 열기`}>실습 열기 →</a>
      </article>)}</div>
    </section>
    <section className="home-board" aria-labelledby="home-board-title">
      <div><h2 id="home-board-title">계산 근거와 실제 결과를 함께 살펴보세요</h2>
        <p>{!checked ? "로그인 여부를 확인하고 있습니다. 실습은 로그인 없이 시작할 수 있습니다." : user ? "동기들이 기록한 구성과 계산 근거, 실제 결과 확인 상태를 살펴보세요." : "사례 게시판은 로그인한 동기끼리 봅니다."}</p>
      </div><a className="ghost-link" href="#/cases">사례 게시판으로 →</a>
    </section>
  </div>;
}
