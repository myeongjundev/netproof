import { describe, expect, it, vi } from "vitest";
import { caseSearchParams, emptyCaseFilters, loadCasePage, parseCaseFilters } from "./caseSearch";
import { api } from "./api";
import type { CasePage } from "./types";

describe("사례 검색 요청", () => {
  it("주소 필터를 왕복하고 허용 밖 값은 버린다", () => {
    const filters = { ...emptyCaseFilters, q: "A&B + %_", mine: true, result: "DENY" as const,
      comparison: "DISAGREE" as const, confirmed: "1" as const, source: "nmap" as const,
      actual: "PASS" as const, actual_mismatch: "1" as const, claim_kind: "ai" as const, claim_expected: "DENY" as const };
    expect(parseCaseFilters(caseSearchParams(filters, 3))).toEqual(filters);
    expect(parseCaseFilters("actual=wat&claim_kind=human&claim_expected=none&mine=0&result=unknown&other=1")).toEqual(emptyCaseFilters);
    expect(parseCaseFilters("")).toEqual(emptyCaseFilters);
    expect(parseCaseFilters("actual=none&claim_kind=none")).toEqual({ ...emptyCaseFilters, actual: "none", claim_kind: "none" });
  });
  it("주소 검색어는 코드포인트 100자로 제한한다", () => {
    expect(parseCaseFilters(new URLSearchParams({ q: "😀".repeat(101) }).toString()).q).toBe("😀".repeat(100));
  });
  it.each(["", "0", "x", "true", "１"])("실제 불일치 필터의 허용 밖 값 %s는 무시한다", value => {
    expect(parseCaseFilters(`actual_mismatch=${value}`)).toEqual(emptyCaseFilters);
  });
  it("실제 불일치와 받은 답 비교는 서로 다른 요청 조건이다", () => {
    const filters = parseCaseFilters("mine=1&actual_mismatch=1&comparison=AGREE");
    const params = new URLSearchParams(caseSearchParams(filters, 2));
    expect(params.get("actual_mismatch")).toBe("1");
    expect(params.get("comparison")).toBe("AGREE");
    expect(params.get("mine")).toBe("1");
    expect(new URLSearchParams(caseSearchParams(emptyCaseFilters, 1)).has("actual_mismatch")).toBe(false);
  });
  it("검색어 특수문자를 보존하고 필터와 페이지를 함께 전송한다", () => {
    const params = new URLSearchParams(caseSearchParams({
      ...emptyCaseFilters, q: "  A&B + 10.0_%/  ", mine: true, result: "DENY",
      comparison: "DISAGREE", confirmed: "0", source: "none",
    }, 3));
    expect(Object.fromEntries(params)).toEqual({ page: "3", per_page: "20", q: "A&B + 10.0_%/",
      mine: "1", result: "DENY", comparison: "DISAGREE", confirmed: "0", source: "none" });
  });
  it("API가 페이지 응답을 받아 새 목록에 전달한다", async () => {
    const response = { items: [], total: 0, page: 1, per_page: 20, pages: 1 };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => response });
    vi.stubGlobal("fetch", fetchMock);
    try {
      expect(await api.searchCases(emptyCaseFilters, 1)).toEqual(response);
      expect(fetchMock.mock.calls[0][0]).toBe("/api/cases?page=1&per_page=20");
    } finally { vi.unstubAllGlobals(); }
  });
  it("새 응답 뒤에 도착하는 오래된 성공 응답을 버린다", async () => {
    let resolveOld!: (data: CasePage) => void;
    let resolveNew!: (data: CasePage) => void;
    const oldRequest = new Promise<CasePage>((resolve) => { resolveOld = resolve; });
    const newRequest = new Promise<CasePage>((resolve) => { resolveNew = resolve; });
    const onData = vi.fn();
    const onError = vi.fn();
    const cleanupOld = loadCasePage(() => oldRequest, onData, onError);
    cleanupOld(); // CasesPage 조건 변경 시 React effect cleanup
    loadCasePage(() => newRequest, onData, onError);
    const latest = { items: [], total: 7, page: 1, per_page: 20, pages: 1 };
    resolveNew(latest);
    await newRequest;
    resolveOld({ ...latest, total: 99 });
    await oldRequest;
    expect(onData.mock.calls).toEqual([[latest]]);
    expect(onError).not.toHaveBeenCalled();
  });
  it("cleanup 뒤의 오류를 버리고 현재 요청의 오류만 표시한다", async () => {
    let rejectOld!: (error: Error) => void;
    const oldRequest = new Promise<CasePage>((_, reject) => { rejectOld = reject; });
    const onData = vi.fn();
    const onError = vi.fn();
    const cleanupOld = loadCasePage(() => oldRequest, onData, onError);
    cleanupOld();
    rejectOld(new Error("old error"));
    await oldRequest.catch(() => {});
    expect(onError).not.toHaveBeenCalled();
    const currentError = new Error("retry me");
    const current = Promise.reject<CasePage>(currentError);
    loadCasePage(() => current, onData, onError);
    await current.catch(() => {});
    expect(onError.mock.calls).toEqual([[currentError]]);
    expect(onData).not.toHaveBeenCalled();
  });
});
