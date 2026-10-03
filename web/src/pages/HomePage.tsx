import { hasCurrentInput } from "../homeView";
import { LESSONS } from "../learning";
import type { Draft, User } from "../types";

export function HomePage({ draft, user, checked }: { draft: Draft; user: User | null; checked: boolean }) {
  return <div className="home-page">
    <section className="home-hero" aria-labelledby="home-title">
      <div>
        <p className="home-eyebrow">네트워크 설정 검증 실습실</p>
        <h1 id="home-title">왜 통과하고,<br />어디서 막힐까요?</h1>
        <p className="home-description">내 예상이나 받은 답을 NetProof 계산과 비교하고, 경로와 ACL 근거를 직접 살펴보세요.</p>
        <div className="home-actions">
          <a className="home-primary" href="#/learn/https-acl">첫 실습 둘러보기</a>
          <a href="#/">판정기로 이동 →</a>
        </div>
        <p className="home-caption">모델 안의 계산입니다. 실제 장비 결과는 별도로 확인합니다.</p>
      </div>
      <ol className="home-journey" aria-label="이용 순서">
        <li>입력과 내 예상</li><li>계산 근거 살펴보기</li><li>실제 결과로 확인</li>
      </ol>
    </section>
    {hasCurrentInput(draft) && <section className="home-resume" aria-labelledby="home-resume-title">
      <div><h2 id="home-resume-title">작성 중인 입력이 있습니다</h2><p>화면을 이동해도 입력은 유지됩니다. 새로고침하면 입력은 사라집니다. 이전 판정 결과는 복원하지 않습니다.</p></div>
      <a className="ghost-link" href="#/">현재 입력으로 돌아가기</a>
    </section>}
    <section aria-labelledby="home-topics-title">
      <div className="home-section-head"><div><h2 id="home-topics-title">어떤 내용을 확인해 볼까요?</h2><p>기존 합성 실습 3개로 경로와 ACL을 살펴봅니다.</p></div><a href="#/learn">학습실 전체 보기 →</a></div>
      <div className="learning-cards">{LESSONS.map(lesson => <article className="learning-card" key={lesson.id}>
        <p className="home-eyebrow">{lesson.category}</p><h3>{lesson.title}</h3><p>{lesson.task.question}</p>
        <a href={`#/learn/${lesson.id}`} aria-label={`${lesson.title} 살펴보기`}>살펴보기 →</a>
      </article>)}</div>
    </section>
    <section className="home-board" aria-labelledby="home-board-title">
      <div><h2 id="home-board-title">계산 근거와 실제 결과를 함께 살펴보세요</h2>
        <p>{!checked ? "로그인 여부를 확인하고 있습니다. 실습은 로그인 없이 시작할 수 있습니다." : user ? "동기들이 기록한 구성과 계산 근거, 실제 결과 확인 상태를 살펴보세요." : "사례 게시판은 로그인한 동기끼리 봅니다."}</p>
      </div><a className="ghost-link" href="#/cases">사례 게시판으로 →</a>
    </section>
  </div>;
}
