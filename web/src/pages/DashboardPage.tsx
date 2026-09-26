import { useEffect, useState } from "react";
import { api, message } from "../api";
import { ResultBadge } from "../components/Badges";
import type { Dashboard } from "../types";

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
        <p className="hint">검토자가 확인한 사례만 “실제와 일치”에 셉니다. 범위 밖과 범위 안은 따로 셉니다(plan.md 완료 기준).</p>
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
      <section className="panel" aria-labelledby="miss-title">
        <h2 id="miss-title">엔진이 실제와 다른 사례</h2>
        <p className="hint">엔진이나 판정 규칙을 고칠 후보입니다. 원인을 찾으면 기준 사례로 내보내 테스트에 넣습니다.</p>
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
