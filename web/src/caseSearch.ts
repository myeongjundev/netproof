import type { CaseFilters, CasePage } from "./types";

export const emptyCaseFilters: CaseFilters = {
  q: "", mine: false, result: "", comparison: "", confirmed: "", source: "",
};

export function caseSearchParams(filters: CaseFilters, page: number): string {
  const params = new URLSearchParams({ page: String(page), per_page: "20" });
  if (filters.mine) params.set("mine", "1");
  for (const key of ["q", "result", "comparison", "confirmed", "source"] as const) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }
  return params.toString();
}

/** effect cleanup 이후 도착한 성공·오류 응답은 모두 버린다. */
export function loadCasePage(
  request: () => Promise<CasePage>,
  onData: (data: CasePage) => void,
  onError: (error: unknown) => void,
): () => void {
  let active = true;
  request().then(
    (data) => { if (active) onData(data); },
    (error) => { if (active) onError(error); },
  );
  return () => { active = false; };
}
