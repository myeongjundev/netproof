# n8n에서 AI 답을 NetProof로 검증하기

문서 기준: n8n 2.41, 2026-10-05 확인. 예시 노드는 조금 오래된 n8n에서도 가져오도록 오래전부터 있는 typeVersion을 씁니다. 실제 수업 Docker n8n 가져오기·실행은 [수동 QA E](qa-manual.md#e-n8n--수업-docker-환경-수동-확인)에서 사람이 확인합니다.

## 1. 무엇을 하나

요청 → 웹훅 → HTTP Request → 결과 문장 → 웹훅 응답 순서입니다. [예시 워크플로](../examples/n8n/netproof-verify.workflow.json)는 네 노드만 연결합니다. AI API 키나 자격 증명은 없습니다.

맞고 틀림은 NetProof가 준 `comparison`만 씁니다. Code 노드는 문장만 만들며 AI 답과 계산 결과를 직접 비교하지 않습니다. NetProof는 LLM을 부르지 않습니다. AI 답은 밖에서 웹훅 요청에 담겨 옵니다.

## 2. 요청 형식

웹훅 본문:

| 필드 | 값 |
| --- | --- |
| `network` | NetProof 네트워크 구성 객체 |
| `flow` | 검증할 통신 객체 |
| `ai_expected` | AI 답의 `PASS` 또는 `DENY` |
| `ai_text` | AI 답 문장, 선택 |

[request.json](../examples/n8n/request.json)은 합성 사례 synthetic-01의 network·flow와 AI 답(통과)을 담습니다. 실제 장비나 비밀값은 넣지 않습니다.

HTTP Request 노드는 `POST /api/verify`를 부릅니다. 로그인 없이 쓰며 `Content-Type: application/json`과 `X-NetProof: 1` 헤더를 보냅니다. 본문은 다음 대응입니다.

```js
{
  network: $json.body.network,
  flow: $json.body.flow,
  claim: {
    kind: 'ai',
    expected: $json.body.ai_expected,
    source: 'n8n',
    text: $json.body.ai_text || ''
  }
}
```

NetProof는 `result`, `reason`, `problems`, `comparison`과 판정 경로 등을 응답합니다. 예시는 필요한 필드만 웹훅 응답으로 옮깁니다. 받은 본문은 64KB 제한(초과 413)이 있고 구성 크기 제한을 넘으면 422입니다. 판정 자체의 INVALID·UNSUPPORTED와 HTTP 오류를 구분하세요.

## 3. NetProof 켜기 — Docker n8n

저장소 루트에서 서버를 켭니다. bash는 설치된 venv의 bin 경로를 씁니다.

```powershell
.venv/Scripts/python -m flask --app server/wsgi.py run --host 0.0.0.0 --port 4820
```

```bash
.venv/bin/python -m flask --app server/wsgi.py run --host 0.0.0.0 --port 4820
```

**주의:** `0.0.0.0`은 같은 네트워크의 다른 기기에도 열립니다. 믿을 수 있는 네트워크에서만 시연하고 끝나면 Ctrl+C로 끕니다. Windows 방화벽 창에서는 개인 네트워크만 허용합니다. `/api/verify`는 익명 API입니다. 운영 서비스로 노출하는 안내가 아닙니다.

Docker 안의 n8n은 PC의 NetProof에 `host.docker.internal`로 닿습니다. Docker Desktop은 이 이름을 자동으로 제공합니다. Linux는 docker run에 `--add-host host.docker.internal:host-gateway`를 더합니다. 공식 Docker 설치 예에 이 옵션을 더하면 다음 형태입니다(이미 설치한 수업 n8n은 다시 설치할 필요가 없습니다).

```bash
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 --add-host host.docker.internal:host-gateway -v n8n_data:/home/node/.n8n n8nio/n8n
```

수업의 시간대·기타 설치 옵션은 [공식 Docker 설치 문서](https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker)를 따릅니다. NetProof는 n8n을 설치하거나 실행하지 않습니다.

연결 확인은 n8n의 HTTP Request 노드에서 `GET http://host.docker.internal:4820/api/examples`를 실행합니다. 예시 목록이 오면 PC 서버에 닿은 것입니다. `scripts/qa_local.py`는 일부러 127.0.0.1에만 열리므로 Docker 연결 시연용으로 주소를 바꾸지 않습니다.

## 4. 가져오기와 노드 설정

n8n 편집기의 파일 가져오기로 `examples/n8n/netproof-verify.workflow.json`을 선택합니다. HTTP Request 노드의 호스트·포트가 PC 서버와 맞는지 확인합니다.

버전 차이로 파일 가져오기가 안 되면 다음 값으로 네 노드를 손으로 만들 수 있습니다. 연결은 모두 main 출력 0 → 다음 노드 입력 0입니다.

| 순서 | 이름 | type | typeVersion |
| --- | --- | --- | --- |
| 1 | NetProof 검증 요청 받기 | n8n-nodes-base.webhook | 2 |
| 2 | NetProof /api/verify | n8n-nodes-base.httpRequest | 4.2 |
| 3 | 결과 문장 만들기 | n8n-nodes-base.code | 2 |
| 4 | 결과 돌려주기 | n8n-nodes-base.respondToWebhook | 1.1 |

웹훅: HTTP Method POST, Path `netproof-verify`, Respond는 응답 노드 사용(`responseMode: responseNode`), options는 빈 객체입니다.

HTTP Request parameters(헤더·JSON 본문 표현식 포함):

```json
{
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
}
```

Code 노드는 모든 항목에 대해 실행하는 기본 모드이며 jsCode는 다음과 같습니다.

```js
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
```

Respond to Webhook: `respondWith: firstIncomingItem`, options는 빈 객체입니다. 워크플로 설정은 `executionOrder: v1`이고 pinData는 비어 있습니다.

## 5. 시험

웹훅 노드에서 테스트 이벤트를 기다리게 한 뒤 저장소 루트에서 합성 요청을 보냅니다. 테스트 URL은 `http://localhost:5678/webhook-test/netproof-verify`입니다.

```bash
curl -s -X POST http://localhost:5678/webhook-test/netproof-verify -H "Content-Type: application/json" -d @examples/n8n/request.json
```

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:5678/webhook-test/netproof-verify -ContentType 'application/json' -InFile examples/n8n/request.json
```

NetProof의 DENY·DISAGREE에 대해 응답은 다음과 같습니다. 이 값은 합성 요청을 실제 NetProof API에 보낸 응답과 대조했습니다. 실제 n8n 런타임 실행까지 확인했다는 뜻은 아닙니다.

```json
{"message":"≠ AI 답(통과)과 NetProof 계산(막힘)이 다릅니다","comparison":"DISAGREE","result":"DENY","reason":"정방향: ACL 101(g0/0 in) 1번 규칙에서 차단","problems":[],"notify":true}
```

워크플로를 게시(publish)하면 운영 URL `http://localhost:5678/webhook/netproof-verify`를 씁니다. 테스트 대기 상태와 게시된 워크플로의 URL을 구분하세요.

## 6. 결과 읽기

| comparison | 예시 message | notify |
| --- | --- | --- |
| AGREE | `= AI 답(막힘)과 NetProof 계산이 같습니다` | false |
| DISAGREE | `≠ AI 답(통과)과 NetProof 계산(막힘)이 다릅니다` | true |
| NO_CLAIM | `NetProof 계산 막힘` | false |

AI 답이 없을 때는 NO_CLAIM입니다. INVALID·UNSUPPORTED처럼 비교할 수 없는 응답도 Code 노드의 마지막 분기로 NetProof 계산 표시를 만듭니다. reason과 problems는 엔진 응답 그대로입니다. “같습니다/다릅니다”는 NetProof 비교이며 실제 장비 정답·안전을 보장하지 않습니다.

HTTP Request 노드가 422·413 등으로 실패하면 실행 기록에서 이유를 확인합니다. 오류를 AGREE나 “문제 없음”으로 바꾸지 않습니다.

## 7. 불일치 알림 붙이기 — 선택

기본 예시에는 알림 노드나 자격 증명이 없습니다. 사람이 `결과 문장 만들기` 뒤에 IF 노드를 추가해 `{{ $json.notify }}`가 true인지 확인하고, 참 출력에 HTTP Request 하나를 연결합니다. 기존 `결과 돌려주기` 연결은 유지해 웹훅 응답도 돌려줍니다. 알림은 선택이며 도구별 입력·수신 확인은 수업 환경에서 사람이 합니다.

HTTP Request는 POST, JSON 본문을 쓰고 아래 표현식 중 하나를 넣습니다.

Discord 웹훅 — 주소: `<웹훅 주소>`

```js
={{ JSON.stringify({ content: $json.message }) }}
```

Slack Incoming Webhook — 주소: `<웹훅 주소>`

```js
={{ JSON.stringify({ text: $json.message }) }}
```

Graylog GELF HTTP 입력 — 주소: `http://<Graylog 주소>:12201/gelf`

```js
={{ JSON.stringify({ version: '1.1', host: 'n8n', short_message: $json.message, _netproof_comparison: $json.comparison, _netproof_result: $json.result }) }}
```

웹훅 주소는 비밀값처럼 다룹니다. 저장소·워크플로 예시·캡처에 실제 주소·키·토큰을 남기지 마세요. 기본 JSON은 로컬 NetProof 주소만 담습니다.

## 8. 한계와 공식 출처

- 문서 기준은 n8n 2.41이며 예시 typeVersion은 Webhook 2·HTTP Request 4.2·Code 2·Respond to Webhook 1.1입니다.
- 실제 n8n 가져오기·실행과 선택 알림은 AI가 확인하지 못했습니다. [수동 QA E](qa-manual.md#e-n8n--수업-docker-환경-수동-확인)는 사용자 확인 대기입니다.
- Docker에서 PC 연결, 방화벽, 0.0.0.0 노출은 수업 환경에 따라 다릅니다. API는 익명이며 합성 자료로만 시연하세요.

- [Understand workflows](https://docs.n8n.io/build/understand-workflows)
- [Work with nodes](https://docs.n8n.io/build/understand-workflows/workflow-components/work-with-nodes)
- [Expressions for data transformation](https://docs.n8n.io/build/work-with-data/transform-data/expressions-for-data-transformation)
- [Understand executions](https://docs.n8n.io/build/understand-workflows/understand-executions)
- [Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook)
- [HTTP Request](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest)
- [Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook)
- [Install with Docker](https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker)
- [Graylog GELF Inputs](https://go2docs.graylog.org/current/getting_in_log_data/gelf.html)
