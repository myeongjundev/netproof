import type { CaseDetail, CaseItem, CaseSummary, Claim, Dashboard, Flow, Network, User, Verdict } from "./types";

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
    const detail = data && typeof data === "object" && "detail" in data ? String((data as { detail: unknown }).detail) : null;
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
  examples: () => call<CaseItem[]>("GET", "/api/examples"),
  cases: (mine: boolean) => call<CaseSummary[]>("GET", mine ? "/api/cases?mine=1" : "/api/cases"),
  createCase: (title: string, network: Network, flow: Flow, claim: Claim) =>
    call<CaseDetail>("POST", "/api/cases", { title, network, flow, claim: claim.expected ? claim : null }),
  getCase: (id: number) => call<CaseDetail>("GET", `/api/cases/${id}`),
  updateCase: (id: number, patch: Partial<Pick<CaseDetail, "title" | "actual">>) => call<CaseDetail>("PATCH", `/api/cases/${id}`, patch),
  deleteCase: (id: number) => call("DELETE", `/api/cases/${id}`),
  confirm: (id: number) => call<CaseDetail>("POST", `/api/cases/${id}/confirm`),
  unconfirm: (id: number) => call<CaseDetail>("DELETE", `/api/cases/${id}/confirm`),
  exportCase: (id: number) => call<Record<string, unknown>>("GET", `/api/cases/${id}/export`),
  dashboard: () => call<Dashboard>("GET", "/api/dashboard"),
};

export function message(error: unknown): string {
  return error instanceof Error ? error.message : "요청에 실패했습니다";
}
