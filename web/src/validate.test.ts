import { describe, expect, it } from "vitest";
import { cidrProblem, ipv4Problem } from "./validate";
describe("nonblocking ASCII address hints", () => {
  it.each(["", "0.0.0.0", "255.255.255.255", "10.10.10.10", "001.002.003.004"])("accepts IPv4 %s", (v) => expect(ipv4Problem(v)).toBeNull());
  it.each(["", "0.0.0.0/0", "255.255.255.255/32", "10.10.10.1/24", "1.2.3.4/01"])("accepts CIDR %s", (v) => expect(cidrProblem(v)).toBeNull());
  it.each(["10.10.10.256", "1.2.3", "1.2.3.4.5", " 1.2.3.4", "1.2.3.4 ", "１０.０.０.１", "١٠.٠.٠.١", "9".repeat(5000), "1.2.3.4\n"])("rejects malformed IPv4 %#", (v) => expect(ipv4Problem(v)).toBe("IPv4 주소 형식이 아닙니다(예: 10.10.10.10)"));
  it.each(["1.2.3.4/33", "1.2.3.4", "1.2.3.4/", "1.2.3.4/0/1", "256.0.0.1/24", "1.2.3.4/３２", "1.2.3.4/٣٢", " 1.2.3.4/24", "1.2.3.4/24 ", "1.2.3.4/" + "9".repeat(5000)])("rejects malformed CIDR %#", (v) => expect(cidrProblem(v)).toBe("주소/길이 형식이 아닙니다(예: 10.10.10.1/24)"));
});
