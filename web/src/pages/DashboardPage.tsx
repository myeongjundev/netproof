import { useEffect, useState } from "react";
import { api, message } from "../api";
import { ResultBadge } from "../components/Badges";
import type { Dashboard } from "../types";
import { caseSearchParams } from "../caseSearch";
import { axisNames, confusionCellFilters, confusionCells } from "../confusion";
import { causeName, causeRatio } from "../causeView";

function ratio(part: number, whole: number): string {
  return whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`;
}

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dashboard().then(setData, (e) => setError(message(e)));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="hint">불러오는 중…</p>;

  const cards = [
    { label: "모은 사례", value: String(data.total), note: `확인 ${data.confirmed}건` },
    { label: "범위 안 · 실제와 일치", value: `${data.agree} / ${data.confirmed_in_scope}`, note: ratio(data.agree, data.confirmed_in_scope) },
    { label: "범위 밖(판정 불가)", value: String(data.unsupported), note: `전체의 ${ratio(data.unsupported, data.total)}` },
    { label: "AI 답이 실제와 다름", value: `${data.ai_wrong} / ${data.ai_confirmed}`, note: "확인된 AI 답 기준" },
  ];

  return (
    <>
      <section className="panel" aria-labelledby="dash-title">
        <h2 id="dash-title">대시보드</h2>
        <p className="hint">검토자가 확인한 사례만 “실제와 일치”에 셉니다. 범위 밖과 범위 안은 따로 셉니다.</p>
        {data.confirmed === 0 && <p className="notice">아직 확인된 사례가 없습니다. 사례에 실제 결과가 적히면 사례 화면에서 확인해 주세요. 그때부터 일치율이 채워집니다.</p>}
        <div className="metrics">
          {cards.map((card) => (
            <div key={card.label} className="metric">
              <p className="metric-label">{card.label}</p>
              <p className="metric-value">{card.value}</p>
              <p className="metric-note">{card.note}</p>
            </div>
          ))}
        </div>
        {data.invalid > 0 && <p className="hint">입력 오류로 저장된 사례 {data.invalid}건은 어느 쪽에도 세지 않습니다.</p>}
      </section>
      <section className="panel" aria-labelledby="confusion-title">
        <h2 id="confusion-title">오탐·미탐</h2>
        <p className="hint">여기서 양성은 통신 차단(DENY)입니다. 막힌다고 본 것이 맞았는지를 셉니다.</p>
        <p className="hint">오탐은 막힌다고 했는데 실제로 통한 경우, 미탐은 통한다고 했는데 실제로 막힌 경우입니다.</p>
        <p className="hint">검토자가 확인한 실제 결과만 셉니다. 미확인·미정·지원 범위 밖 사례는 분모에서 빠집니다.
          지원 범위 밖 제외는 NetProof 판정에 적용됩니다. AI 답·사람 예상은 답이 있으면 따로 비교합니다.</p>
        <p className="hint">이 표는 판정을 다시 하지 않습니다. 이미 저장된 답·판정·실제 결과를 세기만 합니다.</p>
        <div className="confusion-grid">
          {data.confusion.axes.map((axis) => <div className="confusion-axis" key={axis.axis}>
            <h3>{axisNames[axis.axis]}</h3>
            <table className="confusion-table">
              <caption>{axisNames[axis.axis]} · 확인된 실제 결과 비교</caption>
              <thead><tr><th scope="col">예측 ↓ · 실제 →</th><th scope="col">차단(DENY)</th><th scope="col">통과(PASS)</th></tr></thead>
              <tbody>{(["DENY", "PASS"] as const).map((predicted) => <tr key={predicted}>
                <th scope="row">{predicted === "DENY" ? "차단" : "통과"}<br />({predicted})</th>
                {confusionCells.filter((cell) => cell.predicted === predicted).map((cell) => <td key={cell.key} className={cell.key}>
                  {axis[cell.key] > 0 ? <a href={`#/cases?${caseSearchParams(confusionCellFilters(axis.axis, cell.predicted, cell.actual), 1)}`}
                    aria-label={`${axisNames[axis.axis]} ${predicted === "DENY" ? "차단" : "통과"} · 실제 ${cell.actual === "DENY" ? "차단" : "통과"} · ${cell.name} ${axis[cell.key]}건, 사례 목록으로`}>
                    <strong>{axis[cell.key]}건</strong><span>{cell.name}</span>
                  </a> : <><strong>0건</strong><span>{cell.name}</span></>}
                </td>)}
              </tr>)}</tbody>
            </table>
            <p className="hint">일치 {axis.tp + axis.tn} / {axis.total}건 · {ratio(axis.tp + axis.tn, axis.total)}</p>
            <p className="hint">제외: 미확인 {axis.excluded.not_confirmed} · 미정 {axis.excluded.no_actual} · 예측 없음 {axis.excluded.no_prediction}</p>
          </div>)}
        </div>
      </section>
      <section className="panel" aria-labelledby="causes-title">
        <h2 id="causes-title">가장 많이 틀린 원인 Top 5</h2>
        <p className="hint">받은 답 ≠ NetProof 판정인 사례의 근거를 묶은 집계이며 판정·정답이 아닙니다. 실제 결과·검토 확인을 조건으로 쓰지 않고, 오탐·미탐과 다른 축입니다.</p>
        <p>전체 사례 {data.total}건 · 불일치 {data.causes.disagree_total}건 · 비율 분모 {data.causes.denominator}건</p>
        {data.causes.limited && <p className="notice">최근 {data.causes.limit.toLocaleString("ko-KR")}건만 집계합니다. 비율은 이 사례들 기준입니다.</p>}
        <p className="hint">전체 불일치의 받은 답 종류: AI 답 {data.causes.claim_kinds.ai}건 · 사람 예상 {data.causes.claim_kinds.self}건 · 종류 미정 {data.causes.claim_kinds.unknown}건</p>
        {data.causes.denominator === 0 && <p className="hint">불일치 사례가 없습니다. 비율 —</p>}
        {data.causes.top.length > 0 && <table className="confusion-table">
          <caption>받은 답과 NetProof 판정의 불일치 원인</caption>
          <colgroup><col style={{ width: "46%" }} /><col style={{ width: "16%" }} /><col style={{ width: "16%" }} /><col style={{ width: "22%" }} /></colgroup>
          <thead><tr><th scope="col">원인</th><th scope="col">건수</th><th scope="col">비율</th><th scope="col">복귀</th></tr></thead>
          <tbody>{data.causes.top.map(row => <tr key={row.tag}>
            <th scope="row">{causeName(row.tag)}</th><td>{row.count}건</td>
            <td>{causeRatio(row.count, data.causes.denominator)}</td><td>복귀 {row.return_count}건</td>
          </tr>)}</tbody>
        </table>}
        <p className="hint">그 외 {data.causes.rest}건 · {causeRatio(data.causes.rest, data.causes.denominator)}</p>
        <p className="hint">분류 못 함 {data.causes.other.count}건 · {causeRatio(data.causes.other.count, data.causes.denominator)} · 복귀 {data.causes.other.return_count}건</p>
        <p className="hint">제외: 일치(AGREE) {data.causes.excluded.agree}건 · 답 없음(NO_CLAIM) {data.causes.excluded.no_claim}건 · 비교 불가(NOT_COMPARABLE) {data.causes.excluded.not_comparable}건</p>
      </section>
      <section className="panel" aria-labelledby="miss-title">
        <h2 id="miss-title">엔진이 실제와 다른 사례</h2>
        <p className="hint">엔진이나 판정 규칙을 고칠 후보입니다. 원인을 찾으면 기준 사례로 내보내 테스트에 넣습니다.</p>
        {data.mismatches_total > data.mismatches.length && <p className="hint">
          전체 {data.mismatches_total}건 중 최근 {data.mismatches.length}건입니다. 전체 보기:
          {(["fp", "fn"] as const).map((key) => {
            const cell = confusionCells.find((item) => item.key === key)!;
            return <a key={key} className="mismatch-link" href={`#/cases?${caseSearchParams(confusionCellFilters("engine", cell.predicted, cell.actual), 1)}`}>{cell.name} 사례</a>;
          })}
        </p>}
        {data.mismatches.length === 0 ? (
          <p className="hint">아직 없습니다.</p>
        ) : (
          <ul className="miss">
            {data.mismatches.map((item) => (
              <li key={item.id}>
                <a href={`#/cases/${item.id}`}>{item.title}</a> · 판정 <ResultBadge result={item.result} /> · 실제 {item.actual_result}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
