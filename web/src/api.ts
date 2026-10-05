import type { CaseDetail, CaseFilters, CaseItem, CasePage, CaseSummary, Claim, Dashboard, Flow, Network, User, Verdict } from "./types";
import { caseSearchParams } from "./caseSearch";
import type { MatrixSpec, PolicyMatrix } from "./types";
import type { Observation } from "./types";
import type { AclAudit } from "./types";
import type { Suggestion, SuggestionTarget } from "./types";
import type { ChangeImpact, MatrixService } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// 로그인한 세션에 묶인 CSRF 토큰. 상태를 바꾸는 요청마다 붙인다(서버 auth.py 참고).
let csrfToken: string | null = null;

/** Matrix limit errors use engine problems instead of the server's detail field. */
export function errorDetail(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  if ("detail" in data) return String(data.detail);
  if ("problems" in data && Array.isArray(data.problems)) {
    const problems = data.problems.filter((value): value is string => typeof value === "string");
    if (problems.length) return problems.join(" · ");
  }
  return null;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "X-NetProof": "1" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const detail = errorDetail(data);
    throw new ApiError(response.status, detail ?? `요청 실패(${response.status})`);
  }
  if (data && typeof data === "object" && "csrf" in data) csrfToken = (data as { csrf: string | null }).csrf;
  return data as T;
}

type Session = { user: User | null; csrf: string | null };

export const api = {
  me: () => call<Session>("GET", "/api/auth/me"),
  login: (nickname: string, password: string) => call<Session>("POST", "/api/auth/login", { nickname, password }),
  register: (nickname: string, password: string) => call<Session>("POST", "/api/auth/register", { nickname, password }),
  logout: async () => {
    await call("POST", "/api/auth/logout");
    csrfToken = null;
  },
  verify: (network: Network, flow: Flow, claim: Claim) =>
    call<Verdict>("POST", "/api/verify", { network, flow, claim: claim.expected ? claim : null }),
  policyMatrix: (network: Network, spec: MatrixSpec) => call<PolicyMatrix>("POST", "/api/policy-matrix", { network, spec }),
  changeImpact: (before: Network, after: Network, flow: Flow, services: MatrixService[]) =>
    call<ChangeImpact>("POST", "/api/change-impact", { before, after, flow, services }),
  aclAudit: (network: Network) => call<AclAudit>("POST", "/api/acl-audit", { network }),
  suggest: (network: Network, flow: Flow, target: SuggestionTarget) => call<Suggestion>("POST", "/api/suggest", { network, flow, target }),
  examples: () => call<CaseItem[]>("GET", "/api/examples"),
  observe: (text: string, flow: Flow) => call<Observation>("POST", "/api/observe", { text, flow }),
  cases: (mine: boolean) => call<CaseSummary[]>("GET", mine ? "/api/cases?mine=1" : "/api/cases"),
  searchCases: (filters: CaseFilters, page: number) => call<CasePage>("GET", `/api/cases?${caseSearchParams(filters, page)}`),
  createCase: (title: string, network: Network, flow: Flow, claim: Claim) =>
    call<CaseDetail>("POST", "/api/cases", { title, network, flow, claim: claim.expected ? claim : null }),
  getCase: (id: number) => call<CaseDetail>("GET", `/api/cases/${id}`),
  updateCase: (id: number, patch: Partial<Pick<CaseDetail, "title" | "actual">>) => call<CaseDetail>("PATCH", `/api/cases/${id}`, patch),
  deleteCase: (id: number) => call("DELETE", `/api/cases/${id}`),
  confirm: (id: number) => call<CaseDetail>("POST", `/api/cases/${id}/confirm`),
  unconfirm: (id: number) => call<CaseDetail>("DELETE", `/api/cases/${id}/confirm`),
  exportCase: (id: number) => call<Record<string, unknown>>("GET", `/api/cases/${id}/export`),
  dashboard: () => call<Dashboard>("GET", "/api/dashboard"),
  changePassword: (current_password: string, new_password: string) => call("POST", "/api/auth/password", { current_password, new_password }),
  changeNickname: (nickname: string) => call<{ user: User }>("POST", "/api/auth/nickname", { nickname }),
  logoutAll: async () => {
    await call("POST", "/api/auth/logout-all");
    csrfToken = null;
  },
  deleteAccount: async (current_password: string) => {
    await call("POST", "/api/auth/delete-account", { current_password });
    csrfToken = null;
  },
};

export function message(error: unknown): string {
  return error instanceof Error ? error.message : "요청에 실패했습니다";
}
