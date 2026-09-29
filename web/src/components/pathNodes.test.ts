import { describe, expect, it } from "vitest";
import type { Hop } from "../types";
import { pathNodes } from "./ResultPanel";

const hop = (device: string, step: Hop["step"], result: Hop["result"], in_if: string | null, out_if: string | null): Hop => ({
  device, step, result, detail: "", in_if, out_if, rule: null, rule_seq: null,
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
