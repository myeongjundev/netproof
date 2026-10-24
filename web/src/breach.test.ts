import responses from "./testFixtures/breach-responses.json";
import { BREACHES, breachById, breachDraft, breachImport, breachSpec, cellFlow, chainMarks, deviceStatus, freshCells, guessText, keepText, layoutFlow, reach, reachMarks, serviceName, splitChanges } from "./breach";
import { toNetwork } from "./draft";
import type { ChangeImpact, PolicyMatrix } from "./types";

const scenario = breachById("breach-01")!;
const start = responses.start as unknown as PolicyMatrix;
const narrowed = responses.narrowed as unknown as PolicyMatrix;
const impact = responses.narrowedImpact as unknown as ChangeImpact;
const adminNarrowed = responses.adminNarrowed as unknown as PolicyMatrix;

describe("실습 데이터와 입력", () => {
  it("실습은 학교 망의 두 장면이고 id는 겹치지 않는다", () => {
    expect(BREACHES.map((item) => item.id)).toEqual(["breach-01", "breach-02"]);
    expect(BREACHES.map((item) => item.breached)).toEqual(["WEB", "ADMIN"]);
  });

  it.each(BREACHES)("$id: 처음 구성은 데이터 그대로 판정기 입력이 되고, 뚫린 장비·지켜야 할 서비스는 구성 안에 있다", (item) => {
    const draft = breachDraft(item);
    // 호스트의 acl_in·acl_out: null은 기존 toNetwork 정규화다. null만 걷어 내면 데이터와 같다.
    expect(JSON.parse(JSON.stringify(toNetwork(draft), (_, value) => value ?? undefined))).toEqual(item.network);
    expect(draft.claim.expected).toBeNull();
    expect(breachDraft(item).devices).not.toBe(breachDraft(item).devices);
    expect(layoutFlow(draft, item.breached).src).not.toBe("");
    const hosts = item.network.devices.filter((device) => device.kind === "host").flatMap((device) => device.interfaces.map((iface) => iface.ip.split("/")[0]));
    for (const keep of item.keep) { expect(hosts).toContain(keep.src); expect(hosts).toContain(keep.dst); expect(cellFlow(item, keep).mode).toBe("session"); }
    expect(Object.keys(item.roles).sort()).toEqual(item.network.devices.map((device) => device.id).sort());
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

  it("서비스 이름이 비었거나 없으면 키를 보인다", () => {
    expect(serviceName([{ proto: "tcp", dst_port: 8080, label: "" }], "tcp/8080")).toBe("tcp/8080");
    expect(serviceName([{ proto: "tcp", dst_port: 8080 }], "tcp/8080")).toBe("tcp/8080");
    expect(serviceName(scenario.services, "tcp/3306")).toBe("MySQL");
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

describe("한 단계 더 가정 (2차 확산, 같은 응답에서 고르기만 한다)", () => {
  it("이미 뚫린 장비는 목적지에서 뺀다: 처음 구성의 ADMIN은 DB·OUTSIDE에만 닿고 WEB은 목록에 없다", () => {
    const second = reach(start, "ADMIN", ["WEB"])!;
    expect(second.others).toEqual(["DB", "OUTSIDE"]);
    expect(second.targets.map((target) => target.device)).toEqual(["DB", "OUTSIDE"]);
    expect(second.count).toBe(10);
    expect(second.targets.flatMap((target) => target.cells).every((cell) => cell.dst !== "10.0.10.10")).toBe(true);
  });

  it("처음 구성에서는 WEB이 이미 모두 닿으므로 ADMIN을 더 가정해도 새로 닿는 서비스가 없다", () => {
    expect(freshCells(reach(start, "WEB")!, reach(start, "ADMIN", ["WEB"])!)).toEqual([]);
  });

  it("관리자 장면에서 em3을 SSH 하나로 줄여도, WEB을 더 가정하면 DB MySQL이 새로 닿는다", () => {
    const first = reach(adminNarrowed, "ADMIN")!, second = reach(adminNarrowed, "WEB", ["ADMIN"])!;
    expect(first.targets.map((target) => [target.device, target.cells.map((cell) => cell.service)])).toEqual([["WEB", ["tcp/22"]]]);
    const fresh = freshCells(first, second);
    expect(fresh.map((cell) => [cell.dst, cell.service, cell.expect])).toEqual([["10.0.20.10", "tcp/3306", "PASS"]]);
    expect(chainMarks("ADMIN", "WEB", second, fresh)).toEqual({
      ADMIN: { tone: "breached", text: "처음 뚫림" },
      WEB: { tone: "assumed", text: "뚫렸다고 가정" },
      DB: { tone: "reach", text: "닿음 · 서비스 1개 · 새로 1개" },
      OUTSIDE: { tone: "safe", text: "안 닿음" },
    });
  });

  it("새로 닿음은 목적지 주소와 서비스로 비교한다: 이미 닿은 장비라도 다른 서비스면 새로 센다", () => {
    const first = reach(adminNarrowed, "ADMIN")!, second = reach(adminNarrowed, "OUTSIDE", ["ADMIN"])!;
    expect(second.targets.map((target) => [target.device, target.cells.map((cell) => cell.service)])).toEqual([["WEB", ["tcp/443"]]]);
    expect(freshCells(first, second).map((cell) => cell.service)).toEqual(["tcp/443"]);
    expect(freshCells(first, first)).toEqual([]);
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
