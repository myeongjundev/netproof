import { parseRoute } from "./router";

it("공유 링크와 빈 공유 주소를 구분한다", () => {
  expect(parseRoute("#/s/abc")).toEqual({ page: "judge", share: "abc" });
  expect(parseRoute("#/s/")).toEqual({ page: "missing" });
});

it("해시 주소를 화면으로 바꾼다", () => {
  expect(parseRoute("")).toEqual({ page: "judge" });
  expect(parseRoute("#/")).toEqual({ page: "judge" });
  expect(parseRoute("#/login")).toEqual({ page: "login" });
  expect(parseRoute("#/cases")).toEqual({ page: "cases" });
  expect(parseRoute("#/matrix")).toEqual({ page: "matrix" });
  expect(parseRoute("#/cases/12")).toEqual({ page: "case", id: 12 });
  expect(parseRoute("#/dashboard")).toEqual({ page: "dashboard" });
  expect(parseRoute("#/settings")).toEqual({ page: "settings" });
});

it("모르는 주소나 숫자가 아닌 사례 번호는 없는 화면이다", () => {
  expect(parseRoute("#/cases/abc")).toEqual({ page: "missing" });
  expect(parseRoute("#/admin")).toEqual({ page: "missing" });
});
