import type { CaseFilters, CasePage } from "./types";

export const emptyCaseFilters: CaseFilters = {
  q: "", mine: false, result: "", comparison: "", confirmed: "", source: "",
  actual: "", actual_mismatch: "", claim_kind: "", claim_expected: "",
};

export function caseSearchParams(filters: CaseFilters, page: number): string {
  const params = new URLSearchParams({ page: String(page), per_page: "20" });
  if (filters.mine) params.set("mine", "1");
  for (const key of ["q", "result", "comparison", "confirmed", "source", "actual", "actual_mismatch", "claim_kind", "claim_expected"] as const) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }
  return params.toString();
}

/** 주소의 조건은 허용된 값만 받는다. */
export function parseCaseFilters(query: string): CaseFilters {
  const params = new URLSearchParams(query);
  const filters = { ...emptyCaseFilters, q: Array.from(params.get("q")?.trim() ?? "").slice(0, 100).join(""), mine: params.get("mine") === "1" };
  const allowed = {
    result: ["PASS", "DENY", "UNSUPPORTED", "INVALID"],
    comparison: ["AGREE", "DISAGREE", "NOT_COMPARABLE", "NO_CLAIM"],
    confirmed: ["0", "1"], source: ["nmap", "ping", "device", "other", "none"],
    actual: ["PASS", "DENY", "none"], claim_kind: ["ai", "self", "none"], claim_expected: ["PASS", "DENY"],
    actual_mismatch: ["1"],
  };
  for (const key of Object.keys(allowed) as (keyof typeof allowed)[]) {
    const value = params.get(key) ?? "";
    if (allowed[key].includes(value)) Object.assign(filters, { [key]: value });
  }
  return filters;
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
