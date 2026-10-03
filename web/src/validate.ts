const IPV4_MESSAGE = "IPv4 주소 형식이 아닙니다(예: 10.10.10.10)";
const CIDR_MESSAGE = "주소/길이 형식이 아닙니다(예: 10.10.10.1/24)";

// ASCII only, bounded before comparing strings. No numeric conversion of user input.
function ipv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => {
    if (!/^[0-9]{1,3}$/.test(part) || part.trim() !== part) return false;
    const digits = part.replace(/^0+(?=[0-9])/, "");
    return digits.length < 3 || digits <= "255";
  });
}
export function ipv4Problem(value: string): string | null {
  return value === "" || ipv4(value) ? null : IPV4_MESSAGE;
}
export function cidrProblem(value: string): string | null {
  if (value === "") return null;
  const parts = value.split("/");
  if (parts.length !== 2 || !ipv4(parts[0]) || !/^[0-9]{1,2}$/.test(parts[1]) || parts[1].trim() !== parts[1]) return CIDR_MESSAGE;
  const digits = parts[1].replace(/^0+(?=[0-9])/, "");
  return digits.length < 2 || digits <= "32" ? null : CIDR_MESSAGE;
}
