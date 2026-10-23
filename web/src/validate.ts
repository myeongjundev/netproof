const IPV4_MESSAGE = "IPv4 주소 형식이 아닙니다(예: 10.10.10.10)";
const CIDR_MESSAGE = "주소/길이 형식이 아닙니다(예: 10.10.10.1/24)";

// ASCII only, bounded before comparing strings. No numeric conversion of user input.
function ipv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => {
    if (!/^[0-9]{1,3}$/.test(part) || part.trim() !== part) return false;
    if (part.length > 1 && part.startsWith("0")) return false;
    return part.length < 3 || part <= "255";
  });
}
export function ipv4Problem(value: string): string | null {
  value = value.trim();
  return value === "" || ipv4(value) ? null : IPV4_MESSAGE;
}
/** 방화벽 규칙의 출발지·목적지. 엔진은 any·IPv4·CIDR만 계산하고 별칭은 판정 불가로 멈춘다. */
export function ruleAddressProblem(value: string): string | null {
  value = value.trim();
  if (value === "") return "비우면 계산할 수 없습니다. 모든 주소는 any로 적습니다";
  return value === "any" || ipv4(value) || (value.includes("/") && cidrProblem(value) === null) ? null
    : "any, 주소(10.20.20.5), 주소/길이(10.10.10.0/24) 중 하나로 적습니다. 별칭은 계산하지 못합니다";
}
export function portProblem(value: string): string | null {
  value = value.trim();
  if (value === "" || value === "any") return null;
  const digits = /^[0-9]{1,5}$/.test(value) ? value.replace(/^0+/, "") : "";
  return digits && (digits.length < 5 || digits <= "65535") ? null : "1~65535 숫자 하나 또는 any로 적습니다(비우면 제한 없음)";
}
export function cidrProblem(value: string): string | null {
  value = value.trim();
  if (value === "") return null;
  const parts = value.split("/");
  if (parts.length !== 2 || !ipv4(parts[0]) || !/^[0-9]{1,2}$/.test(parts[1]) || parts[1].trim() !== parts[1]) return CIDR_MESSAGE;
  const digits = parts[1].replace(/^0+(?=[0-9])/, "");
  return digits.length < 2 || digits <= "32" ? null : CIDR_MESSAGE;
}
