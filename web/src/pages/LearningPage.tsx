import { LESSONS, lessonById } from "../learning";
import { PathStrip } from "../components/PathStrip";
import { GuessPuzzle, type OnGuess } from "../components/GuessPuzzle";
import { TOOL_TOPICS, TOOL_NOTICE, toolTopicById } from "../toolTopics";

function OtherTopics({ current }: { current?: string }) {
  return <section className="learning-other"><h2>다른 주제</h2><nav aria-label="다른 주제">{[...LESSONS, ...TOOL_TOPICS].map(item => <a className="ghost-link" href={`#/learn/${item.id}`} key={item.id} aria-current={item.id === current ? "page" : undefined}>{item.title}{item.id === current ? " · 보는 중" : ""}</a>)}</nav></section>;
}

export function LearningPage({ lessonId, onGuess }: { lessonId?: string; onGuess: OnGuess }) {
  const lesson = lessonId ? lessonById(lessonId) : undefined;
  const tool = lessonId ? toolTopicById(lessonId) : undefined;
  if (tool) return <div className="learning-page">
    <article className="panel learning-detail tool-topic" aria-labelledby="lesson-title">
      <div className="home-section-head"><div><p className="home-eyebrow">학습실 · {tool.category}</p><h1 id="lesson-title">{tool.title}</h1></div><a href="#/home">홈으로</a></div>
      <p className="learning-question">이 주제에서 볼 것: {tool.focus}</p>
      <h2>개념</h2><ul>{tool.concepts.map(point => <li key={point}>{point}</li>)}</ul>
      <h2>쉬운 비유</h2><p>{tool.analogy}</p>
      <h2>{tool.id === "n8n" ? "NetProof로 해 보기" : "NetProof 로그로 해 보기"}</h2><ol>{tool.steps.map(point => <li key={point}>{point}</li>)}</ol>
      <h2>{tool.example.title}</h2><pre><code>{tool.example.text}</code></pre>
      <h2>확인할 것</h2><ul>{tool.checkpoints.map(point => <li key={point}>{point}</li>)}</ul>
      <div className="learning-source"><p>출처: 공식 문서</p><ul>{tool.sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul>
        <a href={tool.doc.href} target="_blank" rel="noreferrer">{tool.doc.label} ↗</a>
        <p>{TOOL_NOTICE} 문서 기준: {tool.version}, {tool.checked} 확인.</p></div>
      <OtherTopics current={lessonId} />
    </article>
  </div>;
  if (lessonId && !lesson) return <div className="learning-page"><p className="home-eyebrow">학습실 · 연습용 네트워크</p><h1>없는 학습 주제입니다</h1><a href="#/learn">학습실로</a></div>;
  if (lesson) return <div className="learning-page">
    <article className="panel learning-detail" aria-labelledby="lesson-title">
      <div className="home-section-head"><div><p className="home-eyebrow">학습실 · 연습용 네트워크</p><h1 id="lesson-title">{lesson.title}</h1></div><a href="#/home">홈으로</a></div>
      <p className="learning-question">이 실습에서 볼 것: {lesson.focus}</p><PathStrip {...lesson.path} outside />
      <GuessPuzzle lesson={lesson} heading="h2" onGuess={onGuess} primary />
      <div className="home-actions"><a href={`#/practice/${lesson.caseId}`}>예상 없이 실습 열기</a></div>
      <h2>개념</h2><p>{lesson.concept}</p>
      <h2>쉬운 비유</h2><p>{lesson.analogy}</p>
      <h2>확인할 것</h2><ul>{lesson.task.checkpoints.map(point => <li key={point}>{point}</li>)}</ul>
      <div className="learning-source"><p>출처: NetProof 모델 의미론 · 연습용 네트워크</p><ul>{lesson.sources.map(source => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul><p>계산 결과는 실제 장비 동작을 보장하지 않습니다.</p></div>
      <OtherTopics current={lessonId} />
    </article>
  </div>;
  return <div className="learning-page">
    <div className="home-section-head"><div><p className="home-eyebrow">학습실 · 연습용 네트워크</p><h1>질문에서 시작해, 근거를 확인하세요.</h1><p>개념을 살펴보고 내 예상과 NetProof 계산을 비교해 보세요.</p></div><a href="#/home">홈으로</a></div>
    <nav className="learning-cards" aria-label="학습 주제">{LESSONS.map(item => <a className="learning-card" href={`#/learn/${item.id}`} key={item.id} aria-label={`${item.title} 실습 열기`}>
      <span className="home-eyebrow">{item.category}</span><span className="learning-card-title">{item.title}</span><PathStrip {...item.path} size="small" /><span>{item.task.question}</span><span>실습 열기 →</span>
    </a>)}</nav>
    <p className="home-description">확인할 주제를 선택하세요. 연습용 네트워크로 실습합니다.</p>
    <section><h2>수업 도구</h2><nav className="learning-cards" aria-label="수업 도구">{TOOL_TOPICS.map(item => <a className="learning-card" href={`#/learn/${item.id}`} key={item.id}>
      <span className="home-eyebrow">{item.category}</span><span className="learning-card-title">{item.title}</span><span>{item.description}</span><span>공부하기 →</span>
    </a>)}</nav></section>
  </div>;
}
