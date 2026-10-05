"""승인 n8n 예시를 실제 익명 verify API와 대조한다."""
import copy
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from uuid import UUID

import netproof_engine
import pytest

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = json.loads((ROOT / "examples/n8n/netproof-verify.workflow.json").read_text(encoding="utf-8"))
REQUEST = json.loads((ROOT / "examples/n8n/request.json").read_text(encoding="utf-8"))
NAMES = ["NetProof 검증 요청 받기", "NetProof /api/verify", "결과 문장 만들기", "결과 돌려주기"]

# 설계 fbfc5a0의 승인 값. 과제별 HANDOFF 교체와 무관하게 고정한다.
APPROVED_HTTP = json.loads(r'''{
  "method": "POST",
  "url": "http://host.docker.internal:4820/api/verify",
  "sendHeaders": true,
  "specifyHeaders": "keypair",
  "headerParameters": {
    "parameters": [
      {
        "name": "X-NetProof",
        "value": "1"
      }
    ]
  },
  "sendBody": true,
  "contentType": "json",
  "specifyBody": "json",
  "jsonBody": "={{ JSON.stringify({ network: $json.body.network, flow: $json.body.flow, claim: { kind: 'ai', expected: $json.body.ai_expected, source: 'n8n', text: $json.body.ai_text || '' } }) }}",
  "options": {}
}''')
APPROVED_CODE = '''
// NetProof가 준 comparison을 그대로 쓴다. 이 노드는 문장만 만든다.
const TITLE = { PASS: '통과', DENY: '막힘', INVALID: '입력 오류', UNSUPPORTED: '판정 불가' };
const request = $('NetProof 검증 요청 받기').first().json.body;
return $input.all().map(({ json: verdict }) => {
  const answer = `AI 답(${TITLE[request.ai_expected] ?? '없음'})과`;
  const message = verdict.comparison === 'AGREE' ? `= ${answer} NetProof 계산이 같습니다`
    : verdict.comparison === 'DISAGREE' ? `≠ ${answer} NetProof 계산(${TITLE[verdict.result]})이 다릅니다`
    : `NetProof 계산 ${TITLE[verdict.result] ?? verdict.result}`;
  return { json: { message, comparison: verdict.comparison, result: verdict.result, reason: verdict.reason,
    problems: verdict.problems, notify: verdict.comparison === 'DISAGREE' } };
});
'''.strip()


def body(request):
    return {"network": request["network"], "flow": request["flow"],
            "claim": {"kind": "ai", "expected": request.get("ai_expected"),
                      "source": "n8n", "text": request.get("ai_text") or ""}}


def test_engine_comes_from_this_worktree():
    path = Path(netproof_engine.__file__).resolve()
    print(f"Imported engine: {path}")
    assert path == ROOT / "engine/src/netproof_engine/__init__.py"


@pytest.mark.parametrize("expected,comparison", [("PASS", "DISAGREE"), ("DENY", "AGREE"), (None, "NO_CLAIM")])
def test_request_against_real_verify(api, expected, comparison):
    request = copy.deepcopy(REQUEST)
    if expected is None:
        request.pop("ai_expected")
    else:
        request["ai_expected"] = expected
    response = api.post("/api/verify", body(request))
    assert response.status_code == 200
    verdict = response.get_json()
    assert verdict["result"] == "DENY"
    assert verdict["comparison"] == comparison
    assert verdict["problems"] == []


def test_topic_example_is_the_actual_api_response(api):
    response = api.post("/api/verify", body(REQUEST))
    assert response.status_code == 200
    verdict = response.get_json()
    text = (ROOT / "web/src/toolTopics.ts").read_text(encoding="utf-8").split('"id": "n8n"')[1]
    literal = re.search(r'"text": ("(?:\\.|[^"\\])*")', text).group(1)
    example = json.loads(json.loads(literal))
    assert example == {
        "message": "≠ AI 답(통과)과 NetProof 계산(막힘)이 다릅니다",
        "comparison": verdict["comparison"], "result": verdict["result"],
        "reason": verdict["reason"], "problems": verdict["problems"], "notify": True,
    }


def test_request_only_contains_approved_synthetic_data():
    case = json.loads((ROOT / "cases/synthetic-01-https-acl.json").read_text(encoding="utf-8"))
    assert REQUEST == {"network": case["network"], "flow": case["flow"], "ai_expected": "PASS",
                       "ai_text": "PC1에서 SRV의 HTTPS(TCP 443)에 접속할 수 있습니다."}


def test_workflow_nodes_connections_and_approved_parameters():
    assert set(WORKFLOW) == {"name", "nodes", "connections", "settings", "pinData"}
    assert WORKFLOW["name"] == "NetProof AI 답 검증"
    assert WORKFLOW["settings"] == {"executionOrder": "v1"}
    assert WORKFLOW["pinData"] == {}
    nodes = WORKFLOW["nodes"]
    assert [node["name"] for node in nodes] == NAMES
    assert [node["type"] for node in nodes] == ["n8n-nodes-base.webhook", "n8n-nodes-base.httpRequest", "n8n-nodes-base.code", "n8n-nodes-base.respondToWebhook"]
    assert [node["typeVersion"] for node in nodes] == [2, 4.2, 2, 1.1]
    assert [node["position"] for node in nodes] == [[0, 0], [240, 0], [480, 0], [720, 0]]
    assert len({node["id"] for node in nodes}) == 4
    for node in nodes:
        assert UUID(node["id"]).version == 4
        assert set(node) == {"parameters", "id", "name", "type", "typeVersion", "position"} | ({"webhookId"} if node is nodes[0] else set())
    assert UUID(nodes[0]["webhookId"]).version == 4
    assert nodes[0]["parameters"] == {"httpMethod": "POST", "path": "netproof-verify", "responseMode": "responseNode", "options": {}}
    assert WORKFLOW["connections"] == {name: {"main": [[{"node": NAMES[i + 1], "type": "main", "index": 0}]]} for i, name in enumerate(NAMES[:-1])}
    assert nodes[1]["parameters"] == APPROVED_HTTP
    assert nodes[2]["parameters"] == {"jsCode": APPROVED_CODE}
    assert nodes[3]["parameters"] == {"respondWith": "firstIncomingItem", "options": {}}

    def keys(value):
        if isinstance(value, dict):
            for key, item in value.items():
                yield key.lower()
                yield from keys(item)
        elif isinstance(value, list):
            for item in value:
                yield from keys(item)
    assert not set(keys(WORKFLOW)) & {"credentials", "password", "token", "apikey", "api_key", "authorization"}
    assert not set(keys(REQUEST)) & {"credentials", "password", "token", "apikey", "api_key", "authorization"}


def test_f29_app_fixture_ignores_security_log_environment(monkeypatch, tmp_path, request):
    log = tmp_path / "must-not-exist" / "security.jsonl"
    monkeypatch.setenv("NETPROOF_SECURITY_LOG", str(log))
    monkeypatch.setenv("NETPROOF_SYSLOG", "invalid-address")
    app = request.getfixturevalue("app")
    assert app.config["SECURITY_LOG"] is None
    assert app.config["SECURITY_SYSLOG"] is None
    assert not log.parent.exists()


def test_f29_autouse_removes_inherited_log_environment_from_child():
    # app fixture를 쓰지 않는 QA 도구와 그 자식 프로세스까지 보호한다.
    names = ("NETPROOF_SECURITY_LOG", "NETPROOF_SYSLOG")
    assert all(name not in os.environ for name in names)
    child = subprocess.run(
        [sys.executable, "-c",
         "import json, os; print(json.dumps([name in os.environ for name in "
         "('NETPROOF_SECURITY_LOG', 'NETPROOF_SYSLOG')]))"],
        check=True, capture_output=True, text=True,
    )
    assert json.loads(child.stdout) == [False, False]
