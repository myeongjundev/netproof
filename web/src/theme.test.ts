import { afterEach, vi } from "vitest";
import { applyTheme, savedTheme } from "./theme";

afterEach(() => vi.unstubAllGlobals());

it.each([null, "", "unknown"])("저장값 %s는 라이트로 시작한다", value => {
  vi.stubGlobal("localStorage", { getItem: () => value });
  expect(savedTheme()).toBe("light");
});

it.each(["light", "dark", "system"] as const)("%s를 읽고 data-theme와 저장소에 모두 남긴다", theme => {
  const setItem = vi.fn();
  const dataset: Record<string, string> = {};
  vi.stubGlobal("localStorage", { getItem: () => theme, setItem });
  vi.stubGlobal("document", { documentElement: { dataset } });
  expect(savedTheme()).toBe(theme);
  applyTheme(theme);
  expect(dataset.theme).toBe(theme);
  expect(setItem).toHaveBeenCalledWith("netproof-theme", theme);
});

it("저장소 읽기·쓰기 예외여도 라이트로 시작하고 지금 화면에는 적용한다", () => {
  vi.stubGlobal("localStorage", {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
  });
  const dataset: Record<string, string> = {};
  vi.stubGlobal("document", { documentElement: { dataset } });
  expect(savedTheme()).toBe("light");
  expect(() => applyTheme("dark")).not.toThrow();
  expect(dataset.theme).toBe("dark");
});
