import responses from "./testFixtures/breach-responses.json";
import { breachById, breachDraft } from "./breach";
import { toNetwork } from "./draft";
import { configChanges, remediationReport, reportMarkdown } from "./remediation";
import type { Network, PolicyMatrix } from "./types";

const scenario = breachById("breach-01")!;
const start = responses.start as unknown as PolicyMatrix;
const narrowed = responses.narrowed as unknown as PolicyMatrix;
const first = toNetwork(breachDraft(scenario));
// fixture narrowed와 같은 구성: em1 규칙을 "WEB → DB SSH 통과" 하나로 줄였다(시험용 변형, 해법 아님).
function withEm1(network: Network, rules: NonNullable<Network["devices"][number]["interfaces"][number]["rules_in"]>): Network {
  const next = structuredClone(network);
  next.devices.find((device) => device.stateful)!.interfaces.find((iface) => iface.name === "em1")!.rules_in = rules;
  return next;
}
const narrowedNetwork = withEm1(first, [{ action: "pass", proto: "tcp", src: "10.0.10.10", dst: "10.0.20.10", dst_port: "22" }]);

describe("수복 기록: 처음 닿던 연결을 지금 결과와 대조한다(엔진 칸만 고르고 센다)", () => {
  it("규칙을 줄인 구성: 처음 15개 가운데 막힘 14 · 아직 닿음 1, 새로 닿음 없음", () => {
    const report = remediationReport(scenario, start, narrowed, first, narrowedNetwork)!;
    expect(report.before).toEqual({ places: 3, services: 15 });
    expect(report.after).toEqual({ places: 1, services: 1 });
    expect(report.counts).toEqual({ blocked: 14, open: 1, unknown: 0, missing: 0, opened: 0 });
    expect(report.recheck.filter((row) => row.status === "open")).toEqual([{ device: "DB", dst: "10.0.20.10", service: "SSH", status: "open" }]);
    expect(report.keeps).toEqual([
      { label: "OUTSIDE → WEB · HTTPS", text: "그대로 됩니다" },
      { label: "WEB → DB · MySQL", text: "막혔습니다" },
      { label: "ADMIN → WEB · SSH", text: "그대로 됩니다" },
    ]);
    expect(report.engineVersion).toBe(narrowed.engine_version);
  });

  it("판정 불가 칸은 막힘으로 세지 않는다", () => {
    const odd = structuredClone(narrowed);
    odd.cells.find((cell) => cell.src === "10.0.10.10" && cell.dst === "203.0.113.10" && cell.service === "tcp/22")!.result = "UNSUPPORTED";
    expect(remediationReport(scenario, start, odd, first, narrowedNetwork)!.counts).toEqual({ blocked: 13, open: 1, unknown: 1, missing: 0, opened: 0 });
  });

  it("처음엔 안 닿다가 지금 닿는 곳은 새로 닿음으로 따로 적는다", () => {
    const report = remediationReport(scenario, narrowed, start, narrowedNetwork, first)!;
    expect(report.counts).toEqual({ blocked: 0, open: 1, unknown: 0, missing: 0, opened: 14 });
    expect(report.opened.every((row) => row.status === "opened")).toBe(true);
  });

  it("목적지 주소가 지금 구성에 없으면 막힘이 아니라 주소 사라짐으로 센다", () => {
    const gone = { ...structuredClone(narrowed) };
    gone.cells = gone.cells.filter((cell) => cell.dst !== "10.0.20.10");
    gone.endpoints = gone.endpoints.filter((endpoint) => endpoint.ip !== "10.0.20.10");
    expect(remediationReport(scenario, start, gone, first, narrowedNetwork)!.counts).toEqual({ blocked: 10, open: 0, unknown: 0, missing: 5, opened: 0 });
  });

  it("계산이 없거나 INVALID이거나 뚫린 장비가 없으면 기록을 만들지 않는다", () => {
    expect(remediationReport(scenario, null, narrowed, first, narrowedNetwork)).toBeNull();
    expect(remediationReport(scenario, start, { ...narrowed, status: "INVALID" }, first, narrowedNetwork)).toBeNull();
    const noWeb = { ...narrowed, endpoints: narrowed.endpoints.filter((endpoint) => endpoint.device !== "WEB") };
    expect(remediationReport(scenario, start, noWeb, first, narrowedNetwork)).toBeNull();
  });
});

describe("바꾼 구성은 입력 그대로 적는다(엔진을 다시 부르지 않음)", () => {
  it("방화벽 규칙 변경은 처음·지금 목록을 한 줄 표기로 나란히 적고, 같으면 비운다", () => {
    expect(configChanges(first, first)).toEqual([]);
    expect(configChanges(first, narrowedNetwork)).toEqual([
      "FW em1 들어오는 규칙 — 처음: 통과 · 모든 프로토콜 · any → any / 지금: 통과 · TCP · 10.0.10.10 → 10.0.20.10:22",
    ]);
    expect(configChanges(first, withEm1(first, []))).toEqual(["FW em1 들어오는 규칙 — 처음: 통과 · 모든 프로토콜 · any → any / 지금: 규칙 없음"]);
  });

  it("인터페이스 삭제·주소·기본 동작·게이트웨이·장비 추가와 삭제를 적는다", () => {
    const third = toNetwork(breachDraft(breachById("breach-03")!));
    const fixed = structuredClone(third);
    const log = fixed.devices.find((device) => device.id === "LOG")!;
    log.interfaces = log.interfaces.filter((iface) => iface.name !== "eth1");
    expect(configChanges(third, fixed)).toEqual(["LOG eth1 10.0.10.20/24 삭제"]);
    const other = structuredClone(first);
    other.devices.find((device) => device.stateful)!.interfaces.find((iface) => iface.name === "em2")!.default_in = "pass";
    other.devices.find((device) => device.id === "DB")!.interfaces[0].ip = "10.0.20.11/24";
    other.devices.find((device) => device.id === "DB")!.gateway = "10.0.20.254";
    other.devices = other.devices.filter((device) => device.id !== "ADMIN");
    other.devices.push({ id: "NEW", kind: "host", interfaces: [{ name: "eth0", ip: "10.0.40.10/24" }], gateway: "10.0.40.1" });
    expect(configChanges(first, other)).toEqual([
      "DB eth0 주소 10.0.20.10/24 → 10.0.20.11/24",
      "DB 기본 게이트웨이 10.0.20.1 → 10.0.20.254",
      "ADMIN 장비 삭제",
      "FW em2 기본 동작 차단 → 통과",
      "NEW 장비 추가",
    ]);
  });
});

describe("Markdown 기록", () => {
  it("같은 데이터에서 만들고, 모델 계산임과 한계를 적으며 점수·정답·완료·안전 판정을 쓰지 않는다", () => {
    const report = remediationReport(scenario, start, narrowed, first, narrowedNetwork)!;
    const text = reportMarkdown(report);
    expect(text.split("\n")[0]).toBe("# 학교 홈페이지가 뚫렸다면 · 수복 기록");
    expect(text).toContain("합성 구성 · NetProof 모델 계산(실제 장비 결과 아님)");
    expect(text).toContain("처음 구성 3곳 · 서비스 15개 → 지금 1곳 · 서비스 1개");
    expect(text).toContain("처음 닿던 15개 가운데 막힘 14 · 아직 닿음 1 · 판정 불가 0 · 주소 사라짐 0, 새로 닿음 0");
    expect(text).toContain("| DB(10.0.20.10) | SSH | 아직 닿음 |");
    expect(text).toContain("- WEB → DB · MySQL: 막혔습니다");
    expect(text).toContain("- FW em1 들어오는 규칙 — 처음:");
    expect(text).toContain("실제 장비 결과나 운영 효과가 아닙니다");
    expect(text).toContain("검사하지 않은 통신은 알 수 없습니다");
    expect(text).not.toMatch(/점수|정답|완료|축하|안전합니다/);
  });
});
