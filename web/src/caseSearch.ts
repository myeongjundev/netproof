import type { CaseFilters } from "./types";

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
