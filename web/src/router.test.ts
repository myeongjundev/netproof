import { parseRoute } from "./router";

it("해시 주소를 화면으로 바꾼다", () => {
  expect(parseRoute("")).toEqual({ page: "judge" });
  expect(parseRoute("#/")).toEqual({ page: "judge" });
  expect(parseRoute("#/login")).toEqual({ page: "login" });
  expect(parseRoute("#/cases")).toEqual({ page: "cases" });
  expect(parseRoute("#/cases/12")).toEqual({ page: "case", id: 12 });
  expect(parseRoute("#/dashboard")).toEqual({ page: "dashboard" });
});

it("모르는 주소나 숫자가 아닌 사례 번호는 없는 화면이다", () => {
  expect(parseRoute("#/cases/abc")).toEqual({ page: "missing" });
  expect(parseRoute("#/admin")).toEqual({ page: "missing" });
});
