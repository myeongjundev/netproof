import { LESSONS, lessonById } from "../learning";
import { PathStrip } from "../components/PathStrip";

export function LearningPage({ lessonId }: { lessonId?: string }) {
  const lesson = lessonId ? lessonById(lessonId) : undefined;
  if (lessonId && !lesson) return <div className="learning-page"><p className="home-eyebrow">학습실 · 연습용 네트워크</p><h1>없는 학습 주제입니다</h1><a href="#/learn">학습실로</a></div>;
  if (lesson) return <div className="learning-page">
    <article className="panel learning-detail" aria-labelledby="lesson-title">
      <div className="home-section-head"><div><p className="home-eyebrow">학습실 · 연습용 네트워크</p><h1 id="lesson-title">{lesson.title}</h1></div><a href="#/home">홈으로</a></div>
      <p className="learning-question">{lesson.task.question}</p><PathStrip {...lesson.path} />
      <div className="home-actions"><a className="home-primary" href={`#/practice/${lesson.caseId}`}>판정기에서 열기</a></div>
      <p className="home-caption">이동만으로는 지금 입력이 바뀌지 않습니다.</p>
      <h2>개념</h2><p>{lesson.concept}</p>
      <h2>쉬운 비유</h2><p>{lesson.analogy}</p>
      <h2>확인할 것</h2><ul>{lesson.task.checkpoints.map(point => <li key={point}>{point}</li>)}</ul>
      <div className="learning-source"><p>출처: NetProof 모델 의미론 · 연습용 네트워크</p><ul>{lesson.sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul><p>계산 결과는 실제 장비 동작을 보장하지 않습니다.</p></div>
      <section className="learning-other"><h2>다른 주제</h2><nav aria-label="다른 주제">{LESSONS.map(item => <a className="ghost-link" href={`#/learn/${item.id}`} key={item.id} aria-current={item.id === lessonId ? "page" : undefined}>{item.title}{item.id === lessonId ? " · 보는 중" : ""}</a>)}</nav></section>
    </article>
  </div>;
  return <div className="learning-page">
    <div className="home-section-head"><div><p className="home-eyebrow">학습실 · 연습용 네트워크</p><h1>질문에서 시작해, 근거를 확인하세요.</h1><p>개념을 살펴보고 내 예상과 NetProof 계산을 비교해 보세요.</p></div><a href="#/home">홈으로</a></div>
    <nav className="learning-cards" aria-label="학습 주제">{LESSONS.map(item => <a className="learning-card" href={`#/learn/${item.id}`} key={item.id} aria-label={`${item.title} 실습 열기`}>
      <span className="home-eyebrow">{item.category}</span><span className="learning-card-title">{item.title}</span><PathStrip {...item.path} size="small" /><span>{item.task.question}</span><span>실습 열기 →</span>
    </a>)}</nav>
    <p className="home-description">확인할 주제를 선택하세요. 연습용 네트워크로 실습합니다.</p>
  </div>;
}
