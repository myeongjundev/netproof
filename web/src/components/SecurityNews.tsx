import { useEffect, useState } from "react";
import { api, message } from "../api";
import type { SecurityNews } from "../types";

export type NewsState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: SecurityNews };

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/** 사례 게시판의 네트워크 장비 보안 소식(docs/v1.1-design.md §C). 서버가 받아 둔 CISA KEV만 보인다. */
export function SecurityNewsPanel({ state, onRetry }: { state: NewsState; onRetry: () => void }) {
  return <details className="security-news" open>
    <summary>네트워크 장비 보안 소식 · CISA KEV</summary>
    {state.status === "loading" && <p role="status">불러오는 중…</p>}
    {state.status === "error" && <div><p role="alert" className="error">{state.message}</p>
      <button type="button" className="ghost small" onClick={onRetry}>다시 불러오기</button></div>}
    {state.status === "ready" && <>
      {state.data.stale && <p className="previous-result">새로 받지 못해 이전에 받은 자료를 보여 줍니다.</p>}
      <ol className="news-list">{state.data.items.map((item) => <li key={item.cve}>
        <p><strong>{item.vendor} {item.product}</strong> · {item.date_added} 지정{item.ransomware && <span className="tag news-ransomware">랜섬웨어 악용 알려짐</span>}</p>
        <p>{item.name}</p>
        <p className="hint" lang="en">{item.description}</p>
        <a href={item.nvd} {...external}>{item.cve} 자세히(NVD) ↗</a>
      </li>)}</ol>
      <p className="hint">실제로 공격에 쓰였다고 CISA가 확인한 취약점입니다. 이런 장비를 쓰고 있다면 패치와 접근 통제가 우선입니다. NetProof는 이 취약점을 계산하지 않습니다.</p>
      <p className="hint">출처: <a href={state.data.catalog_url} {...external}>CISA KEV ↗</a> · 카탈로그 판 {state.data.catalog_version} · 받은 시각 {new Date(state.data.fetched_at).toLocaleString("ko-KR")} · 네트워크·보안 장비 {state.data.vendors.length}개 업체 {state.data.total}건 가운데 최신 {state.data.items.length}건 · 설명은 영어 원문입니다.</p>
    </>}
  </details>;
}

export function SecurityNewsSection() {
  const [state, setState] = useState<NewsState>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ status: "loading" });
    api.securityNews().then(
      (data) => { if (live) setState({ status: "ready", data }); },
      (error) => { if (live) setState({ status: "error", message: message(error) }); },
    );
    return () => { live = false; };
  }, [retry]);
  return <SecurityNewsPanel state={state} onRetry={() => setRetry((count) => count + 1)} />;
}
