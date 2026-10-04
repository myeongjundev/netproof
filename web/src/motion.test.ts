import { scrollTo } from "./motion";

afterEach(() => vi.unstubAllGlobals());
it.each([true, false])("움직임 줄이기=%s에 맞춰 안내 스크롤한다", reduced => {
  const matchMedia = vi.fn(() => ({ matches: reduced }));
  vi.stubGlobal("window", { matchMedia });
  const element = { scrollIntoView: vi.fn() };
  scrollTo(element as unknown as HTMLElement);
  expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: reduced ? "auto" : "smooth", block: "start" });
});
it("ACL 줄 보기의 가운데 정렬을 유지한다", () => {
  vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
  const element = { scrollIntoView: vi.fn() };
  scrollTo(element as unknown as HTMLElement, "center");
  expect(element.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
});
