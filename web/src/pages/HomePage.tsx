import { draftSummary, hasCurrentInput } from "../homeView";
import { LESSONS, lessonByCaseId, nextLesson } from "../learning";
import { PathStrip } from "../components/PathStrip";
import { GuessPuzzle, type OnGuess } from "../components/GuessPuzzle";
import type { Draft, User } from "../types";
import { UiIcon, type IconName } from "../components/UiIcon";

const STARTS: { title: string; description: string; action: string; href: string; icon: IconName; tone: string }[] = [
  { title: "개념에서 시작하기", description: "경로와 ACL을 살펴보고, 연습용 구성으로 내 예상을 확인해 보세요.", action: "학습 주제 보기", href: "#/learn", icon: "book", tone: "blue" },
  { title: "직접 구성해 보기", description: "장비와 통신을 입력하고 계산 결과와 판정 근거를 살펴보세요.", action: "판정기 열기", href: "#/", icon: "network", tone: "violet" },
  { title: "여러 통신 비교하기", description: "호스트와 서비스별 통신을 한눈에 보고 의도한 정책과 비교해 보세요.", action: "정책 검증 열기", href: "#/matrix", icon: "matrix", tone: "teal" },
];

export function HomePage({ draft, user, checked, onGuess, practiceCaseId, practiceDraft }: { draft: Draft; user: User | null; checked: boolean; onGuess: OnGuess; practiceCaseId?: string | null; practiceDraft?: Draft }) {
  const judgeInput = hasCurrentInput(draft);
  const startedLesson = practiceCaseId ? lessonByCaseId(practiceCaseId) : undefined;
  const resume = judgeInput || !!startedLesson;
  const next = nextLesson(practiceCaseId);
  return <div className="home-page">
    <section className={`home-hero${resume ? " home-hero-resuming" : ""}`} aria-labelledby="home-title">
      {resume ? <div>
        <p className="home-eyebrow">{startedLesson ? `${startedLesson.title} 실습` : "네트워크 설정 검증 실습실"}</p><h1 id="home-title">{startedLesson ? "하던 실습이 있어요" : "작성하던 입력이 있어요"}</h1>
        <p className="home-description home-draft-summary">{startedLesson ? practiceDraft ? draftSummary(practiceDraft) : "실습 구성을 아직 불러오지 않았습니다." : draftSummary(draft)}</p>
        <div className="home-actions"><a className="home-primary" href={startedLesson ? `#/practice/${startedLesson.caseId}` : "#/"}>{startedLesson ? "실습 이어서 하기" : "이어서 하기"}</a>{startedLesson && judgeInput && <a href="#/">판정기 입력 이어서 하기</a>}</div>
        <p className="home-caption">새로고침하면 입력이 사라집니다.</p>
      </div> : <>
        <div>
          <p className="home-eyebrow">네트워크 설정 검증 실습실</p><h1 id="home-title">왜 통과하고,<br /><span>어디서 막힐까요?</span></h1>
          <p className="home-description">내 예상이나 받은 답을 NetProof 계산과 비교하고, 경로와 ACL 근거를 직접 살펴보세요.</p>
          <div className="home-actions"><a className="home-primary" href="#/learn">학습실에서 시작하기 <UiIcon name="arrow" /></a><a className="ghost-link" href="#/">판정기 바로 열기 →</a></div>
          <p className="home-caption">로그인 없이 개념과 실습부터 시작할 수 있어요.</p>
        </div>
        <GuessPuzzle lesson={LESSONS[0]} onGuess={onGuess} heading="h2" primary><PathStrip {...LESSONS[0].path} outside /></GuessPuzzle>
      </>}
    </section>
    {resume && <section className="home-new-practice" aria-labelledby="home-new-title"><h2 id="home-new-title">다음 실습: {next.title}</h2><GuessPuzzle lesson={next} onGuess={onGuess}><PathStrip {...next.path} outside /></GuessPuzzle></section>}
    <section aria-labelledby="home-start-title">
      <div className="home-section-head"><div><p className="home-eyebrow">시작하기</p><h2 id="home-start-title">원하는 방식으로 살펴보세요</h2></div></div>
      <div className="start-cards">{STARTS.map(item => <a className={`start-card tone-${item.tone}`} key={item.href} href={item.href}>
        <span className="card-icon"><UiIcon name={item.icon} /></span><h3>{item.title}</h3><p>{item.description}</p><span className="card-action">{item.action} <UiIcon name="arrow" /></span>
      </a>)}</div>
    </section>
    <section aria-labelledby="home-topics-title">
      <div className="home-section-head"><div><h2 id="home-topics-title">어떤 내용을 확인해 볼까요?</h2><p>연습용 네트워크 3개로 경로와 ACL을 확인합니다.</p></div><a href="#/learn">학습실 전체 보기 →</a></div>
      <div className="learning-cards">{LESSONS.map((lesson, index) => <article className={`learning-card tone-${["blue", "violet", "teal"][index]}`} key={lesson.id}>
        <span className="card-icon"><UiIcon name="network" /></span>
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
