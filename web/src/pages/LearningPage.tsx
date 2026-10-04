import { LESSONS, lessonById } from "../learning";

export function LearningPage({ lessonId }: { lessonId?: string }) {
  const lesson = lessonId ? lessonById(lessonId) : undefined;
  if (lessonId && !lesson) return <p>없는 학습 주제입니다. <a href="#/learn">학습실로</a></p>;
  return <div className="learning-page">
    <div className="home-section-head"><div><p className="home-eyebrow">학습실 · 합성 실습</p><h1>질문에서 시작해, 근거를 확인하세요.</h1><p>개념을 살펴보고 내 예상과 NetProof 계산을 비교해 보세요.</p></div><a href="#/home">홈으로</a></div>
    <nav className="learning-cards" aria-label="학습 주제">{LESSONS.map(item => <a className={`learning-card${item.id === lessonId ? " selected" : ""}`} href={`#/learn/${item.id}`} key={item.id} aria-current={item.id === lessonId ? "page" : undefined}>
      <span className="home-eyebrow">{item.category}</span><span className="learning-card-title">{item.title}</span><span>{item.task.question}</span>
    </a>)}</nav>
    {lesson ? <article className="panel learning-detail" aria-labelledby="lesson-title">
      <h2 id="lesson-title">{lesson.title}</h2><p className="learning-question">{lesson.task.question}</p>
      <h3>개념</h3><p>{lesson.concept}</p>
      <h3>쉬운 비유</h3><p>{lesson.analogy}</p>
      <h3>확인할 것</h3><ul>{lesson.task.checkpoints.map(point => <li key={point}>{point}</li>)}</ul>
      <div className="home-actions"><a className="home-primary" href={`#/practice/${lesson.caseId}`}>판정기에서 실습 살펴보기</a></div>
      <p className="home-caption">판정기로 이동만 하면 지금 입력은 바뀌지 않습니다. 실습 구성은 버튼을 눌러 불러옵니다.</p>
      <div className="learning-source"><p>출처: NetProof 모델 의미론 · 합성 실습</p><ul>{lesson.sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul><p>계산 결과는 실제 장비 동작을 보장하지 않습니다.</p></div>
    </article> : <p className="home-description">살펴볼 주제를 선택하세요. 정답이나 채점 없이 기존 합성 구성으로 실습합니다.</p>}
  </div>;
}
