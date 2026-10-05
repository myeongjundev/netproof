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
- 작업: **보안 로그를 Graylog·Wazuh로 보내기 + 학습실 도구 주제 두 개 + F26** — 로드맵 "F5·F6 다음 기능 순서" 2번(운영·④). 공부 주제는 사용자 요청이다.
  - 서버에는 로그인 잠금(5번 실패 → 10분, 설정의 비밀번호 확인도 같음)이 있지만 기록은 남기지 않는다. 수업 도구인 Graylog·Wazuh로 볼 수 있는 보안 로그를 만든다.
  - 학습실 주제는 모두 네트워크 실습과 묶여 있다(구성 그림·실습 열기). 도구를 공부하는 주제는 새 종류의 화면이 필요하다.
  - F26(PR #32 리뷰): 로그인하면 휴대폰 헤더가 68px에서 98.6px가 되어, 360×800 실습 01의 ③ 안내 문장(739.8–759.9)이 고정 줄(734.2) 아래로 들어간다.
- 사용자 결정(2026-10-05):
  - 공부 주제는 **도구별 두 주제**(Graylog, Wazuh)로 나눈다. 주제마다 개념과 "NetProof 로그로 해 보기"를 담는다.
  - 로그는 **파일과 syslog 둘 다**로 보낸다. 각각 환경 변수로 켠다.
  - **F26을 이번 과제에 함께** 넣는다.
- Claude 조사(2026-10-05, 공식 문서): Graylog 7.1, Wazuh 4.14(최신 4.14.8, 2026-09-23 배포). 근거와 링크는 아래 6)·부록에 있다.
- 브랜치: `codex/security-logs`(origin/main `baf6501` 기반), worktree `C:/gov/project/skt aleph/netproof-judge-ux`.
- 단계: **Claude 설계(현재) → 사용자 승인 → Codex 구현·테스트 → Claude 리뷰 → 사용자 병합 결정.**
- 다음 차례: **사용자 — 설계 승인.** 승인 전에는 구현하지 않는다.
- **판정·엔진은 그대로다.** 로그인 응답(상태 코드·문장·시간 맞춤)도 그대로다. 로그는 운영자가 보는 기록일 뿐 화면이나 API 응답을 바꾸지 않는다.

## 작업 정의
- 목표:
  1. 환경 변수를 켜면 서버가 로그인 성공·실패·잠금과 설정의 비밀번호 확인 실패를 한 줄짜리 JSON 로그로 남긴다(파일, syslog 또는 둘 다). 끄면 아무것도 쓰지 않는다.
  2. 비밀번호는 어떤 경우에도 기록하지 않는다. 없는 닉네임으로 시도한 문자열도 기록하지 않는다.
  3. `docs/security-logs.md`만 보고 수업 환경의 Graylog·Wazuh에 연결할 수 있다.
  4. 학습실에 Graylog 주제와 Wazuh 주제가 생긴다.
  5. 로그인한 휴대폰 헤더가 로그아웃 상태와 같은 높이(한 줄)가 된다.

### 1) 보안 로그 — 서버
- 새 파일 `server/netproof_api/security_log.py`. 표준 라이브러리 `logging`만 쓰고 새 의존성은 없다.
  - `configure(app)`: `app.config["SECURITY_LOG"]`(파일 경로)와 `app.config["SECURITY_SYSLOG"]`(`호스트:포트`)를 읽어 로거 `netproof.security`(propagate 끔)에 처리기를 단다. 다시 부르면 이전 처리기를 닫고 바꾼다(테스트에서 `create_app`을 여러 번 불러도 줄이 겹치지 않고, Windows에서 파일이 잠기지 않게).
  - 파일: `FileHandler(경로, encoding="utf-8")`, 상위 폴더가 없으면 만든다. 한 줄에 사건 하나.
  - syslog: `SysLogHandler(address=(호스트, 포트), facility=LOG_AUTH)`, UDP, `append_nul = False`. 본문은 JSON 한 줄 그대로다(앞에 프로그램 이름을 붙이지 않는다).
  - 포맷은 `%(message)s`다. `호스트:포트` 형식이 틀리면 앱 시작에서 분명한 오류로 멈춘다.
  - **둘 다 꺼져 있으면 아무 데도 쓰지 않는다.** 처리기가 없는 로거는 Python의 lastResort가 표준 오류로 경고를 찍으므로 `NullHandler`를 달거나 바로 돌아간다.
  - `event(이름, 수준, **필드)`: 값이 None인 필드는 뺀 뒤 `json.dumps(…, ensure_ascii=False, separators=(",", ":"))`로 쓴다. 공통 필드 `app`이 맨 앞(`"netproof"`)이고 `time`(UTC, `2026-10-05T03:10:00Z` 꼴)이 붙는다.
- `server/netproof_api/__init__.py`의 `create_app`: `SECURITY_LOG=os.environ.get("NETPROOF_SECURITY_LOG")`, `SECURITY_SYSLOG=os.environ.get("NETPROOF_SYSLOG")`를 config에 넣고(overrides로 바꿀 수 있음) `configure(app)`를 부른다. `scripts/qa_local.py`로 켤 때도 환경 변수가 그대로 들어간다.
- 사건(`event` 값)과 필드. `src_ip`는 `request.remote_addr`다.

  | event | 언제 | 수준 | 필드 |
  | --- | --- | --- | --- |
  | `login_success` | 로그인 성공 | INFO | `nickname`, `user_id`, `src_ip` |
  | `login_failure` | 로그인 실패 | WARNING | `reason`(`unknown_user`·`bad_password`·`locked`), `src_ip`. 계정이 있으면 `nickname`·`user_id`. `bad_password`면 `failed_count`(올린 뒤 값), `locked`면 `locked_until` |
  | `account_locked` | 실패가 5번이 되어 잠금이 시작될 때 | WARNING | `via`(`login`·`settings`), `nickname`, `user_id`, `src_ip`, `failed_count`(5), `locked_until` |
  | `password_check_failure` | 설정 화면의 지금 비밀번호 확인 실패 | WARNING | `reason`(`bad_password`·`locked`), `nickname`, `user_id`, `src_ip`. `bad_password`면 `failed_count`, `locked`면 `locked_until` |

  - 다섯 번째 실패는 `login_failure`(또는 `password_check_failure`) 다음에 `account_locked`를 남긴다.
  - `unknown_user`에는 시도한 닉네임을 넣지 않는다(비밀번호를 닉네임 칸에 잘못 넣은 경우가 남지 않게).
- `server/netproof_api/auth.py`는 위 지점에서 `event`만 부른다. 응답의 상태 코드·문장·더미 해시 시간 맞춤·잠금 규칙은 바꾸지 않는다. 가입·로그아웃·비밀번호 변경·계정 삭제 기록은 이번 범위가 아니다.
- `.gitignore`에 `logs/`를 더한다. 문서의 예시 경로는 `logs/security.jsonl`이다.
- 로그 예(합성):

  ```text
  {"app":"netproof","event":"login_failure","reason":"bad_password","nickname":"qa_author","user_id":2,"src_ip":"127.0.0.1","failed_count":3,"time":"2026-10-05T03:10:00Z"}
  ```

### 2) 연결 문서 — `docs/security-logs.md`(새 파일)
- 1절 무엇을 남기나: 위 표와 로그 예, "비밀번호·없는 닉네임 문자열은 남기지 않는다", 기본은 꺼짐.
- 2절 켜는 법: PowerShell과 bash 예. 예: `NETPROOF_SECURITY_LOG=logs/security.jsonl`, `NETPROOF_SYSLOG=192.168.0.10:1514`로 `scripts/qa_local.py`를 실행하고 합성 계정으로 비밀번호를 다섯 번 틀린다. syslog 대상은 하나다(보통 파일 → Wazuh 에이전트, syslog → Graylog).
- 3절 Graylog(7.1 기준):
  1. Syslog UDP 입력을 만든다. 포트는 예를 들어 1514다(1024보다 작은 포트는 관리자 권한이 필요할 수 있다).
  2. 파이프라인 규칙을 만들어 NetProof 메시지가 들어오는 스트림(예: Default Stream)에 연결한다. syslog 머리말이 붙어도 JSON 부분만 꺼내도록 `regex`에 그룹 이름을 준다.

     ```text
     rule "netproof security json"
     when
       contains(to_string($message.message), "\"app\":\"netproof\"")
     then
       let found = regex("(\\{.*\\})", to_string($message.message), ["json"]);
       set_fields(fields: to_map(parse_json(to_string(found["json"]))), prefix: "netproof_");
     end
     ```
  3. 검색: `netproof_event:login_failure`, `netproof_event:account_locked`.
  4. 알림 예: 이벤트 정의에서 검색 `netproof_event:login_failure`를 2분 동안 `netproof_src_ip`로 묶어 개수 5 이상이면 이벤트를 만든다(화면 위치는 버전마다 달라 공식 문서 링크로 안내한다).
- 4절 Wazuh(4.14 기준):
  - 가(기본) 에이전트가 파일을 읽는다. NetProof를 실행하는 PC의 에이전트 `ossec.conf`:

    ```xml
    <localfile>
      <location>NetProof 로그 파일의 전체 경로</location>
      <log_format>json</log_format>
    </localfile>
    ```
  - 나(선택) 서버가 syslog를 직접 받는다. 서버 `ossec.conf`(syslog는 `allowed-ips`가 꼭 있어야 한다):

    ```xml
    <remote>
      <connection>syslog</connection>
      <port>514</port>
      <protocol>udp</protocol>
      <allowed-ips>NetProof를 실행한 PC 주소</allowed-ips>
    </remote>
    ```
  - 서버 `/var/ossec/etc/rules/local_rules.xml`:

    ```xml
    <group name="netproof,authentication,">
      <rule id="100200" level="5">
        <decoded_as>json</decoded_as>
        <field name="app">^netproof$</field>
        <field name="event">^login_failure$</field>
        <description>NetProof: 로그인 실패</description>
        <group>authentication_failed,</group>
      </rule>
      <rule id="100201" level="10">
        <decoded_as>json</decoded_as>
        <field name="app">^netproof$</field>
        <field name="event">^account_locked$</field>
        <description>NetProof: 실패가 반복돼 계정이 잠김</description>
        <mitre><id>T1110</id></mitre>
      </rule>
      <rule id="100202" level="10" frequency="5" timeframe="120">
        <if_matched_sid>100200</if_matched_sid>
        <same_field>src_ip</same_field>
        <description>NetProof: 같은 주소에서 로그인 실패가 반복됨</description>
        <mitre><id>T1110</id></mitre>
      </rule>
      <rule id="100203" level="5">
        <decoded_as>json</decoded_as>
        <field name="app">^netproof$</field>
        <field name="event">^password_check_failure$</field>
        <description>NetProof: 설정에서 비밀번호 확인 실패</description>
      </rule>
    </group>
    ```
  - 확인: 서버에서 `/var/ossec/bin/wazuh-logtest`에 1절의 로그 한 줄을 붙여, JSON 디코더와 규칙 100200이 맞는지 먼저 본다. syslog(나)로 받을 때도 같은 방법으로 디코딩을 확인한다.
- 5절 한계:
  - 로컬 시연용이다. 배포 환경은 켜지 않는다(기본 꺼짐).
  - UDP syslog는 암호화되지 않고 잃어버릴 수 있다.
  - 프록시 뒤에서는 `remote_addr`가 프록시 주소가 된다(ProxyFix는 범위 밖).
  - Graylog·Wazuh 실제 수집은 AI가 확인하지 못했다. 사람이 수업 환경에서 확인한다(수동 QA D).

### 3) 학습실 도구 주제 두 개 — 웹
- 새 파일 `web/src/toolTopics.ts`에 두 주제의 데이터(아래 부록 원고 그대로)를 둔다. 실습 주제(`learning.ts`)와 섞지 않는다.
- 주소는 `#/learn/graylog`, `#/learn/wazuh`다. `router.ts`의 `/learn/:id`가 실습 주제와 도구 주제를 모두 받는다. 없는 id는 지금처럼 없는 주제 화면이다.
- 학습실 첫 화면: 지금 실습 카드 아래에 `보안 운영 도구` 제목과 카드 두 개(분류·제목·한 줄 설명·`공부하기 →`)를 둔다. 경로 그림은 없다.
- 도구 주제 화면(`LearningPage`):
  - 머리: `학습실 · 보안 운영 도구`, 제목, `홈으로`.
  - `이 주제에서 볼 것: …`
  - `개념`(목록), `쉬운 비유`, `NetProof 로그로 해 보기`(번호 목록), `NetProof 로그 예`(1절 로그 예를 `<pre><code>`로), `확인할 것`(목록)
  - 출처 칸: 공식 문서 링크(새 창, `rel="noreferrer"`), `연결 설정 전체: docs/security-logs.md`(GitHub 링크), 안내 `NetProof는 Graylog·Wazuh를 설치하거나 대신 실행하지 않습니다. 수업 환경에서 직접 확인하세요. 문서 기준: {도구} {버전}, 2026-10-05 확인.`
  - `다른 주제`: 실습 주제와 도구 주제를 모두 보인다(실습 주제 화면의 `다른 주제`에도 도구 주제를 더한다).
  - 경로 그림·예상 퍼즐·실습 열기 단추는 없다.
- 스타일은 기존 학습 화면 클래스를 다시 쓴다. 로그 예의 `<pre>`는 가로로 넘치지 않게 줄바꿈한다(`white-space: pre-wrap; overflow-wrap: anywhere`).

### 4) F26 — 로그인한 휴대폰 헤더를 한 줄로 (CSS만)
- 960px 이하(지금 헤더가 격자로 바뀌는 구간):
  - `.app-header .header-account { flex-wrap: nowrap; }`
  - `.app-header .header-nickname { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`
- 720px 이하: 헤더의 역할 표시(`.header-account .badge`)를 숨긴다. 역할은 설정 화면에서 보인다.
- 로그아웃 단추의 최소 높이 44px는 그대로다. 961px 이상은 바뀌지 않는다.
- 목표: 로그인한 360×800·375×812에서 헤더 높이가 68px(로그아웃과 같음)이고, 실습 01·02·03의 ③ 위치가 PR #30 기록과 같다. 20자 닉네임도 한 줄(말줄임)이고 가로 넘침 0이다.

### 5) 범위 밖 · 허용 파일
- 하지 않는 것:
  - 판정·엔진, 로그인 응답·잠금 규칙 변경, 배포 환경 로깅
  - GELF, TCP·TLS syslog, syslog 대상 여러 개, 가입·로그아웃·비밀번호 변경·계정 삭제 기록
  - Graylog·Wazuh 설치 스크립트·docker-compose·대시보드 만들기, 요청 제한·ProxyFix
  - 새 의존성, DB 변경, 헤더 마크업 변경(F26은 CSS만)
- 허용 파일:
  - 서버: 신규 `server/netproof_api/security_log.py`, `server/netproof_api/__init__.py`(config·configure 호출), `server/netproof_api/auth.py`(`event` 호출만), 신규 `server/tests/test_security_log.py`
  - 웹: 신규 `web/src/toolTopics.ts`·test, `web/src/router.ts`·test, `web/src/pages/LearningPage.tsx`·test, `web/src/styles.css`(F26·도구 주제만)
  - 문서·설정: 신규 `docs/security-logs.md`, `docs/qa-manual.md`(D 절 신설, C에 F26 한 줄), `.gitignore`(`logs/`), `HANDOFF.md`, `decisions/ai-work-log.md`
- 읽기만: `engine/`, `cases/`, `scripts/qa_local.py`, 다른 서버 모듈, `AppHeader.tsx`(마크업 그대로).
- 다음을 바꾸고 싶으면 **먼저 요청한다**: 사건 이름·필드, 비밀번호·없는 닉네임을 남기지 않는 원칙, 부록 원고의 사실 문장, F26의 역할 표시 숨김.

### 6) 위험
- **비밀번호·개인정보가 로그에 남음** → 비밀번호는 어떤 필드에도 넣지 않고, 없는 닉네임 문자열도 넣지 않는다. 테스트로 로그 전체에 비밀번호 문자열이 없음을 확인한다.
- **꺼 놓았는데 표준 오류로 찍힘(lastResort)** → NullHandler 또는 바로 돌아가기. 테스트로 확인한다.
- **로그 줄 위조(줄바꿈 넣기)** → JSON 인코딩이 제어 문자를 이스케이프한다. 닉네임은 계정이 있을 때만 넣는다.
- **syslog 형식이 도구와 안 맞음** → Graylog 규칙은 머리말이 있어도 JSON만 꺼낸다. Wazuh는 파일(가)을 기본으로 하고 syslog(나)는 `wazuh-logtest`로 먼저 확인한다. 실제 수집은 수동 QA D로 사람이 확인한다.
- **원고가 틀림** → 공식 문서(Graylog 7.1, Wazuh 4.14)만 근거로, 확인 날짜와 버전을 화면에 적는다. Claude가 리뷰에서 다시 본다.
- **F26으로 역할이 안 보임** → 720px 이하에서만 숨기고, 설정 화면에는 남는다.

### 7) 완료 조건 · 테스트
- 서버(`test_security_log.py`):
  - 파일: 성공·없는 닉네임·틀린 비밀번호·5번째 실패(`login_failure` 다음 `account_locked`)·잠긴 동안 시도·설정 확인 실패·설정에서 잠금. 줄마다 JSON, 공백 없는 꼴(`"app":"netproof"`), None 필드 없음, `time` 꼴.
  - 비밀번호 문자열이 로그 전체에 없음, `unknown_user`에 닉네임 없음.
  - syslog: 127.0.0.1의 임시 UDP 소켓으로 받은 데이터그램이 `<PRI>` 뒤에 파일과 같은 JSON 한 줄이고 NUL 바이트가 없다. PRI는 auth 시설에 실패 36·성공 38이다.
  - 꺼짐: 파일이 생기지 않고 표준 오류에도 아무것도 없다. 로그인 응답은 지금 테스트 그대로 통과한다.
  - `create_app`을 두 번 불러도 줄이 한 번만 쓰인다. `NETPROOF_SYSLOG` 형식이 틀리면 시작 오류.
- 웹:
  - `toolTopics.test.ts`: id 두 개가 실습 id와 겹치지 않음, 출처가 `https://go2docs.graylog.org/`·`https://documentation.wazuh.com/`로 시작, 버전·확인 날짜 있음.
  - `router.test.ts`: `#/learn/graylog`·`#/learn/wazuh` → 학습실 주제, 없는 id → 없는 주제.
  - `LearningPage.test.tsx`(SSR): 첫 화면에 도구 카드 두 개와 주소, 주제 화면의 절 제목·로그 예·출처 링크(`target="_blank" rel="noreferrer"`)·안내 문장, 경로 그림·실습 열기가 없음, `다른 주제`에 두 종류가 다 있음.
- 네 명령의 실제 출력 전체를 이 문서에 붙인다:
  ```text
  cd engine && ../.venv/Scripts/python -m pytest -q
  cd server && ../.venv/Scripts/python -m pytest -q
  npm --prefix web test
  npm --prefix web run build
  ```
  - worktree의 서버 테스트는 `PYTHONPATH=<worktree>/engine/src`로 돌리고, 불러온 엔진 경로를 적는다(F27 전까지).
- 브라우저·로컬 확인(실제 브라우저, `scripts/qa_local.py`, 라이트):
  - 로그: 두 환경 변수를 켜고 127.0.0.1의 UDP 수신기(임시 스크립트)를 띄운 뒤 합성 계정으로 비밀번호를 다섯 번 틀린다. 파일 줄과 받은 데이터그램을 비밀번호 없이 기록한다.
  - 학습실 첫 화면과 두 주제 화면(375×812·1280×800): 카드·절·로그 예 줄바꿈·출처 링크, 가로 넘침 0.
  - F26: 로그인한 360×800·375×812 헤더 높이, 실습 01·02·03의 ③ 위치(PR #30 기록과 비교), 20자 닉네임 말줄임, 1280 헤더 변화 없음.
  - console error 0.
- `docs/qa-manual.md`에 D 절(수업 환경 Graylog·Wazuh에서 `docs/security-logs.md` 순서대로 수집·검색·경보 확인)을 사람 대기로 더한다. AI가 완료로 바꾸지 않는다.
- 작업 로그 한 줄, 다음 차례를 리뷰(Claude)로 바꿔 커밋·푸시하고 PR을 연다. 병합하지 않는다.

### 부록 — 학습실 원고 (Codex는 문장을 그대로 옮긴다)
**공통**
- 분류: `보안 운영 도구`
- 화면 안내: `NetProof는 Graylog·Wazuh를 설치하거나 대신 실행하지 않습니다. 수업 환경에서 직접 확인하세요.`
- 로그 예: 1)의 로그 예 한 줄. 연결 설정 링크: `https://github.com/myeongjundev/netproof/blob/main/docs/security-logs.md`

**Graylog** (`id: "graylog"`, 문서 기준 `Graylog 7.1`, 확인 `2026-10-05`)
- 제목: `Graylog — 로그를 모으고 찾기`
- 한 줄 설명: `여러 곳의 로그를 한곳에 모아 검색하고 알림을 만드는 도구`
- 이 주제에서 볼 것: `NetProof 로그인 기록이 Graylog에 들어와 필드로 나뉘고, 검색과 알림으로 이어지는 과정`
- 개념:
  - `입력(Input): 로그를 받는 창구입니다. Syslog(UDP·TCP), GELF, Beats처럼 받는 방식마다 입력을 하나씩 만듭니다.`
  - `스트림(Stream): 조건에 맞는 메시지만 골라 모은 흐름입니다. 예를 들어 NetProof 메시지만 따로 볼 수 있습니다.`
  - `파이프라인(Pipeline): 들어온 메시지를 규칙으로 고칩니다. NetProof처럼 JSON으로 온 로그는 규칙으로 풀어 필드로 나눕니다.`
  - `검색(Search): 필드와 값으로 메시지를 찾습니다. 예: netproof_event:login_failure`
  - `이벤트 정의(Event Definition)와 알림: 검색 결과가 정한 기준을 넘으면 이벤트를 만들고 알림을 보냅니다. 예: 2분 안에 같은 주소에서 로그인 실패 5번.`
  - `대시보드(Dashboard): 자주 보는 검색 결과를 표와 그래프로 고정해 둡니다.`
- 쉬운 비유: `여러 지점에서 온 택배를 한 창구에서 받아 목적지별 칸에 나누고, 송장을 보고 바로 찾아 주는 물류 센터와 같습니다.`
- NetProof 로그로 해 보기:
  1. `Graylog에서 Syslog UDP 입력을 만듭니다. 포트는 예를 들어 1514를 씁니다(1024보다 작은 포트는 관리자 권한이 필요할 수 있습니다).`
  2. `NetProof를 NETPROOF_SYSLOG=<Graylog 주소>:1514로 켭니다. 로컬 QA 도구와 합성 계정을 씁니다.`
  3. `연결 설정 문서의 파이프라인 규칙을 만들고, NetProof 메시지가 들어오는 스트림에 연결합니다.`
  4. `합성 계정으로 비밀번호를 다섯 번 틀린 뒤 netproof_event:login_failure와 netproof_event:account_locked를 검색합니다.`
- 확인할 것:
  - `다섯 번째 실패 뒤 account_locked 기록이 한 번 생기나요?`
  - `화면의 오류 문장은 같아도 로그의 netproof_reason은 bad_password·unknown_user·locked로 다른가요?`
  - `없는 닉네임으로 시도한 기록에는 닉네임이 남지 않나요?`
- 출처: `What is Graylog` https://go2docs.graylog.org/current/what_is_graylog/what_is_graylog.htm · `Syslog Inputs` https://go2docs.graylog.org/current/getting_in_log_data/syslog_inputs.html · `Streams` https://go2docs.graylog.org/current/making_sense_of_your_log_data/streams.html · `Functions Reference` https://go2docs.graylog.org/current/making_sense_of_your_log_data/functions_index.html

**Wazuh** (`id: "wazuh"`, 문서 기준 `Wazuh 4.14`, 확인 `2026-10-05`)
- 제목: `Wazuh — 규칙으로 공격 징후 찾기`
- 한 줄 설명: `에이전트가 보낸 로그를 디코더와 규칙으로 분석해 경보를 만드는 보안 플랫폼`
- 이 주제에서 볼 것: `NetProof 로그인 실패가 Wazuh 규칙에 걸려 레벨이 붙은 경보가 되는 과정`
- 개념:
  - `에이전트(Agent): 서버나 PC에 설치해 로그 파일 등을 읽고 Wazuh 서버로 보냅니다.`
  - `Wazuh 서버: 디코더와 규칙으로 로그를 분석해 경보를 만듭니다. 에이전트 없이 syslog를 직접 받을 수도 있습니다.`
  - `인덱서와 대시보드: 인덱서는 경보를 저장해 검색할 수 있게 하고, 대시보드는 그것을 웹 화면으로 보여 줍니다.`
  - `디코더(Decoder): 로그 한 줄에서 필드를 뽑습니다. 한 줄짜리 JSON 로그는 기본 JSON 디코더가 필드로 풀어 줍니다.`
  - `규칙(Rule)과 레벨: 조건에 맞는 로그에 0~16 레벨을 붙여 경보로 만듭니다. 직접 만든 규칙은 서버의 local_rules.xml에 100000~120000번대 ID로 둡니다.`
  - `빈도 규칙: frequency와 timeframe으로 "짧은 시간에 여러 번"을 잡습니다. 반복된 로그인 실패는 MITRE ATT&CK의 무차별 대입(T1110)에 해당합니다.`
- 쉬운 비유: `건물 곳곳의 출입 기록을 관제실이 규칙표와 비교해, 짧은 시간에 같은 문을 여러 번 잘못 연 기록이 있으면 경보를 울리는 것과 같습니다.`
- NetProof 로그로 해 보기:
  1. `NetProof를 NETPROOF_SECURITY_LOG=<로그 파일 경로>로 켭니다.`
  2. `같은 PC의 Wazuh 에이전트 설정(ossec.conf)에 그 파일을 log_format json으로 추가하고 에이전트를 다시 시작합니다.`
  3. `서버의 local_rules.xml에 연결 설정 문서의 NetProof 규칙을 넣고 서버를 다시 시작합니다.`
  4. `서버에서 wazuh-logtest에 로그 한 줄을 붙여 디코딩과 규칙 일치를 먼저 확인합니다.`
  5. `합성 계정으로 비밀번호를 다섯 번 틀린 뒤 대시보드에서 NetProof 경보를 찾습니다.`
- 확인할 것:
  - `로그인 실패(규칙 100200, 레벨 5)와 계정 잠금(100201, 레벨 10)이 따로 보이나요?`
  - `같은 주소에서 2분 안에 다섯 번 실패하면 빈도 규칙(100202)이 울리나요?`
  - `경보의 필드에 비밀번호가 없나요?`
- 출처: `Components` https://documentation.wazuh.com/current/getting-started/components/index.html · `localfile` https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/localfile.html · `Rules syntax` https://documentation.wazuh.com/current/user-manual/ruleset/ruleset-xml-syntax/rules.html · `Testing decoders and rules` https://documentation.wazuh.com/current/user-manual/ruleset/testing.html · `remote` https://documentation.wazuh.com/current/user-manual/reference/ossec-conf/remote.html

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
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
2. [ ] NetProof 로그인 실패·계정 잠금 기록을 Graylog·Wazuh로 보내기(로컬 시연) — 운영·④ **+ 학습실에 Graylog·Wazuh 공부 주제**(개념 설명·NetProof 로그가 어떻게 보이는지·공식 문서 출처) — 사용자 요청 **→ 설계(2026-10-05, `codex/security-logs`: 파일·syslog, 도구별 두 주제, F26 포함) → 사용자 승인 대기**
3. [ ] n8n 연동 예시(AI 답 → `/api/verify` → 결과 알림 워크플로, 문서·예시 중심)
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
- **사용자:** 보안 로그·학습실 도구 주제·F26 설계 승인. 승인 뒤 Codex가 작업 정의 1)~7)과 부록 원고를 구현한다.
- **Codex(승인 뒤):** 비밀번호와 없는 닉네임 문자열은 어떤 로그에도 남기지 않는다. 로그를 꺼 두면 파일·표준 오류 어디에도 쓰지 않는다. 로그인 응답은 바꾸지 않는다. 원고의 사실 문장은 바꾸지 않는다.
- **남은 후속(PR #32 리뷰):** F27 `server/pyproject.toml`의 pytest `pythonpath`에 `../engine/src` 추가. F28 change-impact 응답에 바뀐 칸 전체가 담김(최대 971줄·571 KiB). F26은 이번 과제다.
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
- D(수업 환경의 Graylog·Wazuh 실제 수집·검색·경보)는 이번 과제에서 새로 만든다. AI는 실제 Graylog·Wazuh로 확인하지 못하므로 사람이 확인한다.

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

현재 변경 전/후 판정 비교 설계: Claude (Claude Opus 5.5). 구현·검증: Codex (GPT-5).
