import { toNetwork } from "./draft";
import type { CaseItem, Draft } from "./types";

const MAX_BYTES = 64 * 1024;

export class ShareError extends Error {
  constructor(message = "공유 링크를 읽을 수 없습니다. 링크를 확인해 주세요") {
    super(message);
    this.name = "ShareError";
  }
}

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const optionalText = (value: unknown) => value == null || typeof value === "string";

function validate(value: unknown): CaseItem {
  if (!object(value) || !object(value.network) || !Array.isArray(value.network.devices) ||
      !object(value.flow) || typeof value.flow.src !== "string" || typeof value.flow.dst !== "string") {
    throw new ShareError("공유 링크의 구성 또는 흐름 형식이 올바르지 않습니다");
  }
  const { network, flow } = value;
  const devices = network.devices as unknown[];
  const acls = network.acls === undefined ? {} : network.acls;
  // 편집기가 읽는 값의 모양만 검사한다. 주소·프로토콜·규칙의 유효성은 엔진이 판단한다.
  if (!object(acls) || !Object.values(acls).every((lines) => Array.isArray(lines) && lines.every((line) => typeof line === "string")) ||
      !devices.every((device: unknown) => object(device) && typeof device.id === "string" &&
        typeof device.kind === "string" && optionalText(device.gateway) && Array.isArray(device.interfaces) &&
        device.interfaces.every((iface: unknown) => object(iface) && typeof iface.name === "string" && typeof iface.ip === "string" &&
          optionalText(iface.acl_in) && optionalText(iface.acl_out)) &&
        (device.routes == null || (Array.isArray(device.routes) && device.routes.every((route: unknown) =>
          object(route) && typeof route.prefix === "string" && optionalText(route.next_hop) && optionalText(route.out_if))))) ||
      !optionalText(flow.proto) || !optionalText(flow.mode) ||
      (flow.dst_port != null && typeof flow.dst_port !== "number") ||
      (value.claim != null && (!object(value.claim) || !optionalText(value.claim.expected) ||
        !optionalText(value.claim.source) || !optionalText(value.claim.text) || !optionalText(value.claim.kind)))) {
    throw new ShareError("공유 링크의 입력 형식이 올바르지 않습니다");
  }
  return { id: "shared", source: "", network: { ...network, devices, acls }, flow, claim: value.claim } as unknown as CaseItem;
}

export async function encodeShare(draft: Draft): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify({ network: toNetwork(draft), flow: draft.flow, claim: draft.claim }));
    if (bytes.length > MAX_BYTES) throw new ShareError("공유할 입력이 64KB를 넘습니다");
    const compressed = await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer();
    const binary = Array.from(new Uint8Array(compressed), (byte) => String.fromCharCode(byte)).join("");
    return "1." + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (error) {
    throw error instanceof ShareError ? error : new ShareError("공유 링크를 만들 수 없습니다. 브라우저를 확인해 주세요");
  }
}

export async function decodeShare(payload: string): Promise<CaseItem> {
  try {
    if (!payload.startsWith("1.")) throw new ShareError("지원하지 않는 공유 링크 버전입니다");
    const encoded = payload.slice(2);
    if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length % 4 === 1) throw new ShareError();
    const binary = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    if (btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") !== encoded) throw new ShareError();
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let size = 0;
    let json = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new ShareError("공유 링크의 입력이 64KB를 넘습니다");
        json += decoder.decode(value, { stream: true });
      }
      json += decoder.decode();
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    return validate(JSON.parse(json));
  } catch (error) {
    throw error instanceof ShareError ? error : new ShareError();
  }
}
