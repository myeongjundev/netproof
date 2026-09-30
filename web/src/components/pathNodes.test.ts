import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Hop, Trace, Verdict } from "../types";
import { pathNodes, ResultPanel, unreachedTarget } from "./ResultPanel";

const hop = (device: string, step: Hop["step"], result: Hop["result"], in_if: string | null, out_if: string | null): Hop => ({
  device, step, result, detail: "", in_if, out_if, rule: null, rule_seq: null,
});

const target = { device: "SRV", interface: "eth0", ip: "10.20.20.5" };
const blocked: Trace = {
  delivered: false, reason: "ACL", target,
  hops: [hop("PC1", "send", "ok", null, "eth0"), hop("R1", "acl_in", "drop", "g0/0", null)],
};
const returnBlocked: Trace = {
  delivered: false, reason: "경로 없음",
  target: { device: "PC1", interface: "eth0", ip: "10.10.10.10" },
  hops: [hop("SRV2", "send", "ok", null, "eth0"), hop("R2", "route", "drop", "g0/0", null)],
};

describe("unreachedTarget", () => {
  it("R1에서 막히면 SRV를 표시한다", () => {
    expect(unreachedTarget(blocked)).toEqual(target);
  });
  it("복귀가 R2에서 막히면 PC1을 표시한다", () => {
    expect(unreachedTarget(returnBlocked)).toEqual(returnBlocked.target);
  });
  it("도착한 경로에는 칸을 더하지 않는다", () => {
    expect(unreachedTarget({ ...blocked, delivered: true })).toBeNull();
  });
  it("target 없는 옛 판정에는 칸을 더하지 않는다", () => {
    const { target: _, ...legacy } = blocked;
    expect(unreachedTarget(legacy)).toBeNull();
  });
  it("목적지 장비에서 막히면 같은 장비를 반복하지 않는다", () => {
    expect(unreachedTarget({ ...blocked, target: { ...target, device: "R1" } })).toBeNull();
  });
});

function render(forward: Trace, backward: Trace | null = null) {
  const verdict: Verdict = {
    result: "DENY", reason: "막힘", problems: [], forward, return: backward, decisive: null, comparison: "NO_CLAIM",
  };
  return renderToStaticMarkup(createElement(ResultPanel, {
    verdict, claim: { expected: null, source: "", text: "" }, stale: false, error: null, loading: false,
  }));
}

it("그림과 읽을 수 있는 목록에 목적지를 표시하고 null 복귀 경로는 그리지 않는다", () => {
  const html = render(blocked);
  expect(html).toContain('class="node unreached"');
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain("eth0 · 10.20.20.5");
  expect(html).toContain("도달 못 함");
  expect(html).toContain("목적지 SRV eth0(10.20.20.5)에는 도달하지 못했습니다");
  expect(html).not.toContain("돌아오는 길");
});

it("정방향이 도착하면 복귀 경로에만 도달 못 한 목적지를 표시한다", () => {
  const html = render({ ...blocked, delivered: true }, returnBlocked);
  expect(html.match(/class="node unreached"/g)).toHaveLength(1);
  expect(html).toContain("목적지 PC1 eth0(10.10.10.10)에는 도달하지 못했습니다");
  expect(html).not.toContain("목적지 SRV eth0(10.20.20.5)에는 도달하지 못했습니다");
});

it("옛 판정과 목적지에서 막힌 판정은 추가 표시 없이 렌더링된다", () => {
  for (const trace of [{ ...blocked, target: undefined }, { ...blocked, target: { ...target, device: "R1" } }]) {
    const html = render(trace);
    expect(html).not.toContain("unreached");
    expect(html).not.toContain("도달하지 못했습니다");
  }
});

describe("pathNodes", () => {
  it("merges steps on the same device and marks where it dropped", () => {
    // 예시 03: R1에서 경로를 찾은 뒤 나가는 ACL에서 막힘
    const nodes = pathNodes([
      hop("PC1", "send", "ok", null, "eth0"),
      hop("R1", "route", "ok", "g0/0", "g0/1"),
      hop("R1", "acl_out", "drop", null, "g0/1"),
    ]);
    expect(nodes.map((n) => [n.device, n.ifs, n.drop?.step ?? null])).toEqual([
      ["PC1", "eth0", null],
      ["R1", "g0/0 → g0/1", "acl_out"],
    ]);
  });
});
