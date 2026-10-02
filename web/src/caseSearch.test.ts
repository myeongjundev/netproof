import { describe, expect, it, vi } from "vitest";
import { caseSearchParams, emptyCaseFilters } from "./caseSearch";
import { api } from "./api";

describe("사례 검색 요청", () => {
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
});
