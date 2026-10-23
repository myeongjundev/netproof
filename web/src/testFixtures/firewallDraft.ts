import { blankDraft } from "../draft";

/** R1을 상태 추적 방화벽으로 바꾼 입력. 라우터일 때의 ACL 연결(acl_in)이 남아 있다. 시험 전용. */
export function firewallDraft(stateful = true) {
  const draft = blankDraft();
  draft.acls = [{ name: "101", text: "permit ip any any" }];
  draft.devices[1] = { ...draft.devices[1], stateful, interfaces: [
    { name: "g0/0", ip: "10.10.10.1/24", acl_in: "101", default_in: "block", rules_in: [
      { action: "pass", proto: "tcp", src: " any ", dst: "10.20.20.5", src_port: "", dst_port: " 443 " }] },
    { name: "g0/1", ip: "10.20.20.1/24" },
  ] };
  return draft;
}
