import { parseRoute } from "./router";

it("공유 링크와 빈 공유 주소를 구분한다", () => {
  expect(parseRoute("#/s/abc")).toEqual({ page: "judge", share: "abc" });
  expect(parseRoute("#/s/")).toEqual({ page: "missing" });
});

it("해시 주소를 화면으로 바꾼다", () => {
  expect(parseRoute("")).toEqual({ page: "home" });
  expect(parseRoute("#/")).toEqual({ page: "judge" });
  expect(parseRoute("#/login")).toEqual({ page: "login" });
  expect(parseRoute("#/cases")).toEqual({ page: "cases" });
  expect(parseRoute("#/matrix")).toEqual({ page: "matrix" });
  expect(parseRoute("#/cases/12")).toEqual({ page: "case", id: 12 });
  expect(parseRoute("#/dashboard")).toEqual({ page: "dashboard" });
  expect(parseRoute("#/settings")).toEqual({ page: "settings" });
});

it("빈 해시와 명시적인 홈, 학습실을 구분한다", () => {
  expect(parseRoute("#")).toEqual({ page: "home" });
  expect(parseRoute("#/home")).toEqual({ page: "home" });
  expect(parseRoute("#/learn")).toEqual({ page: "learn" });
  for (const lessonId of ["https-acl", "round-trip", "output-acl"]) {
    expect(parseRoute(`#/learn/${lessonId}`)).toEqual({ page: "learn", lessonId });
  }
});

it("실습 주소는 판정기와 분리된 전용 실습 화면이다", () => {
  for (const caseId of ["synthetic-01", "synthetic-02", "synthetic-03"]) {
    expect(parseRoute(`#/practice/${caseId}`)).toEqual({ page: "practice", caseId });
  }
});

it.each(["#/learn/unknown", "#/learn/", "#/learn/https-acl?x=1", "#/practice/synthetic-04", "#/practice/", "#/home?x=1"])("알 수 없는 학습 주소 %s는 없는 화면이다", (hash) => {
  expect(parseRoute(hash)).toEqual({ page: "missing" });
});

it("사례 목록에만 질의 문자열을 허용한다", () => {
  expect(parseRoute("#/cases?actual=PASS")).toEqual({ page: "cases", query: "actual=PASS" });
  expect(parseRoute("#/cases?")).toEqual({ page: "cases", query: "" });
  expect(parseRoute("#/dashboard?actual=PASS")).toEqual({ page: "missing" });
  expect(parseRoute("#/cases/12?actual=PASS")).toEqual({ page: "missing" });
});

it.each(["graylog", "wazuh"])("도구 %s도 학습실 주소로 연다", lessonId => {
  expect(parseRoute(`#/learn/${lessonId}`)).toEqual({ page: "learn", lessonId });
  expect(parseRoute(`#/learn/${lessonId}?x=1`)).toEqual({ page: "missing" });
});

it("모르는 주소나 숫자가 아닌 사례 번호는 없는 화면이다", () => {
  expect(parseRoute("#/cases/abc")).toEqual({ page: "missing" });
  expect(parseRoute("#/admin")).toEqual({ page: "missing" });
});
