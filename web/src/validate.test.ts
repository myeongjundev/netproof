import { describe, expect, it } from "vitest";
import { cidrProblem, ipv4Problem, portProblem, ruleAddressProblem } from "./validate";
describe("방화벽 규칙 칸 안내", () => {
  it.each(["any", " any ", "10.20.20.5", "10.10.10.0/24", "0.0.0.0/0"])("주소 %s는 안내 없음", (v) => expect(ruleAddressProblem(v)).toBeNull());
  it.each(["", " "])("빈 주소는 any를 안내한다 %#", (v) => expect(ruleAddressProblem(v)).toBe("비우면 계산할 수 없습니다. 모든 주소는 any로 적습니다"));
  it.each(["ANY", "LAN_net", "10.0.0.256", "１０.０.０.１", "10.0.0.0/33"])("주소 %s는 형식을 안내한다", (v) =>
    expect(ruleAddressProblem(v)).toBe("any, 주소(10.20.20.5), 주소/길이(10.10.10.0/24) 중 하나로 적습니다. 별칭은 계산하지 못합니다"));
  it.each(["", " ", "any", "1", "443", "0443", "65535", " 22 "])("포트 %s는 안내 없음", (v) => expect(portProblem(v)).toBeNull());
  it.each(["0", "000", "65536", "99999", "22-80", "https", "４４３", "9".repeat(5000)])("포트 %s는 형식을 안내한다", (v) =>
    expect(portProblem(v)).toBe("1~65535 숫자 하나 또는 any로 적습니다(비우면 제한 없음)"));
});
describe("nonblocking ASCII address hints", () => {
  it.each([
    "", " ", "\t\n", "0.0.0.0", "255.255.255.255", "10.10.10.10",
    " 1.2.3.4", "1.2.3.4 ", "1.2.3.4\n",
  ])("accepts IPv4 %s", (v) => expect(ipv4Problem(v)).toBeNull());
  it.each([
    "", " ", "\t\n", "0.0.0.0/0", "255.255.255.255/32", "10.10.10.1/24",
    "1.2.3.4/01", "1.2.3.4/08", " 1.2.3.4/24", "1.2.3.4/24 ",
  ])("accepts CIDR %s", (v) => expect(cidrProblem(v)).toBeNull());
  it.each([
    "10.10.10.256", "1.2.3", "1.2.3.4.5", "010.0.0.1", "10.0.0.01",
    "001.002.003.004", "00.0.0.0", "000.0.0.0", "1. 2.3.4", "1.2.3.4\n.5",
    "１０.０.０.１", "١٠.٠.٠.١", "9".repeat(5000),
  ])("rejects malformed IPv4 %#", (v) => expect(ipv4Problem(v)).toBe("IPv4 주소 형식이 아닙니다(예: 10.10.10.10)"));
  it.each([
    "1.2.3.4/33", "1.2.3.4", "1.2.3.4/", "1.2.3.4/0/1", "256.0.0.1/24",
    "1.2.3.010/24", "010.0.0.1/08", "1.2.3.4 /24", "1.2.3.4/ 24",
    "1.2.3.4/３２", "1.2.3.4/٣٢", "1.2.3.4/" + "9".repeat(5000),
  ])("rejects malformed CIDR %#", (v) => expect(cidrProblem(v)).toBe("주소/길이 형식이 아닙니다(예: 10.10.10.1/24)"));
});
