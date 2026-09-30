import first from "../../cases/synthetic-01-https-acl.json";
import second from "../../cases/synthetic-02-missing-return-route.json";
import third from "../../cases/synthetic-03-acl-out.json";
import { blankDraft, fromCase, toNetwork } from "./draft";
import { decodeShare, encodeShare, ShareError } from "./share";
import type { CaseItem, Draft } from "./types";

// 별도 구현으로 만든 payload로 디코더를 검증한다.
const pack = async (json: string | Uint8Array) => {
  const bytes = typeof json === "string" ? new TextEncoder().encode(json) : new Uint8Array(json);
  const compressed = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
  return "1." + btoa(Array.from(new Uint8Array(compressed), (byte) => String.fromCharCode(byte)).join(""))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const input = (draft: Draft) => JSON.parse(JSON.stringify({ network: toNetwork(draft), flow: draft.flow, claim: draft.claim }));

it.each([
  ["처음 구성", blankDraft()],
  ...[first, second, third].map((item) => [item.id, fromCase(item as CaseItem)]),
] as [string, Draft][])("%s 입력이 왕복한다", async (_, draft) => {
  const payload = await encodeShare(draft);
  expect(payload).toMatch(/^1\.[A-Za-z0-9_-]+$/);
  const decoded = await decodeShare(payload);
  // toNetwork의 빈 값 정규화를 제외한 실제 판정 입력이 같다.
  expect(input(fromCase(decoded))).toEqual(input(draft));
  expect(decoded.network).toEqual(input(draft).network);
});

it("받은 답을 고르지 않아도 한글·특수문자 메모와 ACL remark가 보존된다", async () => {
  const draft = blankDraft();
  draft.claim = { expected: null, source: "수업 & 실습", text: '받은 답: <script> + / = 🧪\n"통신 가능"' };
  draft.acls = [{ name: "한글 ACL", text: "remark 한글 + / = <>& 🧪\npermit ip any any" }];
  const restored = fromCase(await decodeShare(await encodeShare(draft)));
  expect(restored.claim).toEqual(draft.claim);
  expect(restored.acls).toEqual(draft.acls);
});

const valid = input(blankDraft());
it.each([
  ["버전", "2.abc"],
  ["base64 문자", "1.!!"],
  ["base64 길이", "1.a"],
  ["base64 패딩 비트", "1.Zh"],
  ["압축", "1.YWJj"],
  ["JSON", pack("not json")],
  ["network 없음", pack(JSON.stringify({ flow: valid.flow }))],
  ["flow 없음", pack(JSON.stringify({ network: valid.network }))],
  ["devices 배열 아님", pack(JSON.stringify({ ...valid, network: { devices: {} } }))],
  ["acls 배열", pack(JSON.stringify({ ...valid, network: { devices: [], acls: [] } }))],
  ["ACL 줄 배열 아님", pack(JSON.stringify({ ...valid, network: { devices: [], acls: { test: 123 } } }))],
  ["장비 null", pack(JSON.stringify({ ...valid, network: { devices: [null] } }))],
  ["flow src 숫자", pack(JSON.stringify({ ...valid, flow: { src: 123, dst: "dst" } }))],
  ["메모 객체", pack(JSON.stringify({ ...valid, claim: { text: {} } }))],
  ["UTF-8 오류", pack(new Uint8Array([255]))],
])("%s 오류는 한국어 ShareError다", async (_, payload) => {
  await expect(decodeShare(await payload)).rejects.toBeInstanceOf(ShareError);
  await expect(decodeShare(await payload)).rejects.toThrow(/[가-힣]/);
});

it("생략된 acls는 빈 객체로 채우고 판정 의미는 검사하지 않는다", async () => {
  const item = await decodeShare(await pack(JSON.stringify({ network: { devices: [] }, flow: { src: "잘못된 IP", dst: "목적지", proto: "other" } })));
  expect(item.network.acls).toEqual({});
  expect(fromCase(item).devices).toEqual([]);
  expect(item.flow.proto).toBe("other");
});

it("공백 10MB 압축 링크는 해제 중 64KB 제한으로 거절한다", async () => {
  await expect(decodeShare(await pack(" ".repeat(10 * 1024 * 1024)))).rejects.toThrow("64KB");
});

it("UTF-8 바이트 기준으로 64KB 경계를 적용한다", async () => {
  const json = JSON.stringify(valid);
  const padding = 64 * 1024 - new TextEncoder().encode(json).length;
  await expect(decodeShare(await pack(json + " ".repeat(padding)))).resolves.toMatchObject(valid);
  await expect(decodeShare(await pack(json + " ".repeat(padding + 1)))).rejects.toThrow("64KB");
  const draft = blankDraft();
  draft.claim.text = "한".repeat(23_000);
  await expect(encodeShare(draft)).rejects.toBeInstanceOf(ShareError);
});

it("압축 스트림 끝이 잘린 링크는 ShareError다", async () => {
  const payload = await pack(JSON.stringify(valid));
  await expect(decodeShare(payload.slice(0, -4))).rejects.toBeInstanceOf(ShareError);
});
