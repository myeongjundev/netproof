import { useEffect, useState } from "react";
import { api, message } from "../api";
import { ActualBadge, ComparisonBadge, ResultBadge } from "../components/Badges";
import type { CaseSummary } from "../types";

export function CasesPage() {
  const [mine, setMine] = useState(false);
  const [items, setItems] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    api.cases(mine).then(setItems, (e) => setError(message(e)));
  }, [mine]);

  return (
    <section className="panel" aria-labelledby="cases-title">
      <div className="panel-head">
        <h2 id="cases-title">사례 게시판</h2>
        <label className="chip-toggle">
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          내 사례만
        </label>
      </div>
      <p className="hint">
        새 사례는 <a href="#/">판정기</a>에서 판정한 뒤 저장합니다. 실제 결과를 적으면 검토자가 확인합니다.
      </p>
      {error && <p className="error">{error}</p>}
      {items === null && !error && <p className="hint">불러오는 중…</p>}
      {items?.length === 0 && <p className="hint">아직 사례가 없습니다. 판정기에서 첫 사례를 저장해 보세요.</p>}
      {items && items.length > 0 && (
        <table className="board">
          <thead>
            <tr>
              <th scope="col">사례</th>
              <th scope="col">판정</th>
              <th scope="col">받은 답과 판정</th>
              <th scope="col">실제 결과</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <a href={`#/cases/${item.id}`}>{item.title}</a>
                  <span className="meta">
                    {item.author} · {new Date(item.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </td>
                <td data-label="판정">
                  <ResultBadge result={item.result} />
                </td>
                <td data-label="받은 답과 판정">
                  <ComparisonBadge comparison={item.comparison} />
                </td>
                <td data-label="실제 결과">
                  <ActualBadge item={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
