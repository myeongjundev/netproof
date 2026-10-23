import responses from "./testFixtures/breach-responses.json";
import { BREACHES, breachById, breachDraft, breachImport, breachSpec, deviceStatus, guessText, keepText, layoutFlow, reach, reachMarks, serviceName, splitChanges } from "./breach";
import { toNetwork } from "./draft";
import type { ChangeImpact, PolicyMatrix } from "./types";

const scenario = breachById("breach-01")!;
const start = responses.start as unknown as PolicyMatrix;
const narrowed = responses.narrowed as unknown as PolicyMatrix;
const impact = responses.narrowedImpact as unknown as ChangeImpact;

describe("실습 데이터와 입력", () => {
  it("실습은 하나이고, 처음 구성은 데이터 그대로 판정기 입력이 된다", () => {
    expect(BREACHES.map((item) => item.id)).toEqual(["breach-01"]);
    const draft = breachDraft(scenario);
    // 호스트의 acl_in·acl_out: null은 기존 toNetwork 정규화다. null만 걷어 내면 데이터와 같다.
    expect(JSON.parse(JSON.stringify(toNetwork(draft), (_, value) => value ?? undefined))).toEqual(scenario.network);
    expect(draft.claim.expected).toBeNull();
    expect(breachDraft(scenario).devices).not.toBe(breachDraft(scenario).devices);
  });

  it("판정기로 가져가기는 복사본과 실습 이름이 든 안내를 만든다", () => {
    const draft = breachDraft(scenario);
    const imported = breachImport("breach-01", draft);
    expect(imported.draft).toEqual(draft); expect(imported.draft).not.toBe(draft);
    expect(imported.label).toBe("학교 홈페이지가 뚫렸다면 구성을 판정기로 가져왔습니다");
  });

  it("검사 명세는 왕복·실습 서비스·지켜야 할 서비스를 PASS 의도로 담는다", () => {
    const spec = breachSpec(scenario);
    expect(spec.mode).toBe("session");
    expect(spec.services.map((service) => service.label)).toEqual(["SSH", "HTTP", "HTTPS", "MySQL", "Ping"]);
    expect(spec.intents).toEqual(scenario.keep.map(({ src, dst, service }) => ({ src, dst, service, expect: "PASS" })));
  });

  it("그림 배치 흐름은 뚫린 장비 주소에서 시작하고, 장비가 없으면 빈 주소다", () => {
    const draft = breachDraft(scenario);
    expect(layoutFlow(draft, "WEB").src).toBe("10.0.10.10");
    expect(layoutFlow({ ...draft, devices: draft.devices.filter((device) => device.id !== "WEB") }, "WEB").src).toBe("");
  });
});

describe("피해 범위 (엔진 응답을 고르고 묶기만 한다)", () => {
  it("처음 구성: WEB에서 3곳·15개 서비스에 닿는다", () => {
    const result = reach(start, "WEB")!;
    expect(result.found).toBe(true);
    expect(result.targets.map((target) => [target.device, target.cells.map((cell) => serviceName(scenario.services, cell.service))])).toEqual([
      ["ADMIN", ["SSH", "HTTP", "HTTPS", "MySQL", "Ping"]],
      ["DB", ["SSH", "HTTP", "HTTPS", "MySQL", "Ping"]],
      ["OUTSIDE", ["SSH", "HTTP", "HTTPS", "MySQL", "Ping"]],
    ]);
    expect(result.count).toBe(15);
    expect(result.others).toEqual(["ADMIN", "DB", "OUTSIDE"]);
    expect(result.undecided).toEqual([]);
  });

  it("규칙을 줄인 구성: DB SSH 하나만 남고 나머지 장비는 안 닿음이다", () => {
    const result = reach(narrowed, "WEB")!;
    expect(result.count).toBe(1);
    expect(result.others.map((device) => deviceStatus(result, device))).toEqual(["safe", "reach", "safe"]);
    expect(reachMarks("WEB", result)).toEqual({
      WEB: { tone: "breached", text: "뚫림" },
      ADMIN: { tone: "safe", text: "안 닿음" },
      DB: { tone: "reach", text: "닿음 · 서비스 1개" },
      OUTSIDE: { tone: "safe", text: "안 닿음" },
    });
  });

  it("판정 불가 칸은 안 닿음에 넣지 않고 따로 센다", () => {
    const odd = structuredClone(narrowed);
    const cell = odd.cells.find((item) => item.src === "10.0.10.10" && item.dst === "203.0.113.10")!;
    cell.result = "UNSUPPORTED";
    const result = reach(odd, "WEB")!;
    expect(result.undecided).toHaveLength(1);
    expect(deviceStatus(result, "OUTSIDE")).toBe("unknown");
    expect(reachMarks("WEB", result).OUTSIDE).toEqual({ tone: "unknown", text: "판정 불가" });
  });

  it("뚫린 장비가 구성에 없으면 찾지 못했다고만 알리고, 계산이 없거나 INVALID면 null이다", () => {
    expect(reach(start, "NOPE")).toMatchObject({ found: false, targets: [], count: 0 });
    expect(reach(null, "WEB")).toBeNull();
    expect(reach({ ...start, status: "INVALID" }, "WEB")).toBeNull();
    expect(reach({ ...start, limit_exceeded: true }, "WEB")).toBeNull();
  });
});

describe("예상·지켜야 할 서비스·바뀐 통신", () => {
  it.each([
    [undefined, "reach", "예상 안 함"], ["reach", "reach", "예상과 같음"], ["safe", "reach", "예상과 다름"],
    ["safe", "safe", "예상과 같음"], ["reach", "unknown", "계산이 판정하지 못함"], ["reach", undefined, "처음 구성을 계산하지 못함"],
  ] as const)("예상 %s · 계산 %s → %s", (guess, status, text) => expect(guessText(guess, status)).toBe(text));

  it("지켜야 할 서비스는 엔진 policy로만 말한다", () => {
    const cells = narrowed.cells;
    const find = (src: string, dst: string, service: string) => cells.find((cell) => cell.src === src && cell.dst === dst && cell.service === service);
    expect(keepText(find("10.0.10.10", "10.0.20.10", "tcp/3306"))).toBe("막혔습니다");
    expect(keepText(find("203.0.113.10", "10.0.10.10", "tcp/443"))).toBe("그대로 됩니다");
    expect(keepText(undefined)).toBe("판정 불가");
  });

  it("바뀐 통신은 엔진 분류 그대로, 출발 장비가 뚫린 장비인지만 나눈다", () => {
    const { attacker, others } = splitChanges(impact, "WEB");
    expect(attacker).toHaveLength(14);
    expect(attacker.every((change) => change.kind === "closed" && change.src_device === "WEB")).toBe(true);
    expect(others).toEqual([]);
    expect(splitChanges(null, "WEB")).toEqual({ attacker: [], others: [] });
  });
});
