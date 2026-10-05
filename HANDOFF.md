# HANDOFF

Claude ↔ Codex가 GitHub를 채널로 주고받는 **현재 상태 문서**입니다. 이력은 쌓지 않고 덮어씁니다.
과제별 이력은 `decisions/ai-work-log.md`, 사람과 AI의 판단이 갈린 순간은 `decisions/disagreement-log.md`(사용자가 채움)에 둡니다.

## 운영 방식
- 흐름: Claude Opus 설계 → Codex Sol 구현·테스트 → Codex Luna 리뷰 → Codex Sol 수정·재테스트 → 사용자 최종 확인·병합. 필요하면 Astra를 사용한다.
- 역할: 설계는 Claude Opus, 구현·테스트·리뷰 반영은 Codex Sol, 리뷰는 Codex Luna, 병합과 최종 판단은 사용자.
- 채널: 설계는 `main`의 이 문서, 구현 중 상태는 작업 브랜치의 이 문서(차례인 쪽만 수정), 리뷰 지적은 PR 코멘트.
- 같은 GitHub 계정을 쓰므로 커밋 끝 Co-Author 줄과 코멘트 첫 줄 `[Claude]`/`[Codex]`로 구분합니다.
- 단계별 지시문: [PROMPTS.md](PROMPTS.md).
- **사람만 하는 일**: 사례 정답(손계산), 동기 인터뷰, 배포 가입·비밀값 입력, 제품 방향 결정. 어느 LLM에도 넘기지 않습니다.

## 검증 원칙
- "두 LLM이 동의했다/통과라고 했다"는 검증이 아닙니다. 근거는 테스트 출력, `git diff`, 실제 실행 결과뿐입니다.
- 리뷰 지적에는 파일:줄과 재현 명령을 붙입니다. 의견이 갈리면 가릴 수 있는 테스트부터 만듭니다.
- 금지: 비밀값 커밋, `--force` 푸시, 승인 없는 `main` 직접 푸시. 이 저장소는 공개입니다.

## 현재 작업 상태
- 작업: **n8n 연동 예시 + 학습실 n8n 주제** — 로드맵 "F5·F6 다음 기능 순서" 3번(AI 답 → `/api/verify` → 결과 알림 워크플로, 문서·예시 중심).
  - NetProof 쪽 코드는 바꾸지 않는다. `POST /api/verify`는 로그인 없이 `X-NetProof: 1` 헤더와 `{network, flow, claim}`을 받아 엔진의 `result`·`reason`·`comparison`(AGREE·DISAGREE·NO_CLAIM)을 돌려준다(64KB·구성 크기 제한).
  - 수업은 Docker로 설치한 n8n을 쓴다. n8n 문서에 따르면 컨테이너 안의 n8n은 PC의 서비스에 `host.docker.internal`로 닿고, 그 서비스는 `0.0.0.0`에 열려 있어야 한다(Linux는 `--add-host host.docker.internal:host-gateway`도 필요). QA 도구(`scripts/qa_local.py`)는 일부러 127.0.0.1에만 열리므로, n8n 시연은 일반 서버를 `--host 0.0.0.0`으로 띄운다. `/api/verify`는 계정이 필요 없다.
- 사용자 결정(2026-10-05):
  - **AI 답은 웹훅으로 받는다**(AI API 키 없이 동작).
  - **결과는 웹훅 응답으로 돌려주고, 불일치 알림은 선택**(문서로 붙이는 법을 보인다).
  - **학습실에 n8n 주제를 넣는다**(Graylog·Wazuh와 같은 형식).
  - **수업 n8n은 Docker 설치**다.
- Claude 조사(2026-10-05, 공식 문서·n8n 소스): n8n 최신 안정 2.41.6(베타 2.42.2). 노드 typeVersion은 웹훅 최대 2.2, HTTP Request 최대 4.5, Respond to Webhook 최대 1.5다. 예시는 **오래전부터 있는 버전**(웹훅 2, HTTP Request 4.2, Code 2, Respond to Webhook 1.1)을 써서 조금 오래된 n8n에서도 가져오게 한다.
- 같은 PR의 작은 후속: **F27**(서버 pytest가 worktree 엔진을 쓰게), **F29**(서버 테스트가 로그 환경 변수를 끄게). 둘 다 테스트 설정 한두 줄이다.
- 브랜치: `codex/n8n-example`(origin/main `0a53519` 기반), worktree `C:/gov/project/skt aleph/netproof-judge-ux`.
- 단계: **Claude 설계(현재) → 사용자 승인 → Codex 구현·테스트 → Claude 리뷰 → 사용자 병합 결정.**
- 다음 차례: **사용자 — 설계 승인.** 승인 전에는 구현하지 않는다.
- **판정·엔진·서버 API는 그대로다.** 맞고 틀림은 NetProof가 준 `comparison`만 쓴다(ADR-001). NetProof는 LLM을 부르지 않는다(ADR-002). AI 답은 밖(웹훅 요청)에서 온다.

## 작업 정의
- 목표:
  1. `examples/n8n`의 워크플로를 n8n에 가져와 주소만 확인하면, 예시 요청을 보냈을 때 `≠ AI 답(통과)과 NetProof 계산(막힘)이 다릅니다` 같은 결과가 웹훅 응답으로 온다.
  2. `docs/n8n.md`만 보고 Docker n8n에서 NetProof에 연결하고, 시험하고, 불일치 알림을 붙일 수 있다.
  3. 학습실에 n8n 주제가 생긴다.
  4. 예시 요청과 워크플로의 핵심이 테스트로 고정된다(실제 n8n 실행은 사람이 확인).

### 1) 예시 워크플로 — `examples/n8n/netproof-verify.workflow.json`(새 파일)
- 노드 네 개를 한 줄로 잇는다. 노드 이름이 연결의 열쇠이므로 그대로 쓴다.

  | 순서 | 이름 | type | typeVersion | parameters |
  | --- | --- | --- | --- | --- |
  | 1 | `NetProof 검증 요청 받기` | `n8n-nodes-base.webhook` | 2 | `httpMethod: "POST"`, `path: "netproof-verify"`, `responseMode: "responseNode"`, `options: {}`. 노드에 `webhookId`(UUID v4)를 둔다 |
  | 2 | `NetProof /api/verify` | `n8n-nodes-base.httpRequest` | 4.2 | 아래 |
  | 3 | `결과 문장 만들기` | `n8n-nodes-base.code` | 2 | `jsCode`: 아래 스크립트 |
  | 4 | `결과 돌려주기` | `n8n-nodes-base.respondToWebhook` | 1.1 | `respondWith: "firstIncomingItem"`, `options: {}` |

- HTTP Request 노드 parameters:

  ```json
  {
    "method": "POST",
    "url": "http://host.docker.internal:4820/api/verify",
    "sendHeaders": true,
    "specifyHeaders": "keypair",
    "headerParameters": { "parameters": [{ "name": "X-NetProof", "value": "1" }] },
    "sendBody": true,
    "contentType": "json",
    "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ network: $json.body.network, flow: $json.body.flow, claim: { kind: 'ai', expected: $json.body.ai_expected, source: 'n8n', text: $json.body.ai_text || '' } }) }}",
    "options": {}
  }
  ```
- Code 노드 스크립트(문장만 만든다. 판정·비교를 계산하지 않는다):

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
- `connections`는 1 → 2 → 3 → 4(`main` 출력 0 → 입력 0)다. 최상위는 `name: "NetProof AI 답 검증"`, `nodes`, `connections`, `settings: { "executionOrder": "v1" }`, `pinData: {}`다. 노드 `id`는 UUID v4, `position`은 `[0,0]`·`[240,0]`·`[480,0]`·`[720,0]`이다.
- 자격 증명·외부 서비스 주소·비밀값은 넣지 않는다.

### 2) 예시 요청 — `examples/n8n/request.json`(새 파일)
- `network`·`flow`는 `cases/synthetic-01-https-acl.json`의 값 그대로(합성 자료)다. 여기에 `"ai_expected": "PASS"`, `"ai_text": "PC1에서 SRV의 HTTPS(TCP 443)에 접속할 수 있습니다."`를 더한다.
- 기대 결과: NetProof `DENY`·`DISAGREE`, 응답 `message`는 `≠ AI 답(통과)과 NetProof 계산(막힘)이 다릅니다`.

### 3) 연결 문서 — `docs/n8n.md`(새 파일)
- 1절 무엇을 하나: 흐름(요청 → 웹훅 → HTTP Request → 결과 문장 → 응답). 맞고 틀림은 NetProof의 `comparison`만 쓴다. NetProof는 LLM을 부르지 않고, AI 답은 요청에 담겨 온다.
- 2절 요청 형식: 웹훅 본문(`network`, `flow`, `ai_expected`(PASS·DENY), `ai_text`(선택)). NetProof API(`POST /api/verify`, `Content-Type: application/json`, `X-NetProof: 1`, 본문 `{network, flow, claim}`, 응답 필드, 64KB 제한과 422).
- 3절 NetProof 켜기(Docker n8n):
  - PowerShell `.venv/Scripts/python -m flask --app server/wsgi.py run --host 0.0.0.0 --port 4820`, bash는 `.venv/bin/python`.
  - 주의: `0.0.0.0`은 같은 네트워크의 다른 기기에도 열린다. 믿을 수 있는 네트워크에서만 쓰고, 끝나면 Ctrl+C로 끈다. Windows 방화벽 창에서는 개인 네트워크만 허용한다.
  - n8n 컨테이너: Docker Desktop은 `host.docker.internal`이 자동이다. Linux는 `docker run`에 `--add-host host.docker.internal:host-gateway`를 더한다(공식 문서 예시 명령과 함께).
  - 연결 확인: n8n에서 HTTP Request 노드로 `GET http://host.docker.internal:4820/api/examples`를 실행해 예시 목록이 오면 연결된 것이다.
- 4절 가져오기: n8n 편집기에서 파일로 워크플로를 가져오고, HTTP Request 노드의 주소(호스트·포트)를 확인한다.
- 5절 시험: 웹훅 노드에서 테스트 이벤트를 기다리게 한 뒤 `request.json`을 테스트 URL(`http://localhost:5678/webhook-test/netproof-verify`)로 보낸다. bash `curl -s -X POST … -H "Content-Type: application/json" -d @examples/n8n/request.json`, PowerShell `Invoke-RestMethod -Method Post -Uri … -ContentType 'application/json' -InFile examples/n8n/request.json`. 워크플로를 게시(publish)하면 운영 URL(`/webhook/netproof-verify`)을 쓴다.
- 6절 결과 읽기: `message` 세 가지(AGREE·DISAGREE·NO_CLAIM, 앱 배너와 같은 문장)와 `reason`·`problems`. HTTP Request 노드가 422 등으로 실패하면 실행 기록에서 이유를 본다.
- 7절 불일치 알림 붙이기(선택): `결과 문장 만들기` 뒤에 IF 노드(`{{ $json.notify }}`가 true)를 두고, 참 쪽에 HTTP Request 노드 하나를 단다. 본문은 `={{ JSON.stringify({ … }) }}` 꼴로 쓴다.
  - Discord 웹훅: `POST <웹훅 주소>`, `{ content: $json.message }`
  - Slack Incoming Webhook: `POST <웹훅 주소>`, `{ text: $json.message }`
  - Graylog GELF HTTP 입력: `POST http://<Graylog 주소>:12201/gelf`, `{ version: '1.1', host: 'n8n', short_message: $json.message, _netproof_comparison: $json.comparison, _netproof_result: $json.result }`
  - 웹훅 주소는 비밀값처럼 다루고 저장소·캡처에 남기지 않는다.
- 8절 한계: n8n 2.41 기준이고 예시 노드는 오래된 typeVersion이다. 실제 n8n 가져오기·실행은 AI가 확인하지 못했다(수동 QA E). `0.0.0.0` 노출, `/api/verify`는 익명.
- 공식 문서 링크: 부록의 n8n 출처와 같은 목록, Graylog GELF(`https://go2docs.graylog.org/current/getting_in_log_data/gelf.html`).

### 4) 학습실 n8n 주제 — 웹
- `web/src/toolTopics.ts`:
  - 주제마다 `doc: { label, href }`와 `example: { title, text }`를 갖게 바꾼다. Graylog·Wazuh는 지금 값 그대로 옮긴다(`연결 설정 전체: docs/security-logs.md`, `NetProof 로그 예` + 지금 로그 예).
  - 공통 안내를 `NetProof는 이 도구를 설치하거나 대신 실행하지 않습니다. 수업 환경에서 직접 확인하세요.`로 바꾼다(도구 이름 뒤 조사를 피한다).
  - 세 번째 주제 n8n을 더한다(부록 원고 그대로).
- `LearningPage.tsx`:
  - 도구 주제 머리를 `학습실 · {분류}`로 한다(Graylog·Wazuh는 `보안 운영 도구`, n8n은 `업무 자동화`).
  - 예 제목·내용과 연결 문서 링크를 데이터에서 그린다.
  - 학습실 첫 화면의 도구 묶음 제목과 aria-label을 `수업 도구`로 바꾼다(카드의 분류 표시는 그대로).
- 실습 주제·라우터 규칙은 그대로다(`#/learn/n8n`은 지금 규칙으로 열린다).

### 5) 작은 후속 F27·F29 — 테스트 설정
- F27: `server/pyproject.toml`의 pytest `pythonpath`를 `[".", "../engine/src"]`로 한다. worktree에서도 `PYTHONPATH` 없이 그 worktree의 엔진을 쓴다.
- F29: `server/tests/conftest.py`의 앱 생성 overrides 두 곳에 `"SECURITY_LOG": None, "SECURITY_SYSLOG": None`을 더한다.

### 6) 범위 밖 · 허용 파일
- 하지 않는 것:
  - 엔진·서버 API·응답 변경, NetProof 안에서 LLM 호출, `scripts/qa_local.py`의 주소 변경
  - n8n 설치 스크립트·docker-compose, 자격 증명이 필요한 노드를 예시 JSON에 넣기(알림은 문서로만)
  - 새 의존성, DB
- 허용 파일:
  - 신규: `examples/n8n/netproof-verify.workflow.json`, `examples/n8n/request.json`, `docs/n8n.md`, `server/tests/test_n8n_example.py`, `web/src/n8nExample.test.ts`
  - 수정: `web/src/toolTopics.ts`·test, `web/src/pages/LearningPage.tsx`·test, `server/pyproject.toml`(F27), `server/tests/conftest.py`(F29), `docs/qa-manual.md`(E 절 신설, 기록 표 한 줄), `HANDOFF.md`, `decisions/ai-work-log.md`
- 읽기만: `engine/`, `server/netproof_api/`, `cases/`, `scripts/`.
- 다음을 바꾸고 싶으면 **먼저 요청한다**: 노드 구성·이름·typeVersion, Code 스크립트의 문장, 요청 필드 이름, 부록 원고의 사실 문장.

### 7) 위험
- **수업 n8n에서 가져오기 실패(버전 차이)** → 오래된 typeVersion을 쓰고, 문서에 노드 네 개를 손으로 만드는 값(주소·헤더·본문 식·스크립트)을 함께 둔다. 실제 확인은 수동 QA E.
- **결과 문장이 비교를 다시 계산함** → `comparison`만 쓴다. 테스트에 모순된 응답(결과 PASS·AI 답 PASS인데 DISAGREE)을 넣어 문장이 `다릅니다`로 나오는지 확인한다.
- **`0.0.0.0`으로 네트워크에 열림** → 문서에 주의, 시연 뒤 끄기, 방화벽은 개인 네트워크만.
- **예시가 실제 응답과 어긋남** → 서버 테스트로 `request.json`을 워크플로와 같은 모양으로 바꿔 실제 `/api/verify`에 보내 확인한다.

### 8) 완료 조건 · 테스트
- 서버(`test_n8n_example.py`):
  - `request.json`을 워크플로의 본문 식과 같은 모양(`claim.kind='ai'`, `source='n8n'`)으로 바꿔 `POST /api/verify` → 200, `DENY`·`DISAGREE`. `ai_expected`를 `DENY`로 → `AGREE`. `ai_expected`가 없으면 → `NO_CLAIM`.
  - 워크플로 JSON: 노드 네 개의 type·typeVersion·이름, 연결 1→2→3→4, 웹훅 `POST`·`netproof-verify`·`responseNode`, HTTP 노드 `POST`·주소가 `/api/verify`로 끝남·헤더 `X-NetProof: 1`·본문 식에 `kind: 'ai'`와 `ai_expected`, Respond `firstIncomingItem`, 자격 증명 키 없음.
  - n8n 주제의 `응답 예`가 실제 응답으로 만든 문장·`reason`과 같다.
- 웹:
  - `n8nExample.test.ts`: 워크플로의 `jsCode`를 `$input`·`$` 대역으로 실행해 AGREE·DISAGREE·NO_CLAIM 문장과 `notify`를 확인하고, 모순 응답에서도 `comparison`대로 나오는지 본다.
  - `toolTopics.test.ts`: n8n 출처가 `https://docs.n8n.io/`로 시작, 세 주제의 `doc`·`example`·버전·확인 날짜, 공통 안내 문장.
  - `LearningPage.test.tsx`: 첫 화면 `수업 도구`에 카드 세 개, n8n 주제의 머리 `학습실 · 업무 자동화`·절·예·연결 문서 링크(`docs/n8n.md`), Graylog·Wazuh는 지금과 같은 예·링크.
- 네 명령의 실제 출력 전체를 이 문서에 붙인다. F27 뒤에는 서버 테스트를 `PYTHONPATH` 없이 돌리고, 불러온 엔진 경로가 worktree인지 적는다:
  ```text
  cd engine && ../.venv/Scripts/python -m pytest -q
  cd server && ../.venv/Scripts/python -m pytest -q
  npm --prefix web test
  npm --prefix web run build
  ```
- 로컬·브라우저 확인(라이트, 375×812·1280×800): 학습실 첫 화면 카드 세 개, n8n·Graylog·Wazuh 주제 화면(예 줄바꿈·링크), 가로 넘침 0, console error 0. `request.json`을 로컬 서버의 `/api/verify`에 워크플로와 같은 본문으로 보내 결과를 기록한다.
- `docs/qa-manual.md`에 E 절(수업 Docker n8n에서 가져오기 → 연결 확인 → 테스트 URL 응답 → 게시 뒤 운영 URL → 선택 알림)을 사람 대기로 더한다. AI가 완료로 바꾸지 않는다.
- 작업 로그 한 줄, 다음 차례를 리뷰(Claude)로 바꿔 커밋·푸시하고 PR을 연다. 병합하지 않는다.

### 부록 — 학습실 n8n 원고 (Codex는 문장을 그대로 옮긴다)
- `id: "n8n"`, 분류 `업무 자동화`, 문서 기준 `n8n 2.41`, 확인 `2026-10-05`
- 제목: `n8n — 노드를 이어 자동화하기`
- 한 줄 설명: `트리거와 노드를 이어 반복 작업을 자동으로 처리하는 워크플로 도구`
- 이 주제에서 볼 것: `AI 답을 받은 n8n 워크플로가 NetProof에 검증을 요청하고, 결과를 돌려주는 과정`
- 개념:
  - `워크플로(Workflow): 노드를 연결해 만든 자동화 흐름입니다. 실행될 때마다 앞 노드의 결과가 다음 노드로 넘어갑니다.`
  - `노드(Node): 한 단계의 일을 합니다. 데이터를 받거나, 가공하거나, 다른 서비스로 보냅니다.`
  - `트리거(Trigger): 워크플로를 시작하는 노드입니다. 웹훅(Webhook) 트리거는 정해진 주소로 요청이 오면 시작합니다.`
  - `표현식(Expression): {{ $json.body.flow }}처럼 앞 노드의 데이터를 꺼내 매개변수에 넣습니다.`
  - `HTTP Request 노드: 다른 서비스의 API를 부릅니다. NetProof의 /api/verify도 이 노드로 부릅니다.`
  - `실행 기록(Executions): 실행마다 노드별 입력과 출력을 남겨, 어디서 무엇이 바뀌었는지 볼 수 있습니다.`
- 쉬운 비유: `공장 조립 라인처럼, 물건이 컨베이어를 따라 작업대를 하나씩 지나며 처리되는 것과 같습니다.`
- NetProof로 해 보기:
  1. `NetProof를 --host 0.0.0.0으로 켭니다. Docker 안의 n8n이 PC의 NetProof에 닿게 하려는 것입니다(연결 문서 참고).`
  2. `예시 워크플로(examples/n8n)를 n8n에 가져오고, HTTP Request 노드의 주소가 http://host.docker.internal:4820/api/verify인지 확인합니다.`
  3. `웹훅 노드에서 테스트 이벤트를 기다리게 한 뒤, 예시 요청(request.json)을 테스트 URL로 보냅니다.`
  4. `응답 문장과 실행 기록에서 노드별 입력·출력을 확인합니다.`
- 예 제목 `응답 예`, 내용: 2)의 예시 요청에 대한 실제 응답 JSON 한 줄(`message`·`comparison`·`result`·`reason`·`problems`·`notify`). Codex는 서버 테스트로 얻은 값을 그대로 쓴다.
- 연결 문서: `연결 설정 전체: docs/n8n.md` → `https://github.com/myeongjundev/netproof/blob/main/docs/n8n.md`
- 확인할 것:
  - `예시 요청의 AI 답(통과)에 대해 ≠ AI 답(통과)과 NetProof 계산(막힘)이 다릅니다가 응답으로 오나요?`
  - `결과 문장 노드는 NetProof가 준 comparison을 그대로 쓰고, 직접 비교하지 않나요?`
  - `워크플로를 게시(publish)한 뒤에는 테스트 URL 대신 운영 URL(/webhook/…)로 보내나요?`
- 출처: `Understand workflows` https://docs.n8n.io/build/understand-workflows · `Work with nodes` https://docs.n8n.io/build/understand-workflows/workflow-components/work-with-nodes · `Expressions` https://docs.n8n.io/code/expressions/ · `Executions` https://docs.n8n.io/workflows/executions/ · `Webhook` https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook · `HTTP Request` https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest · `Respond to Webhook` https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook · `Install with Docker` https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
- **PR #33 보안 로그·학습실 도구 주제·F26 (병합 완료, `0a53519`)**: 환경 변수로 켜는 보안 로그(`NETPROOF_SECURITY_LOG` 파일, `NETPROOF_SYSLOG` UDP. login_success·login_failure·account_locked·password_check_failure, 비밀번호·없는 닉네임 미기록, 꺼지면 아무 데도 안 씀), `docs/security-logs.md`(Graylog 7.1 파이프라인, Wazuh 4.14 규칙 100200~100203), 학습실 Graylog·Wazuh 주제, F26(로그인한 휴대폰 헤더 한 줄). Claude 독립 리뷰 PASS(실제 QA 서버 로그 파일 10줄 = UDP 10개, 비밀번호 0건). 수동 QA D(수업 환경 Graylog·Wazuh)는 사람 대기.
- **PR #32 변경 전/후 판정 비교 (병합 완료, `baf6501`)**: 같은 통신을 구성만 바꿔 다시 판정하면 판정기·실습의 결과 아래에 직전 판정과 지금 판정을 나란히 보인다(받은 답만 바꾸면 기준 유지, 통신 변경·불러오기는 해제). `다른 통신 영향 계산`은 엔진 `change_impact`(`policy_matrix` 두 번, 판정한 통신 제외, opened·closed·other·not_compared)와 `POST /api/change-impact`. 후속 F24(저장 제목)·F25(`은(는)`) 포함. Claude 독립 리뷰 PASS(엔진 무작위 대조 3,000회 불일치 0). 후속 F26은 이번 과제, F27(서버 pytest 경로)·F28(응답 크기)은 남음.
- **PR #31 판정기 알림·조사 정리 F5·F6 (병합 완료, `74c5255`)**: 손대지 않은 빈 템플릿에서는 불러오기 되돌리기 알림을 띄우지 않는다(`hasCurrentInput` 재사용). 조사 일곱 곳을 고정 낱말 뒤 조사로 바꿨다(예시 주제 알림·ACL 삭제·ACL 점검 두 문장·로그인 안내·계정 삭제·비교 배너 `과`). Claude 독립 리뷰 PASS(사례 목록 실패 시 `사례가`까지 실브라우저 확인). 후속 F24(저장 제목)·F25(`은(는)`)는 변경 전/후 과제에 넣었다.
- **PR #30 휴대폰 구성 접기 + 실습 후속 (병합 완료, `63515a6`)**: 900px 이하에서 실습 ②와 사례 상세 네트워크 구성을 CSS 접기(`.mobile-fold`, 넓은 화면은 요약 줄 숨김·펼침), `입력에서 보기`는 접기를 먼저 엶. F19 안내 뒤 ② 제목 포커스, F20 바뀐 것 없는 처음 상태로 무시, F21 실습 삭제 되돌리기, F22 홈 문구, F23 옛 문서 정리. R1(사용자 결정)으로 폭 360 대응: 요약 줄에서 확인할 것 개수 뺌, ③ 안내 `예상은 계산에 쓰지 않고 비교만 합니다.`, 휴대폰 실습 간격. Claude 재리뷰 PASS(360×800·375×812 실습 01·02·03의 ③ 제목·라디오·안내가 고정 줄 위, 1280 무변화).
- **PR #29 실습 화면 + 라이트 기본 (병합 완료, `f034bff`)**: 전용 `#/practice/:caseId`(구성 왼쪽·예상과 결과 오른쪽, 칸 번호 ①~④, 첫 방문 안내 줄), 실습 입력 분리(`practiceDrafts`), `판정기로 가져가기`(기존 load·되돌리기), 판정기 실습 기능 제거, 홈 이어서 하기 실습 우선, 라이트 기본(설정에서 다크·기기 설정 따르기). Claude 독립 리뷰 PASS(OS 다크 + 빈 저장소 → 라이트를 리뷰에서 실브라우저로 확인). 후속 F18~F23은 이번 과제.
- **PR #28 QA 서버 동시 연결 (병합 완료, `8268789`)**: `scripts/qa_local.py`의 `threaded=True`, 빈 연결을 유지한 채 두 번째 요청을 확인하는 회귀 테스트, 강제 종료 안내. PR #27 리뷰가 순차 요청만 확인해 놓친 결함(병합 후 실제 브라우저로 발견).
- **PR #27 후속 F15~F17 + QA 준비 도구 (병합 완료, `2ad04a0`)**: 불러오기 뒤 실습 제목 포커스, reduced-motion 공용 스크롤, 학습 상세 부제, `scripts/qa_local.py`(임시 SQLite·127.0.0.1·DATABASE_URL 무시), `docs/qa-manual.md`. 리뷰가 순차 요청만 확인해 놓친 단일 스레드 결함은 PR #28에서 수정. 사용자 수동 QA·reduced-motion 실브라우저 미확인은 별도다.
- **PR #26 비교 배너 중립 톤·실습 흐름 (병합 완료, `11c6ac2`)**: 배너 `≠ 내 예상(통과)와 NetProof 계산(막힘)이 다릅니다`+근거 안내, 빨강·초록 채움 제거(PR #21 배너 결정을 사용자가 변경). 진입 카드 guessPrompt·선택값별 안내, 이어서 하기 실습 이름·다음 실습, 퍼즐 질문 강조, 휴대폰 단추 한 줄(F12), 판정 뒤 결과 포커스(F14). Claude 독립 리뷰 PASS(`3c2c92d`). 홈 critique 27→26→26→25로 수렴하지 않아 다음 판단은 학생 관찰 권장.
- **PR #25 홈·학습 2차 (병합 완료, `397ee0d`)**: 계산 범위 띠(`NetProof 계산 범위` + 점선 `실제 장비`), 홈 퍼즐을 채운 단추 주 행동으로(375 단추 아래 끝 745/812), 세 실습 모두 예상 블록(`guessPrompt`·공용 `GuessPuzzle`), 판정기 진입 카드 예상 라디오(통과/막힘/예상 없이). Claude 독립 리뷰 PASS(`cd49334`), critique 3회차 26/40 → 사용자 병합. 후속 F12~F14와 배너 톤은 이번 과제.
- **PR #24 홈·학습실 개선 (병합 완료, `b8bb8e8`)**: 홈 예상 퍼즐(synthetic-01)·이어서 하기 얼굴·PathStrip 경로 그림·학습 상세 먼저·포커스 이동·말 다듬기·휴대폰 헤더. 리뷰 R1(메뉴 키보드 순서)·R2(제목 단계) → critique 2회차 26/40에서 P0(예상 직후 예시 단추 제목이 답 노출) 발견 → 사용자 결정으로 R3(예시 단추 주제 이름)·R4(F9~F11) → Claude 재리뷰 PASS(`575f902`) → 사용자 병합. 남은 P1·P2는 이번 과제.
- **PR #23 홈·학습실·헤더 MVP (병합 완료, `82975e6`)**: 공개 홈·학습실 3주제·모바일 헤더·현재 입력 안내·명시적 실습 불러오기. 설계는 사용자 요청으로 Codex가 맡음(일회). Claude 독립 리뷰 PASS(`179d46e`) → 사용자 병합. 후속 F7(실습 알림 "실습" 중복, 이번 2절에서 처리), F8(낡은 지시, 이번 문서 정리로 처리), 실제 200% 확대 미확인. 병합 뒤 홈 critique 27/40 → 이번 과제.
- **PR #22 문서 정리 (병합 완료, `b3f145b`)**: PR #21 병합 반영·수동 QA 절차 기록. Claude 문서 리뷰 PASS.
- **PR #21 판정기 화면 개선 (병합 완료, `388a9cf`)**: 비교 배너·한 단계 되돌리기·blur 안내·결과 접기·접근성·스크롤 겹침 정리. R1(trim/옥텟 앞자리0) 수정 `79086d2` → Claude 재리뷰 PASS `5056cb0` → 사용자 지시로 병합. F5 빈 템플릿 첫 예시 알림, F6 조사 "을"은 비차단 후속. PR #20 수동 QA는 별도다.
- **PR #20 사례 게시판 학습형 UI (사용자 지시로 병합 완료, `c2a998d`)**: 시작 안내·목록/카드·상세 구성 원문·출처 분리, 모바일 필터 F1 해결 확인, PR #19 main 최신화 포함.
  - **사용자 G2·실제 기본 확인창 삭제 취소는 수동 QA 대기 유지.** Claude 조사에서는 confirm을 false로 대체하면 페이지 유지·GET200·DELETE 없음, true면 단일 DELETE·GET404였다. 이는 실제 네이티브 취소 버튼 검증이 아니다. 자동화 timeout 원인 추정과 재현 사실을 구분한다([Claude 조사](https://github.com/myeongjundev/netproof/pull/20#issuecomment-5969258205)).
  - F2 용어 전체 통일은 후속(이번에는 승인된 judge-ux의 수정 후보 표기만 변경). F3 받은 답 종류·답 중복 정리, F4 모바일 네트워크 구성 접기도 후속 설계 대상. 금지된 상세/Badges/CaseNetwork는 이번에 바꾸지 않음.
- **PR #19 수정 후보 (병합 완료, `8be25a8`)**: 엔진 재판정으로 확인한 ACL 삽입 후보·직접 목표 선택. 후보 ≠ 판정·정답·안전 보장, 다른 통신 영향은 미확인. Claude 독립 리뷰 PASS, 6,000회 무작위 probe 불일치0; 기존 엔진/API는 이번에 변경하지 않음.
- **PR #18 ACL 점검 (병합 완료, `c19f554`)**: 엔진 `acl_audit`(정확 상자 합집합 계산)으로 가려짐·중복·일치 불가·점검 못 함과 permit 열린 범위를 계산, `POST /api/acl-audit`, 판정기 "ACL 점검" 섹션. Claude 독립 리뷰 PASS → 재확인 R1(전체 연산 한도 100k→300k 재측정)·R2 → 재리뷰 PASS(`cc5cf96`) → 사용자 병합.
  - 유지되는 합의: **점검 ≠ 판정.** 결론을 못 내면 "점검 못 함"(추측 금지). **과도함은 경고하지 않고 열린 범위를 사실로만 적는다**(사용자 결정).
- **PR #17 오탐·미탐 대시보드 (병합 완료, `6c7c9b1`)**: 기존 `/api/dashboard`에 DENY 양성·세 축(AI 답·사람 예상·NetProof 판정)·네 칸·상호 배타 제외 집계, 목록 필터 `actual`·`claim_kind`·`claim_expected`, 칸 → 목록 링크. Claude 독립 리뷰 PASS(`e0d26b3`, 차단 0) → 사용자 병합. 최종 실행: engine 263 passed·2 xfailed, server 85 passed·1 skipped, web 105 passed, build 성공.
  - 유지되는 합의: **양성은 통신 차단(`DENY`)**(사용자 확정). **집계 ≠ 판정.** 미확인·미정·미지원은 분모에서 빼고 제외 수를 화면에 보인다. 필터 주소 동기화는 주소 → 화면 단방향.
  - 남은 비차단 후속 3건: CasesPage 진입 시 조회 2번, 빈 질의 `#/cases?`의 빈 query 키, 임의 DB `kind` 값과 `claim_kind=none`(NULL만) 차이. PostgreSQL 실연결·DOM 전체 자동 테스트·지연 주입은 미검증.
- **PR #16 실제 결과 붙여넣기 (병합 완료, `309238d`)**: 엔진 `observe` 순수 파서(ping·Nmap 출력 → 실제 결과 **입력 후보**), 상태 없는 `POST /api/observe`. **관측 ≠ 판정**, 무응답·filtered는 DENY 후보를 만들지 않고, 붙여넣은 원문은 저장하지 않는다. 후속 3건(Nmap에 ping 낱줄 혼합, NBSP·전각 공백 거절, 거절 시 `target` 잔존).
- **PR #15 사례 복제·실습 과제 템플릿 (병합 완료, `7b15fde`)**: 앱은 기대값·정답·채점을 만들지 않는다. 후속: 예시 버튼 제목이 풀이 원인을 드러내는 문제, 제목 길이 UTF-16/코드포인트 차이.
- **PR #14 정책 검증 + 도달성 매트릭스 (병합 완료, `c0ab37e`)**: 엔진 `policy_matrix`, `POST /api/policy-matrix`, `#/matrix`. 상한 초과는 잘라 계산하지 않고 거절한다.
- **PR #13 사례 목록 검색·필터·페이지 (병합 완료)**: 비ASCII 검색은 DB 의존.
- **그 전**: PR #2 사례 URL 공유, PR #4 도달 못 한 목적지, PR #6 ACL 줄 하이라이트, PR #8·#11 유니코드/긴 숫자 `int()` 버그 — 모두 병합 완료.

## 남은 작업 — 로드맵 (2026-09-30 확정, ADR-015)
**정체성**: 네트워크 설정에 대한 답(AI·사람)을 계산으로 검증하고, 왜 그런지 보여 주고, 실제 결과로 그 검증까지 검증하는 실습실.
**순환 고리**: ① 입력 → ② 판정·설명 → ③ 보안 점검 → ④ 실제 결과로 확인 → ⑤ 통계·학습 → ①. 모든 기능은 이 중 하나를 강화한다.
**근거**: 강사님 피드백 — 목록 필터·검색·최적화 / 오탐·미탐 감지 / 시각화·하이라이트·색. 사용자가 "전부 넣는다"로 결정.
**원칙**: 판정·점검·수정 후보는 모두 엔진 계산(ADR-001). 앱 안 LLM 설명은 계속 제외(ADR-002). 과제마다 설계 → 구현 → 리뷰 → 병합 한 바퀴. 같은 폴더에서 Codex 작업은 한 번에 하나(병행하려면 별도 worktree).

**끝난 것**
- [x] 협업 파일 도입 · [x] P1 사례 URL 공유(PR #2) · [x] 도달 못 한 목적지 표시(PR #4)
- [x] `plan.md` 목표 변경 기록(ADR-015)

**2주차 전반 (~10-04)**
- [x] ACL 규칙 줄 하이라이트(이슈 #5 · PR #6 병합)
- [x] 이슈 #7 유니코드 숫자 `ValueError`·500 수정(PR #8 병합, 이슈 #7 닫음)
- [x] 이슈 #9 긴 숫자 `int()` 한도(PR #11 병합)
- [x] 사례 목록 검색·필터·페이지(PR #13 병합)

**2주차 (10-05~10-11)**
- [x] 정책 검증 + 도달성 매트릭스 ★대표 — ③ (PR #14 병합 완료)
- [x] 사례 복제·실습 과제 템플릿 — ① (PR #15 병합 완료)
- [ ] ~~Cisco 설정 붙여넣기 ①`interface`/`ip address` ②`ip route`~~ — **제외(2026-10-05 사용자 확인: 수업은 Cisco·pfSense를 쓰지 않음)**. 대체 기능은 사용자 결정 대기

**3주차 (10-12~10-18, 해커톤 1차 주말 — 가볍게)**
- [x] 실제 결과 붙여넣기(ping·Nmap 출력 → 실제 결과 입력 후보) — ④ (PR #16 병합 완료, `309238d`)
- [x] 오탐·미탐 대시보드 — ⑤ (PR #17 병합 완료, `6c7c9b1`)
- [x] ACL 점검(가려진 규칙·중복·열린 범위) — ③ (PR #18 병합 완료, `c19f554`)
- [x] 판정기 화면 개선(critique 23/40 우선 문제 5개) — ② **PR #21 병합 완료 `388a9cf`**, F5·F6은 PR #31(`74c5255`)로 처리
- [ ] ~~Cisco 설정 붙여넣기 ③`access-list`/`ip access-group`~~ — **제외**(위와 같은 이유)
- [ ] **배포**(사람 트랙과 함께) — 4주차 테스트 전에 공개 URL

**F5·F6 다음 기능 순서 (2026-10-05 사용자 합의 — 아래 4·5주차 목록의 순서를 대신한다)**
수업은 Cisco·pfSense를 쓰지 않고 Cloudflare·Graylog·Wazuh·n8n·Kali Linux를 쓴다. 기능마다 설계 → 승인 → 구현 → 리뷰 → 병합 한 바퀴. 11-01 기능 동결 원칙은 그대로다.
1. [x] 변경 전/후 판정 비교 — ② PR #32 병합(`baf6501`)
2. [x] NetProof 로그인 실패·계정 잠금 기록을 Graylog·Wazuh로 보내기(로컬 시연) + 학습실 Graylog·Wazuh 주제 + F26 — PR #33 병합(`0a53519`). 실제 수집은 수동 QA D(사람)
3. [ ] n8n 연동 예시(AI 답 → `/api/verify` → 결과 알림 워크플로, 문서·예시 중심) **→ 설계(2026-10-05, `codex/n8n-example`: 웹훅 입력·웹훅 응답·학습실 n8n 주제·Docker n8n, F27·F29 포함) → 사용자 승인 대기**
4. [ ] 원인 태그·통계("가장 많이 틀린 원인 Top 5") — ⑤, 배포 뒤
5. [ ] 불일치 사례 → 회귀 테스트 내보내기, 엔진 버전별 재판정 — ④
6. [ ] 구성도 그림 + 경로 재생 — ②
7. [ ] 연습 문제 모드 다시 정의("채점" 없이, AGENTS.md 원칙) — ⑤
8. [ ] Batfish 차등 테스트(엔진 검증용, 수업과 거리 있어 낮춤) — ④
- Kali: 기존 실제 결과 붙여넣기(PR #16, Nmap·ping)가 수업과 맞는다. Cloudflare 활용은 수업 용도를 확인한 뒤 정한다.

**4주차 (10-19~10-25) — 사용자 테스트 주간, 기능은 병행** (항목은 위 순서로 옮김)
- [x] 수정 후보 제안("무엇을 바꾸면 통하나") — ② **PR #19 병합 완료, 8be25a8**

**6주차 (11-02~11-08)**: 버그 수정만, 2차 테스트, 발표·제출

**사람 트랙 (동시에, LLM에 넘기지 않음)**
- [ ] 동기 3명 인터뷰 · [ ] 실제 결과가 있는 사례 모으기(붙여넣기 기능의 재료) · [ ] 사례 04 손계산
- [x] **수업 ACL이 Cisco인지 pfSense인지 확인** — 둘 다 아님(2026-10-05). 수업 도구는 Cloudflare·Graylog·Wazuh·n8n·Kali Linux 등 · [x] **오탐·미탐 양성 정의: 통신 차단(DENY)** · [ ] 표어 결정
- [ ] 배포(Vercel·Supabase 가입, 비밀값) · [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

**위험**: 4주차 전에 ①~⑤의 핵심(하이라이트·목록 필터·정책 검증·오탐/미탐·실제 결과 붙여넣기)이 끝나지 않으면 사용자 테스트가 흔들린다. 밀리면 4·5주차 항목부터 미룬다.

- [x] **홈·학습실·헤더 MVP(2026-10-04 추가)** — ①② PR #23 병합(`82975e6`).
- [x] **홈·학습실 개선(critique 27/40, 아이디어 A~D)** — ①② PR #24 병합(`b8bb8e8`).
- [x] **홈·학습 2차(계산 범위 띠·퍼즐 주 행동·실습마다 예상·진입 카드 예상 바꾸기)** — ①② PR #25 병합(`397ee0d`).
- [x] **비교 배너 톤·실습 흐름 다듬기** — ② PR #26 병합(`11c6ac2`).
- [x] **후속 F15~F17 + 수동 QA 준비 도구·체크리스트** — ② PR #27 `2ad04a0`, QA 서버 동시 연결 PR #28 `8268789`. 수동 QA는 사람 대기.
- [x] **실습 화면 + 라이트 기본(프로그래머스 벤치마크, 2차 설계)** — ①② PR #29 병합(`f034bff`).
- [x] **휴대폰 구성 접기(F18·F4) + 실습 후속 F19~F23** — ①② PR #30 병합(`63515a6`).
- [x] **판정기 알림·조사 정리(F5·F6)** — ② PR #31 병합(`74c5255`). 후속 F24·F25는 변경 전/후 과제에 포함
- [x] **사례 게시판 학습형 UI 1차(2026-10-03 추가)** — ①②④ PR #20 사용자 지시로 병합(`c2a998d`). **사용자 G2/삭제 취소 수동 QA는 별도 대기 유지.**

## 다음 LLM이 확인할 내용
- **사용자:** n8n 연동 예시·학습실 n8n 주제 설계 승인. 승인 뒤 Codex가 작업 정의 1)~8)과 부록 원고를 구현한다.
- **Codex(승인 뒤):** 맞고 틀림은 NetProof의 `comparison`만 쓴다. 예시 JSON에 자격 증명·비밀값을 넣지 않는다. 노드 구성·typeVersion·원고 문장은 바꾸지 않는다.
- **남은 후속:** F28 change-impact 응답에 바뀐 칸 전체가 담김(최대 971줄·571 KiB). F27·F29는 이번 과제다.
- 접기는 CSS(`.mobile-fold`)로만 하고 React로 `open`을 관리하지 않는다. 넓은 화면은 지금과 같아야 한다. 판정기는 접지 않는다.
- 실습 입력은 `practiceDrafts`에만 두고 판정기 `draft`는 `판정기로 가져가기`(기존 되돌리기) 때만 바꾼다. 실습 판정은 verify만 부른다. 승인된 다른 통신 영향은 단추로 change-impact를 요청하고 비교·분류를 화면에서 다시 계산하지 않는다(ADR-001). 정답·채점·완료 표시를 만들지 않는다.
- 첫 방문 안내 줄과 테마의 localStorage는 try/catch. 떠 있는 투어는 만들지 않는다. cases JSON은 테스트에서만 import한다.
- 수동 QA 결과는 사람이 `docs/qa-manual.md`로 기록한다. AI가 대신 완료로 바꾸지 않는다.
- 판정기 규칙(배너 문장, 되돌리기 한 단계, 즉시 검사가 판정을 막지 않음, ACL 점검 펼침 조건)을 바꾸고 싶으면 먼저 요청한다.

## 사용자 수동 QA 대기 (PR #20 G2·삭제 취소 + 홈·실습 흐름)
- **A(PR #20 G2)·B(실제 기본 확인창 삭제 취소)·C(홈·실습 흐름): 사용자 수동 확인 대기.** 도구 실행 확인과 F15·F17 구현 검증은 수동 QA 통과가 아니다.
- 병합 뒤 [체크리스트](docs/qa-manual.md)와 `scripts/qa_local.py`로 사람이 직접 확인한다. 결과는 사람이 PR 코멘트나 이 절에 적는다. 비밀번호·쿠키·토큰은 기록하지 않는다.
- 원칙: 임시 DB·합성 계정/사례만 쓴다. 실제 기본 확인창을 대체·우회하지 않는다. 비밀번호·쿠키·토큰을 기록하지 않는다. 확인한 항목만 완료로 바꾼다.
- C에 변경 전/후 항목을 더했다(PR #32). `판정기로 가져가기` 항목은 빈 판정기에서 알림이 없다는 점(PR #31 F5)을 반영해 고쳤다(PR #32 리뷰).
- D(수업 환경의 Graylog·Wazuh 실제 수집·검색·경보)는 체크리스트에 신설했고 **사용자 확인 대기**다. AI의 로컬 파일·UDP 확인은 실제 도구 수집 확인이 아니다.
- E(수업 Docker n8n에서 예시 워크플로 가져오기·실행)는 이번 과제에서 새로 만든다. AI는 실제 n8n으로 확인하지 못하므로 사람이 확인한다.

## 주의사항 / 미해결 이슈
- 관계없는 줄바꿈 변경 금지.
- **점검 ≠ 판정.** ACL 점검은 PASS/DENY를 만들거나 바꾸지 않는다. PASS/DENY는 `engine/`의 `verify`가 정한다(ADR-001).
- **추측하지 않는다.** 한도 초과·해석 못 한 줄 때문에 결론을 낼 수 없으면 "점검 못 함"이다. "문제 없음"으로 바꾸지 않는다.
- **과도함은 경고하지 않는다**(사용자 결정). 열린 범위를 사실로만 적는다.
- **양성은 통신 차단(`DENY`)이다**(사용자 확정, PR #17). 오탐 = 막힌다고 했는데 실제로 통함, 미탐 = 통한다고 했는데 실제로 막힘.
- **관측 ≠ 판정.** 무응답·filtered는 DENY의 증거가 아니다. 붙여넣은 원문은 저장하지 않는다.
- 앱은 기대값·정답·채점을 만들지 않는다(AGENTS.md). 기존 `expect`·`cases/*.json`을 바꾸지 않는다.
- 유니코드 숫자·긴 숫자로 `int()`를 부르면 이슈 #7·#9가 되돌아온다. 점검은 `parse_acl` 결과만 쓰므로 새 숫자 변환을 만들지 않는다.
- 이전 PR #12의 별도 버그(strict xfail 두 건), Hypothesis 하한 문제는 별도 후속 범위.
- PR #15·#16·#17의 다른 후속(위 이전 과제 기록)은 이번 범위가 아니다. PR #15 후속 "예시 버튼 제목이 풀이 원인을 드러냄"은 PR #24의 사용자 승인 R3로 JudgePage 예시 단추 표시만 수정했다. 이번에도 cases JSON·서버·다른 화면의 제목은 그대로다.
- **worktree에서 서버 테스트:** 공유 venv의 editable 엔진은 주 작업 폴더를 가리킨다. 엔진을 바꾼 브랜치는 `PYTHONPATH=<worktree>/engine/src`로 서버 테스트를 돌리고, 불러온 경로를 확인한다(F27로 고치기 전까지).
- **표시 ≠ 판정.** 판정기 개선은 엔진이 준 `result`·`comparison`·`problems`를 보여 주는 방식만 바꾼다.
- [HOME_HANDOFF.md](HOME_HANDOFF.md)는 2026-10-02 집 인계 시점 기록이다. 현재 상태는 이 문서가 기준이다.

현재 보안 로그·학습실 도구 주제·F26 설계: Claude (Claude Opus 5.5). 구현·검증: Codex (GPT-5).
