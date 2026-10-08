import { useEffect, useState } from "react";
import { api, message } from "../api";
import { ActualBadge, ComparisonBadge, ResultBadge } from "../components/Badges";
import { emptyCaseFilters, loadCasePage, parseCaseFilters } from "../caseSearch";
import { appliedFilterText, comparisonCaption } from "../caseView";
import { useRoute } from "../router";
import type { CaseFilters, CasePage } from "../types";

export function CasesPage() {
  const route = useRoute();
  const query = route.page === "cases" ? route.query ?? "" : "";
  const [filters, setFilters] = useState<CaseFilters>(() => parseCaseFilters(query));
  const [search, setSearch] = useState(() => parseCaseFilters(query).q);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CasePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  function changeFilters(patch: Partial<CaseFilters>) {
    setFilters((current) => ({ ...current, q: search.trim(), ...patch }));
    setPage(1);
  }

  useEffect(() => {
    const next = parseCaseFilters(query);
    setFilters(next); setSearch(next.q); setPage(1);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    return loadCasePage(
      () => api.searchCases(filters, page),
      (result) => { setData(result); setLoading(false); },
      (e) => { setError(message(e)); setLoading(false); },
    );
  }, [filters, page, retry]);

  const appliedConditions = appliedFilterText(filters);
  // 검색어와 바깥의 '내 사례만'은 접히는 선택 필터 개수에서 제외한다.
  const appliedSelectCount = appliedFilterText({ ...filters, mine: false }).length;

  return (
    <section className="panel" aria-labelledby="cases-title">
      <div className="panel-head">
        <h2 id="cases-title">사례 게시판</h2>
        <label className="chip-toggle">
          <input type="checkbox" checked={filters.mine} onChange={(e) => changeFilters({ mine: e.target.checked })} />
          내 사례만
        </label>
      </div>
      <p className="hint">
        새 사례는 <a href="#/learn">실습</a>이나 <a href="#/">판정기</a>에서 판정한 뒤 저장합니다. 실제 결과를 적으면 검토자가 확인합니다.
      </p>
      <nav aria-label="다시 살펴보기" className="row-actions" style={{ flexWrap: "wrap" }}>
        <a href="#/cases?mine=1&claim_kind=self&comparison=DISAGREE">내 예상과 계산이 달랐던 내 사례</a>
        <a href="#/cases?mine=1&actual_mismatch=1">계산과 실제 결과가 다른 내 사례</a>
        <a href="#/cases?mine=1&actual=none">실제 결과를 아직 안 적은 내 사례</a>
      </nav>
      <form className="case-search" role="search" onSubmit={(e) => { e.preventDefault(); changeFilters({ q: search.trim() }); }}>
        <label htmlFor="case-query">사례 검색
          <input id="case-query" type="search" value={search} maxLength={100}
            placeholder="제목 · 작성자 · 출발지/목적지 IP" onChange={(e) => {
              setSearch(e.target.value);
              if (!e.target.value.trim() && filters.q !== "") changeFilters({ q: "" });
            }} />
        </label>
        <button type="submit">검색</button>
        <button type="button" className="secondary" onClick={() => {
          setSearch(""); setFilters({ ...emptyCaseFilters }); setPage(1);
        }}>초기화</button>
      </form>
      <details className="case-filter-disclosure">
        <summary>필터 (적용 {appliedSelectCount}개)</summary>
        <div className="case-filters">
          <label>판정<select value={filters.result} onChange={(e) => changeFilters({ result: e.target.value as CaseFilters["result"] })}>
            <option value="">전체</option><option value="PASS">통과</option><option value="DENY">차단</option>
            <option value="UNSUPPORTED">지원 범위 밖</option><option value="INVALID">잘못된 입력</option>
          </select></label>
          <label>받은 답과 판정<select value={filters.comparison} onChange={(e) => changeFilters({ comparison: e.target.value as CaseFilters["comparison"] })}>
            <option value="">전체</option><option value="AGREE">일치</option><option value="DISAGREE">불일치</option>
            <option value="NOT_COMPARABLE">비교 불가</option><option value="NO_CLAIM">받은 답 없음</option>
          </select></label>
          <label>검토 확인<select value={filters.confirmed} onChange={(e) => changeFilters({ confirmed: e.target.value as CaseFilters["confirmed"] })}>
            <option value="">전체</option><option value="1">확인됨</option><option value="0">미확인</option>
          </select></label>
          <label>실제 결과 출처<select value={filters.source} onChange={(e) => changeFilters({ source: e.target.value as CaseFilters["source"] })}>
            <option value="">전체</option><option value="nmap">Nmap</option><option value="ping">ping</option>
            <option value="device">장비</option><option value="other">기타</option><option value="none">출처 없음</option>
          </select></label>
          <label>실제 결과<select value={filters.actual} onChange={(e) => changeFilters({ actual: e.target.value as CaseFilters["actual"] })}>
            <option value="">전체</option><option value="PASS">통과</option><option value="DENY">차단</option><option value="none">미정</option>
          </select></label>
          <label>계산과 실제 결과<select value={filters.actual_mismatch} onChange={(e) => changeFilters({ actual_mismatch: e.target.value as CaseFilters["actual_mismatch"] })}>
            <option value="">전체</option><option value="1">다름</option>
          </select></label>
          <label>받은 답 종류<select value={filters.claim_kind} onChange={(e) => changeFilters({ claim_kind: e.target.value as CaseFilters["claim_kind"] })}>
            <option value="">전체</option><option value="ai">AI 답</option><option value="self">사람 예상</option><option value="none">종류 없음</option>
          </select></label>
          <label>받은 답<select value={filters.claim_expected} onChange={(e) => changeFilters({ claim_expected: e.target.value as CaseFilters["claim_expected"] })}>
            <option value="">전체</option><option value="PASS">통과</option><option value="DENY">차단</option>
          </select></label>
        </div>
      </details>
      {error && <div role="alert"><p className="error">{error}</p><button type="button" onClick={() => setRetry((n) => n + 1)}>다시 시도</button></div>}
      <div aria-live="polite">
        {loading && <p className="hint">불러오는 중…</p>}
        {filters.q && <p className="hint">적용한 검색어: {filters.q}</p>}
        {appliedConditions.length > 0 && <p className="hint">적용한 조건: {appliedConditions.join(" · ")}</p>}
        {data && (loading || error) && <p className="hint">아래는 이전 조회 결과입니다.</p>}
        {data && <p className="hint">검색 결과 {data.total}개 · 페이지당 {data.per_page}개</p>}
        {data?.items.length === 0 && <p className="hint">조건에 맞는 사례가 없습니다. 검색 조건을 바꾸거나 판정기에서 사례를 저장해 보세요.</p>}
      </div>
      {data && data.items.length > 0 && (
        <table className={`board${loading ? " loading" : ""}`} aria-busy={loading}>
          <thead>
            <tr>
              <th scope="col">사례</th>
              <th scope="col">NetProof 계산</th>
              <th scope="col">받은 답 비교</th>
              <th scope="col">실제 결과·확인</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <a href={`#/cases/${item.id}`}>{item.title}</a>
                  <span className="meta">
                    #{item.id} · {item.author} · {new Date(item.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </td>
                <td data-label="NetProof 계산">
                  <ResultBadge result={item.result} />
                </td>
                <td data-label="받은 답 비교">
                  <span className="meta">{comparisonCaption(item)}</span>
                  <ComparisonBadge comparison={item.comparison} />
                </td>
                <td data-label="실제 결과·확인">
                  <ActualBadge item={item} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && <nav className="case-pagination" aria-label="사례 페이지">
        <button type="button" className="secondary" disabled={loading || !!error || data.page <= 1} onClick={() => setPage(data.page - 1)}>이전</button>
        <span aria-live="polite">{data.page} / {data.pages} 페이지</span>
        <button type="button" className="secondary" disabled={loading || !!error || data.page >= data.pages} onClick={() => setPage(data.page + 1)}>다음</button>
      </nav>}
    </section>
  );
}
