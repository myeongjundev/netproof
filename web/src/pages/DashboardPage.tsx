import { useEffect, useState } from "react";
import { api, message } from "../api";
import { ResultBadge } from "../components/Badges";
import type { Dashboard } from "../types";
import { caseSearchParams } from "../caseSearch";
import { axisNames, confusionCellFilters, confusionCells } from "../confusion";

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
