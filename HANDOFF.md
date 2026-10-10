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
- 작업: **Batfish 교차 검증 도구(로드맵 8번)**. 사용자가 2026-10-11 선택. Claude 스파이크(아래 「스파이크 결과」) 뒤 **설계 완료·사용자 승인(2026-10-11)** — 아래 「작업 정의」. 제품 코드 구현은 시작하지 않았다.
- 브랜치: `claude/batfish-design`(설계 문서 PR). 병합 뒤 Codex가 `main`에서 `codex/batfish-diff`를 만들어 구현한다.
- 다음 차례: **사용자(설계 PR 병합) → Codex(구현).** Codex에게 자동으로 메시지를 보내지 않았다.
- 직전 과제: 비차단 후속 묶음 **PR #56 병합 완료**(`dcc1a3e`). 운영 번들 `index-B3OOalhE.js`, 공개 주소 실습 02가 복귀·R2 경로 차단으로 시작함을 Claude가 확인. 확인 전 불일치 배지는 브라우저 미확인(단위 테스트로 갈음, 사용자 수동 QA 때 확인).
- 별도로 남은 사용자 확인:
  1. **운영 재판정 보류** — 운영 DB 기존 사례는 아직 `0.1.4` 판정. `netproof` 비밀번호 확보 뒤 `docs/deploy.md` 절차.
  2. Vercel `DATABASE_URL` → Production 전용으로(사용자).
  3. pfSense 2단계(**D5 실습 사실 5가지** 필요). 배포 후속(가입·검토자 지정·수동 QA A~E)은 사람 대기.

### 스파이크 결과 (Claude, 2026-10-11, 버린 코드 — 저장소 밖 임시 폴더, 커밋 안 함)
- 환경: Docker 29.6.2(메모리 8GB), 이미지 `batfish/allinone:latest` 2.24GB(`sha256:54cb0ed94fd9a3c1ca0985f73e5be479e955cee9b9f6a6799b66be3364fd8e5c`), `pybatfish 2026.09.17.3748`(임시 venv). 사용자가 Docker 기동·두 다운로드를 허락했다. 컨테이너는 `127.0.0.1`에만 열었고 끝나고 멈췄다.
- 방법: NetProof JSON → Cisco IOS(호스트는 기본 경로를 가진 Cisco 장비로), 호스트 쌍 × SSH·HTTP·HTTPS·DNS·Ping × session/one-way를 엔진 `verify`와 Batfish traceroute(왕복은 `bidirectionalTraceroute`)로 비교.
- 결과: **960건 중 PASS/DENY 958건 일치**, DENY 500건은 막힌 장비·단계까지 일치(장비 이름은 대소문자 무시 — Batfish가 소문자로 바꾼다). 대상: `cases/` 3건·고치기 해법 3건·편법/특수 ACL 2건(160건) + 고정 시드 무작위 ACL 40구성(사례 01 모양, eq·neq·lt·gt·range·established·와일드카드·ICMP echo/echo-reply·출력 ACL, 800건).
- 불일치 2건은 모두 ping 복귀: Batfish `bidirectionalTraceroute`가 복귀 ICMP를 **type 8(echo) 그대로** 만든다. 같은 구성에 echo-reply(type 0)를 직접 넣으면 Batfish도 엔진과 같은 장비·방향에서 막았다 → 엔진 버그 아님, 정식 도구는 복귀를 직접 만든다.
- 미확인: 정적 경로 무작위(사례 02 모양), pfSense 상태 추적, UNSUPPORTED·INVALID, 비연속 와일드카드. 기준은 Batfish 모델이지 실제 장비가 아니다.

## 작업 정의 — Batfish 교차 검증 도구 (Claude 설계, 2026-10-11 사용자 승인)

로드맵 「F5·F6 다음 기능 순서」 8번(④). 브랜치: `main`에서 `codex/batfish-diff`.

### 목표
실제 장비 결과가 아직 없는 동안, **독립 계산기 Batfish로 엔진 판정을 교차 검증**하는 재현 가능한 로컬 도구를 둔다. 결과 숫자를 「엔진을 믿을 근거」로 남긴다. 판정은 엔진만 한다(ADR-001). Batfish는 비교 기준이지 정답이 아니다.

### 변경 범위
**1. 도구 — 새 `scripts/batfish_diff.py`, 새 `scripts/requirements-batfish.txt`**
- 사람이 직접 실행하는 로컬 전용 도구. **CI·기본 pytest·배포에 넣지 않는다.** `pybatfish`는 `scripts/requirements-batfish.txt`에 `pybatfish==2026.09.17.3748`로 고정하고 운영 `requirements.txt`에는 넣지 않는다. `pybatfish` import는 실행 함수 안에서만 한다(아래 테스트가 pybatfish 없이 돌아야 함).
- 실행 예: Docker로 `batfish/allinone@sha256:54cb0ed94fd9a3c1ca0985f73e5be479e955cee9b9f6a6799b66be3364fd8e5c`를 `-p 127.0.0.1:9996:9996 -p 127.0.0.1:9997:9997`로 띄운 뒤 `python scripts/batfish_diff.py [--host localhost] [--seed 20261010] [--count 40] [--keep DIR]`. 엔진은 `engine/src`에서 import한다.
- **변환(NetProof JSON → Cisco IOS)**:
  - 라우터: `hostname`, 인터페이스마다 `ip address`·`ip access-group N in|out`·`no shutdown`, `routes` → `ip route`, 붙은 ACL의 원문 줄.
  - 호스트: 인터페이스 + `gateway`가 있으면 `ip route 0.0.0.0 0.0.0.0 게이트웨이`인 Cisco 장비로 흉내.
  - 인터페이스 이름: 접두사 `g`→`GigabitEthernet`, `s`→`Serial`, `eth`·`e`→`Ethernet`, `f`→`FastEthernet`(뒤가 숫자일 때). 그 밖의 이름이 있는 구성은 **변환 불가로 건너뛰고 건수와 사유를 보고**(추측 금지).
  - `stateful`·`rules_in`·`default_in`이 있는 장비가 있는 구성은 범위 밖으로 건너뛰고 보고.
- **비교**:
  - 출발 포트 50000(엔진과 같음). ICMP는 echo(type 8, code 0).
  - 엔진 결과가 `UNSUPPORTED`·`INVALID`인 통신은 비교에서 빼고 건수 보고.
  - one-way: Batfish 정방향 `traceroute` 하나. 모든 trace가 `ACCEPTED`면 PASS.
  - session: **`bidirectionalTraceroute`를 쓰지 않는다.** 정방향 `traceroute` + **직접 만든 복귀 패킷**의 `traceroute`(목적지 호스트에서 출발). 복귀: 주소 교환, TCP/UDP는 포트 교환, ICMP echo는 echo-reply(type 0, code 0). TCP 플래그는 정방향 SYN, 복귀 ACK(엔진 `established` 처리와 맞춤). 정방향이 PASS일 때만 복귀를 본다.
  - DENY 단계 대응: `DENIED_IN`→`acl_in`, `DENIED_OUT`→`acl_out`, `NO_ROUTE`·`NULL_ROUTED`·`NEIGHBOR_UNREACHABLE`·`INSUFFICIENT_INFO`·`LOOP`→`route`, 그 밖은 `other`(단계 비교에서 다름으로 셈). 막힌 장비는 마지막 hop 노드, **대소문자 무시**. 엔진 `decisive.device`·`step`과 방향(정방향/복귀)까지 비교.
- **대상**: `cases/*.json` 전부 + 고정 시드 무작위 구성 두 모양(모양마다 `--count`개):
  - A(사례 01 모양, 라우터 1대): 네 위치(g0/0·g0/1 × in·out)에 무작위 ACL(permit/deny, ip·tcp·udp·icmp, any·host·연속 와일드카드, eq·neq·lt·gt·range, tcp established, icmp echo·echo-reply, 끝 permit 있음/없음).
  - B(사례 02 모양, 라우터 2대): A와 같은 무작위 ACL + 두 라우터의 무작위 정적 경로(맞는 경로·누락·잘못된 다음 홉·더 넓은/좁은 prefix).
  - 통신: 구성의 호스트 순서쌍 × SSH·HTTP·HTTPS·DNS·Ping × session·one-way.
- **출력**: 요약 한 줄(비교 건수·결과 일치·결과 불일치·단계 비교/다름·제외 건수(변환 불가·범위 밖·UNSUPPORTED·INVALID)) + 불일치마다 JSON 한 줄(구성 이름·통신·엔진 결과·reason·Batfish 처리 결과·방향). 불일치 구성의 Cisco 설정을 `--keep` 폴더(기본 임시 폴더)에 남기고 경로를 출력. **불일치가 있으면 종료 코드 1**, 없으면 0. Batfish 연결 실패는 종료 코드 2와 실행 방법 안내.

**2. 테스트 — 새 `server/tests/test_batfish_diff.py`** (`test_qa_local.py`처럼 `importlib`로 스크립트를 읽는다. Docker·pybatfish 없이 돈다)
- 변환 결과 문자열(사례 01·02·03 각각의 핵심 줄: 인터페이스·주소·access-group·ip route·ACL 원문, 호스트 기본 경로).
- 인터페이스 이름 매핑과 모르는 이름 → 변환 불가 사유. 상태 추적 장비 → 범위 밖.
- 복귀 패킷 만들기: TCP 포트·플래그(SYN/ACK), UDP 포트, ICMP echo → echo-reply.
- 처리 결과 → 엔진 단계 대응표와 장비 이름 대소문자 무시.
- 같은 시드면 같은 무작위 구성(모양 A·B), 생성한 구성을 엔진 `verify`가 INVALID 없이 읽는다(무작위 구성이 엔진 입력 형식에 맞는지).
- `pybatfish`를 import하지 않고도 모듈을 읽을 수 있다.

**3. 문서 — 새 `docs/batfish-diff.md`, `docs/quality.md` 한 단락, 이 HANDOFF·`decisions/ai-work-log.md`**
- `batfish-diff.md`: 목적(교차 검증이지 정답 아님), 준비(Docker 이미지 digest·포트 127.0.0.1만·메모리 약 4GB·pybatfish 고정 버전), 실행·옵션·종료 코드, 변환 규칙, 비교 규칙, **알려진 의미 차이**(Batfish 왕복 추적의 ICMP 복귀 type 8 → 직접 복귀로 회피, 장비 이름 소문자, 호스트를 Cisco 장비로 흉내), 범위 밖(pfSense 상태 추적·UNSUPPORTED·INVALID·비연속 와일드카드·실제 장비), 마지막 실행 결과(날짜·시드·건수).
- `quality.md`: 「1-1. 실제 결과로 대조된 사례가 0건」 아래에 Batfish 교차 검증 결과 한 단락(실제 장비 대조를 대신하지 않는다는 문장 포함).

### 건드리지 않을 것
- `engine/`(계산·버전), `server/netproof_api/`, `web/`, DB, `cases/*.json`·`expect`, 운영 `requirements.txt`, `vercel.json`·배포 구성.
- 불일치가 나와도 **엔진을 고치지 않는다**. 그대로 보고하고 원인 분석은 별도 과제로.

### 예상 리스크
| 리스크 | 대응 |
| --- | --- |
| Batfish를 정답처럼 읽음 | 문서·출력에 「교차 검증, 정답·실제 장비 아님」 |
| Batfish 모델링 차이를 엔진 버그로 오인 | 알려진 의미 차이 목록, 불일치 구성 설정 보존해 재현 |
| 무작위 구성이 엔진에서 INVALID·UNSUPPORTED만 나옴 | 생성 구성 엔진 읽기 테스트, 제외 건수 출력 |
| 운영 의존성 오염 | 별도 requirements 파일, 운영 `requirements.txt` diff 0 |
| 컨테이너가 외부에 열림 | 127.0.0.1 바인딩만 문서화 |
| 실행이 오래 걸림 | 기본 모양마다 40개, `--count`로 조절, 실행 시간 출력 |

### 완료 조건 (Codex가 직접 실행해 출력 첨부)
1. `cd engine && ../.venv/Scripts/python -m pytest -q` → 489 passed·2 xfailed(변화 없음).
2. `cd server && ../.venv/Scripts/python -m pytest -q` → 174 passed·1 skipped에 `test_batfish_diff.py` 추가, 실패 0(pybatfish 미설치 venv에서).
3. `npm --prefix web test` → 643 passed(변화 없음).
4. **실제 실행**: Docker로 고정 digest 이미지를 띄우고 별도 venv에 `scripts/requirements-batfish.txt` 설치 후 `python scripts/batfish_diff.py`(기본값) 출력 전체 요약과 실행 시간. 목표는 불일치 0건이며, 불일치가 나오면 엔진을 고치지 말고 불일치 JSON과 보존한 설정 경로를 그대로 보고한다. 끝나면 컨테이너를 멈춘다.
5. `git diff --stat main... -- engine server/netproof_api web cases requirements.txt vercel.json` → **출력 없음**.
6. `git diff --check` 공백 오류 없음.
7. 리뷰(Claude): 같은 명령(4)을 직접 재현하고, 도구에 일부러 틀린 Batfish 결과가 들어가는 경우(예: 복귀를 type 8로 만드는 임시 변형)에 불일치 JSON과 종료 코드 1이 나오는지 확인한다(커밋하지 않음).

## 배포 기록 (2026-10-06)

### 배포 구성 (2026-10-06)
| 항목 | 내용 |
| --- | --- |
| Vercel | 프로젝트 `netproof`(Hobby, `myeongjundev`). `main`에 병합하면 Production으로 자동 배포, 브랜치를 올리면 Preview 배포. Application Preset `Other`(가져오기 화면이 폴더를 보고 `Services`를 골라서 바꿨다). 함수 지역 `icn1`(`vercel.json`) |
| 주소 | 공개 주소 `netproof-vert.vercel.app`. `netproof.vercel.app`은 다른 사람의 사이트다. `netproof-myeongjundev.vercel.app`과 배포별 주소는 Vercel 로그인으로 보호된다 |
| 환경 변수 | `DATABASE_URL`(아래 `netproof` 계정의 Transaction pooler 주소), `NETPROOF_SECURE_COOKIES=1`. 보안 로그 변수는 넣지 않았다(꺼짐) |
| DB 위치 | Supabase **t08 프로젝트(패스키 포트폴리오, 서울, 무료)** 안의 전용 공간. 무료 한도가 사람 기준 켜진 프로젝트 2개라 새 프로젝트를 만들 수 없었다(두 프로젝트 모두 사용 중). 사용자 결정(2026-10-06). 대안 중 Neon은 서울·도쿄 지역이 없고, Supabase Pro는 유료다 |
| DB 계정 | `netproof`(로그인 전용, 자기 비밀번호, 기본 `search_path = netproof`). 풀러 사용자 이름은 `netproof.<프로젝트ID>`, 포트 6543 |
| 스키마·표 | 스키마 `netproof`(소유 `postgres`, `netproof`에 USAGE·CREATE). 표 `users`·`sessions`·`cases`는 `netproof` 소유이고 RLS가 켜져 있다. `netproof` 계정에게 t08의 `public` 표는 0개 보인다 |
| Data API | t08에서 이미 꺼져 있다(8번 과제 설정). `netproof` 스키마는 노출 대상도 아니다 |

### 공개 주소 점검 (Claude, 로그인 없이, 2026-10-06)
| 항목 | 결과 |
| --- | --- |
| 화면 | 판정기·학습실(n8n 포함)·정책 검증·실습·사례 게시판이 1280px·375px에서 열림. 가로 넘침 0, 콘솔 오류 0, 375 헤더 68px |
| 판정 | 브라우저 판정하기 → 통과와 경로. API(synthetic-01): AI 답 PASS → `DISAGREE`, DENY → `AGREE`, 답 없음 → `NO_CLAIM`. `X-NetProof` 없으면 403 |
| 엔진 | `/api/policy-matrix`·`/api/change-impact` 200(`includeFiles`로 서버·엔진·사례가 함수에 실림) |
| DB | 없는 세션 쿠키로 `/api/auth/me` → `sessions` 조회 뒤 `{"user": null}` 200. 로그인 없이 `/api/cases` → 401 |
| 지역·속도 | 응답 `x-vercel-id`가 `icn1::icn1`(서울에서 실행). API 38~330ms(사용자 PC에서 잰 값) |
| 보안 헤더 | CSP·nosniff·no-referrer·X-Frame-Options DENY·HSTS. API는 `Cache-Control: no-store` |
| 빌드 | 번들 `index-D1dnOq1Z.js`가 PR #34 리뷰 때와 같다 |
- 가입·로그인·사례 저장·로그아웃은 실제 계정을 만드는 일이라 Claude가 하지 않았다(사람 확인 대기).

### 비밀값 처리 (2026-10-06 배포)
- 사용자가 "전부 진행"을 요청해서 `netproof` 계정 비밀번호는 Claude의 일회용 스크립트가 만들었다. 비밀번호와 연결 주소는 화면·채팅·저장소·캡처에 출력하지 않았고 사용자 클립보드로만 넘겼다. 비밀번호 관리자 저장, Vercel 입력, SQL Editor 실행은 사용자가 했다.
- SQL Editor에는 비밀번호 대신 SCRAM-SHA-256 확인값만 넣었다(SQL 기록·DB 로그에 원문이 남지 않게). t08의 DB 비밀번호는 쓰지 않았다.
- 연결 주소가 든 임시 파일이 Claude 세션의 임시 폴더(저장소 밖)에 남아 있다. **검토자 지정 뒤 지운다.** 그 뒤에는 사용자 비밀번호 관리자와 Vercel 환경 변수에만 있다.
- 처음에는 사용자 터미널에서 스크립트를 돌리고 클립보드로 SQL을 옮겼는데, 계정 SQL이 실행되지 않아 두 번 실패했다(앱 터미널 연동 오류로 Claude가 터미널 패널에 명령을 넣지도 못했다). Claude가 스크립트를 돌리고 사용자는 SQL Editor에서 Run만 누르는 방식으로 바꿔 끝냈다.
- 계정을 `postgres`에 다시 넘기는 문장(`GRANT netproof TO ...`)은 Supabase PostgreSQL 17.6에서 막힐 수 있다는 보고가 있어 뺐다. 바꾼 SQL은 슈퍼유저가 아닌 관리자와 같은 기본 경로를 흉내 낸 임시 PostgreSQL 17에서 두 번(처음·비밀번호 교체) 시험했다.

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)

- **PR #56 비차단 후속 묶음 (병합 완료, `dcc1a3e`, 2026-10-10, 설계 #55)**: PR #54 N1 `factual` 분기·`factualText` 제거(Claude 설계 과잉 정리, 과제 근거도 일반 결과 패널), PR #52 N1 decisive가 복귀에서 유일하면 복귀 마지막 단계로 시작, PR #47 N1 `ActualBadge` 확인 전 `판정과 다름/같음`, N2 저장 안내 `저장했습니다: 사례 #N.`. 화면만 변경. Claude 리뷰 PASS. 최종: 엔진489+2xfail·서버174+1skip·웹643·빌드 성공(`index-B3OOalhE.js`), 운영 반영 확인.
- **PR #54 고치기 과제 (병합 완료, `bfb7b4f`, 2026-10-10, 설계 #53)**: 학습실 「고치기 과제」 3개(`#/fix/:id`, 합성 01~03 처음 구성 + 승인된 목표 통신). 확인하기 한 번에 `policy-matrix`(목표 같음/다름/판정 불가)와 `change-impact`(처음 구성 대비 목표 밖 변화, 목표 칸은 화면에서만 제외), 근거 보기는 `verify` + 구성도·재생. 점수·완료 배지 없음, 사실 문장은 전부 같음·밖 변화 0·미비교 0일 때만. 구성은 App 메모리(`fixDrafts`)만. 서버 테스트로 처음엔 미해결·테스트 안 해법으로 풀림 확인(해법은 `server/tests/test_fix_exercises.py`에만, 번들 검색 0). **엔진·서버 API·cases·DB·배포·의존성 0줄.** Claude 리뷰 PASS(편법 HTTPS만 허용 → 목표 밖 「새로 막힘」으로 드러남 실브라우저 확인). 최종: 엔진489+2xfail·서버174+1skip·웹629·빌드 성공(`index-BW8VCTzY.js`), 운영 반영 확인.
  - 유지되는 합의: 목표는 문제의 요구사항이지 정답이 아니다. 과제 문구에 고칠 장비·규칙·원인을 쓰지 않는다. 검사한 서비스·호스트 쌍 밖은 알 수 없다고 말한다.
- **PR #52 구성도·경로 재생 (병합 완료, `802fd76`, 2026-10-10, 설계 #51 포함 — 사용자 지시로 설계·구현 모두 Codex)**: 판정기·실습·사례 상세·정책 행렬에 판정 당시 network·flow로 만든 구성도(CIDR 구간 소속 선, 장비12·구간24 상한 뒤 경로 장비·목록 fallback)와 엔진 hops의 방향별 재생(1초 간격, 편집·숨김·reduced motion 시 정지), `firewall_in`·`state` 표시, 유일하게 일치하는 decisive에만 결정 단계 표시. **엔진·서버·cases·DB·배포·의존성 0줄.** Claude 리뷰 PASS(실브라우저 1280·375, 겹침·넘침·콘솔 0). 최종: 엔진489+2xfail·서버165+1skip·웹563·빌드 성공(`index-BHD-u76S.js`), 운영 반영 확인.
  - 유지되는 합의: 그림 선은 입력 주소 구간 소속이지 실제 배선이 아니다. 기록되지 않은 연결을 그리지 않는다. 재생은 받은 응답의 커서이고 API를 부르지 않는다.
  - 남은 비차단: N1 복귀에서 막힌 DENY도 처음엔 정방향 「도착」 선택(처음 방향 변경은 사용자 결정), N2 단계 목록이 선택한 방향만.
- **PR #50 export note 조사 오류 수정 (병합 완료, `d7dabff`, 2026-10-10)**: PR #49 비차단 N1을 조사 없는 `엔진 판정(DENY) ≠ 확인된 실제 결과(PASS) — 사례 #N`으로 정리하고 양방향 내보내기 문구·expect 보존을 시험했다. Claude 리뷰 PASS(차단 0). 엔진489+2xfail·서버165+1skip·웹485·빌드 성공. 운영 재판정은 계속 보류.

- **PR #49 불일치 회귀 테스트·엔진 버전별 재판정 (병합 완료, `cd23e46`, 2026-10-10)**: 엔진 0.2.0(PR #44 의미 변경 포함), known_mismatch strict xfail·별도 형식 검사, export 선택 필드, 기존 _judge 기반 100건 커밋·멱등 rejudge/dry-run. 확인·actual_*·updated_at 유지. Claude 리뷰 PASS, 엔진489+2xfail·서버164+1skip·웹485·빌드 성공, 임시 SQLite 독립 실연과 xfail/XPASS 확인. 운영 재판정은 보류. 비차단 N1(export note 조사)은 PR #50으로 해결·병합 완료.
- **PR #47 학습 → 실습 → 기록·복습 흐름 강화 (병합 완료, `225a618`, 2026-10-10)**: 실습 화면 ⑤ 기록하기(판정 결과가 최신일 때만, 기존 `POST /api/cases`), 사례 상세 「다시 살펴보기」(저장된 원인 태그로 관련 학습 주제, 받은 답↔계산·계산↔실제 두 비교), `GET /api/cases?actual_mismatch=1`(확인 필터와 함께면 대시보드 `mismatches_total`과 같음), 게시판 바로가기 3개. **엔진·`cases/`·DB·배포 구성 변경 0줄.** Claude 리뷰 R1(저장 중 재판정·편집 뒤 조용히 저장돼 다시 누르면 중복 — Claude 설계 누락) → Codex 수정 `64a2460` → 재리뷰 PASS → 최신 커밋 재검증 PASS. 최종 실행: 엔진 478 passed·2 xfailed, 서버 157 passed·1 skipped, 웹 485 passed, 빌드 성공.
  - 유지되는 합의: 실습 입력은 `practiceDrafts`, 저장은 서버 재판정. 관련 개념은 원인 태그로 고른 주제이고 정답·채점이 아니다(DENY만 연결). 「내 예상 ≠ 계산」과 「계산 ≠ 실제 결과」는 다른 조건이다.
  - 남은 비차단 후속: N1 상세에서 미확인 불일치가 `확인 전 · PASS`로만 보임, N2 `사례 #N으로` 조사.
- **PR #44 pfSense 상태 추적 계산 1단계 (병합 완료, `b050348`)**: 엔진에 **제한된 상태 추적**을 더했다(ADR-016 신설). `stateful: true` 장비의 인터페이스에 pfSense 화면과 1:1인 구조화 규칙 `rules_in`·`default_in`, 들어오는 방향 1차 일치, `session` 복귀는 **정방향이 지난 그 장비에서만** 규칙을 건너뛴다. 새 파일 `engine/firewall.py`(일치 계산은 기존 `acl.py` 재사용, 새 파서·새 숫자 변환 없음), `docs/semantics.md` §14, 서버는 `rules_in` 상한 500만. **`web/`·`cases/*.json`·DB·배포 구성 변경 0줄**(D2: 화면은 후속). Claude 리뷰 R1(상태 없는 복귀 장비를 `default_in`만 보고 단정) → Codex 수정 `a057d79` → **재리뷰 PASS**. 최종 실행: 엔진 478 passed·2 xfailed, 서버 149 passed·1 skipped, 웹 440 passed(그대로).
  - 유지되는 합의: **상태는 규칙만 건너뛰고 경로는 건너뛰지 않는다**(복귀 경로가 없으면 상태가 있어도 DENY). **모르면 차단으로 단정하지 않고 판정 불가**(사용자 D4) — 기본 정책 미기재, 복귀 추적 중 상태 없는 상태 추적 장비(프로토콜·규칙·기본 정책과 무관), 기존 연결 상태에 기댄 패킷, NAT·floating·스케줄·XML 가져오기 등은 `UNSUPPORTED`. 기존 **무상태 ACL 동작은 그대로**(Claude 독립 A/B 6,000건 불일치 0). **실제 pfSense 장비와 대조하지 않았다**(D5).
  - 남은 후속: ① 2단계 실습 연동(D5 확인 뒤) ② pfSense 화면 입력 ③ 방화벽 원인 태그(지금은 `firewall_in` 차단이 전부 `분류 못 함`) ④ 네트워크 JSON의 추가 최상위 키가 전부 미지원 처리되는 점(화면 과제에서 `toNetwork` 키를 엔진 지원 필드와 먼저 대조) ⑤ 미대조 문구를 화면 패널에 한 번만 보이기.
- **PR #41 원인 태그·통계 (병합 완료, `329e74c`)**: 저장된 판정 JSON만 읽는 엔진 순수 함수 `cause`(태그 9개 + 방향, 네트워크를 다시 읽거나 재판정하지 않음), 검토자 대시보드 「가장 많이 틀린 원인 Top 5」(분모 `comparison=DISAGREE`, 복귀 건수, 그 외·분류 못 함·세 제외, 상한 2,000건 표시), 사례 상세 판정 카드 제목의 `원인 태그(통계)`. `docs/semantics.md` §13 신설. **DB 표·열·판정 경로(`verify.py`·`trace.py`)·`cases/*.json`·`/api/verify`·사례 목록·혼동 행렬은 변경 0줄.** Claude 리뷰 R1(판정 불가 사례에도 원인·방향 표시)·R2(원인 줄이 패널 밖에 떠 있고 판정 문장과 중복) → Codex 수정 `aa29f2a` → **재리뷰 PASS**. 최종 실행: 엔진 382 passed·2 xfailed, 서버 149 passed·1 skipped, 웹 440 passed, 빌드 성공.
  - 유지되는 합의: **집계 ≠ 판정.** 원인은 엔진 근거를 묶은 이름이고 정답·채점이 아니다. 분류 못 하면 **`분류 못 함`으로 두고 추측하지 않는다.** `UNSUPPORTED`·`INVALID`는 태그도 분모도 아니며 화면에도 원인·방향을 적지 않는다. 원인은 **혼동 행렬(오탐·미탐)과 다른 축**이라 `DISAGREE`에서 오탐·미탐을 유도하지 않는다.
  - 남은 후속: 원인별 사례 목록 필터는 저장 열이 필요해 넣지 않았다(다음 과제). 사람이 붙이는 원인 태그(설계 D1의 선택지 b)도 별도 과제로 미뤘다.
- **PR #34 n8n 연동 예시 + 학습실 n8n 주제 + F27·F29 (병합 완료, `1fef9b6`)**: `examples/n8n` 워크플로(웹훅 2 → HTTP Request 4.2 → Code 2 → Respond to Webhook 1.1, `X-NetProof` 헤더, `comparison`만 쓰는 문장)·`request.json`(사례 01 + AI 답 PASS)·`docs/n8n.md`(Docker n8n에서 `host.docker.internal`, 서버는 `--host 0.0.0.0`, 선택 알림), 학습실 n8n 주제와 도구 주제 일반화, F27(server pytest가 worktree 엔진 사용)·F29(서버 테스트가 로그 환경 변수를 끔). Claude 리뷰 R1(n8n 출처 404 두 개 — Claude 설계 실수, 확인 문장, F29 빈틈, Docker 이미지) → 재리뷰 PASS. 수동 QA E(수업 Docker n8n)는 사람 대기.
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
- [x] **배포** — 2026-10-06 공개 주소 https://netproof-vert.vercel.app (가입·검토자 지정 확인은 사람 대기)

**F5·F6 다음 기능 순서 (2026-10-05 사용자 합의 — 아래 4·5주차 목록의 순서를 대신한다)**
수업은 Cisco·pfSense를 쓰지 않고 Cloudflare·Graylog·Wazuh·n8n·Kali Linux를 쓴다. 기능마다 설계 → 승인 → 구현 → 리뷰 → 병합 한 바퀴. 11-01 기능 동결 원칙은 그대로다.
1. [x] 변경 전/후 판정 비교 — ② PR #32 병합(`baf6501`)
2. [x] NetProof 로그인 실패·계정 잠금 기록을 Graylog·Wazuh로 보내기(로컬 시연) + 학습실 Graylog·Wazuh 주제 + F26 — PR #33 병합(`0a53519`). 실제 수집은 수동 QA D(사람)
3. [x] n8n 연동 예시 + 학습실 n8n 주제 + F27·F29 — PR #34 병합(`1fef9b6`). 실제 Docker n8n은 수동 QA E(사람)
4. [x] 원인 태그·통계("가장 많이 틀린 원인 Top 5") — ⑤ PR #41 병합(`329e74c`). 운영 화면 확인은 검토자 계정 생성 뒤
- [x] **pfSense 상태 추적 계산 1단계(이슈 #40, 순서 밖·수업 장비)** — PR #44 병합(`b050348`). 2단계 실습 연동은 D5 확인 뒤, 화면 입력은 후속
5. [x] 불일치 사례 → 회귀 테스트 내보내기, 엔진 버전별 재판정 — ④ **PR #49 병합(`cd23e46`), 운영 재판정은 비밀번호 미확보·사용자 요청으로 보류. 비차단 N1 문구는 PR #50 병합(`d7dabff`)으로 해결**
6. [x] 구성도 그림 + 경로 재생 — ② PR #52 병합(`802fd76`, 설계 #51 포함). [설계·제품 화면](docs/topology-playback-design.md)
7. [x] 연습 문제 모드 다시 정의("채점" 없이, AGENTS.md 원칙) — ⑤ 「고치기 과제」로 정의. 설계 PR #53, 구현 PR #54 병합(`bfb7b4f`)
8. [ ] Batfish 차등 테스트(엔진 검증용, 수업과 거리 있어 낮춤) — ④ **(진행 중: 스파이크 960건 중 958 일치·2건은 Batfish ICMP 복귀 모델링, 2026-10-11 정식 로컬 도구 설계 승인)**
- Kali: 기존 실제 결과 붙여넣기(PR #16, Nmap·ping)가 수업과 맞는다. Cloudflare 활용은 수업 용도를 확인한 뒤 정한다.

**4주차 (10-19~10-25) — 사용자 테스트 주간, 기능은 병행** (항목은 위 순서로 옮김)
- [x] 수정 후보 제안("무엇을 바꾸면 통하나") — ② **PR #19 병합 완료, 8be25a8**

**6주차 (11-02~11-08)**: 버그 수정만, 2차 테스트, 발표·제출

**사람 트랙 (동시에, LLM에 넘기지 않음)**
- [ ] 동기 3명 인터뷰 · [ ] 실제 결과가 있는 사례 모으기(붙여넣기 기능의 재료) · [ ] 사례 04 손계산
- [x] **수업 ACL이 Cisco인지 pfSense인지 확인** — 둘 다 아님(2026-10-05). 수업 도구는 Cloudflare·Graylog·Wazuh·n8n·Kali Linux 등 · [x] **오탐·미탐 양성 정의: 통신 차단(DENY)** · [ ] 표어 결정
- [x] 배포(2026-10-06, 가입·검토자 지정 확인은 대기) · [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

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
- **사용자:** 운영 DB rejudge는 보류 중이다. 비밀번호 확보 뒤 재개하며 주소는 가려진 입력으로만 받는다. Vercel DATABASE_URL의 Production and Preview 적용을 Production 전용으로 변경한다(Codex는 설정을 바꾸지 않음).
- **Claude(리뷰):** 고치기 과제 구현 PR의 위 시험 기록과 완료 조건 7을 확인한다. 엔진·서버 API·DB·`cases/` 변경 0줄, 해법은 서버 테스트 안에만, 번들 검색 0건, 과제 문구·부분 실패·늦은 응답 폐기·App 메모리를 대조한다.
- **Claude(리뷰):** 엔진 diff가 있는 PR은 `docs/semantics.md` §15에 따라 버전을 올렸는지 대조한다. `rejudge` 보고서에 사례 제목·닉네임이 없어야 한다.
- **사용자:** D5(실습 사실)를 주면 2단계를 설계한다. 그다음 기능도 사용자가 정한다. 배포 후속(가입·사례 저장·로그아웃·검토자 지정·Vercel 환경 변수)과 수동 QA A~E는 사람이 확인한다.
- **다음 설계자(Claude):** pfSense 규칙은 `docs/semantics.md` §14와 ADR-016이 기준이다. **모르면 판정 불가**가 이 기능의 핵심 합의다. 실제 장비와 대조하기 전에는 일치한다고 적지 않는다.
- **다음 설계자(Claude):** 과제마다 설계 → 승인 → 구현 → 리뷰 → 병합 한 바퀴다. 원인 태그 규칙은 `docs/semantics.md` §13이 기준이고 바꾸려면 먼저 요청한다. 원인은 판정이 아니다.
- **검토자 지정(7단계):** `make-reviewer`는 `netproof` 계정 연결 주소로 실행한다(`docs/deploy.md` 7). 주소는 채팅·명령줄·캡처에 넣지 않는다.
- **배포 흐름:** `main`에 병합하면 바로 운영에 나간다. 리뷰 원칙은 그대로이고, 병합 뒤 공개 주소에서 바뀐 화면·API를 한 번 확인한다.
- **t08 Postgres 오류:** 배포 전 t08 대시보드에 최근 60분 Postgres 오류 111건이 일정한 간격으로 보였다(NetProof와 무관, 원인 미확인). 사용자가 Supabase Logs에서 확인한다.
- **남은 후속:** F28 change-impact 응답에 바뀐 칸 전체가 담김(최대 971줄·571 KiB), F2 용어 통일, F3 받은 답 종류·중복 정리.
- 접기는 CSS(`.mobile-fold`)로만 하고 React로 `open`을 관리하지 않는다. 넓은 화면은 지금과 같아야 한다. 판정기는 접지 않는다.
- 실습 입력은 `practiceDrafts`에만 두고 판정기 `draft`는 `판정기로 가져가기`(기존 되돌리기) 때만 바꾼다. 실습 판정은 verify, ⑤ 기록은 기존 createCase를 부르고 서버가 재판정해 저장한다. 승인된 다른 통신 영향은 단추로 change-impact를 요청하고 비교·분류를 화면에서 다시 계산하지 않는다(ADR-001). 정답·채점·완료 표시를 만들지 않는다.
- 첫 방문 안내 줄과 테마의 localStorage는 try/catch. 떠 있는 투어는 만들지 않는다. cases JSON은 테스트에서만 import한다.
- 수동 QA 결과는 사람이 `docs/qa-manual.md`로 기록한다. AI가 대신 완료로 바꾸지 않는다.
- 판정기 규칙(배너 문장, 되돌리기 한 단계, 즉시 검사가 판정을 막지 않음, ACL 점검 펼침 조건)을 바꾸고 싶으면 먼저 요청한다.

## 사용자 수동 QA 대기 (배포 확인 + PR #20 G2·삭제 취소 + 홈·실습 흐름 + 수업 도구)
- **배포 6단계(가입·사례 저장·로그아웃)·7단계(검토자 지정): 사람 확인 대기.** Claude의 공개 주소 점검은 로그인 없이 할 수 있는 것만이다.
- **A(PR #20 G2)·B(실제 기본 확인창 삭제 취소)·C(홈·실습 흐름): 사용자 수동 확인 대기.** 도구 실행 확인과 F15·F17 구현 검증은 수동 QA 통과가 아니다.
- 병합 뒤 [체크리스트](docs/qa-manual.md)와 `scripts/qa_local.py`로 사람이 직접 확인한다. 결과는 사람이 PR 코멘트나 이 절에 적는다. 비밀번호·쿠키·토큰은 기록하지 않는다.
- 원칙: 임시 DB·합성 계정/사례만 쓴다. 실제 기본 확인창을 대체·우회하지 않는다. 비밀번호·쿠키·토큰을 기록하지 않는다. 확인한 항목만 완료로 바꾼다.
- C에 변경 전/후 항목을 더했다(PR #32). `판정기로 가져가기` 항목은 빈 판정기에서 알림이 없다는 점(PR #31 F5)을 반영해 고쳤다(PR #32 리뷰).
- D(수업 환경의 Graylog·Wazuh 실제 수집·검색·경보)는 체크리스트에 신설했고 **사용자 확인 대기**다. AI의 로컬 파일·UDP 확인은 실제 도구 수집 확인이 아니다.
- E(수업 Docker n8n에서 예시 워크플로 가져오기·실행)는 체크리스트에 신설했고 **사용자 확인 대기**다. AI의 API·스크립트 대역 검사는 실제 n8n 실행 확인이 아니다.

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
- **worktree에서 서버 테스트(F27):** server/pyproject.toml의 pythonpath에 ../engine/src를 추가해 PYTHONPATH 없이 해당 worktree 엔진을 쓴다. 이번 전체 실행과 경로 assert로 확인했다.
- **표시 ≠ 판정.** 판정기 개선은 엔진이 준 `result`·`comparison`·`problems`를 보여 주는 방식만 바꾼다.
- **NetProof DB는 t08 프로젝트에 기대어 있다.** t08을 멈추거나 지우면 NetProof도 멈춘다. Supabase 무료 프로젝트는 오래 쓰지 않으면 멈출 수 있고, 멈춘 지 90일이 지나면 다시 켤 수 없다. t08의 DB 비밀번호를 바꿔도 NetProof는 영향이 없다. `netproof` 비밀번호를 바꾸면 Vercel `DATABASE_URL`도 바꾸고 다시 배포한다.
- 주 작업 폴더(`C:/gov/project/skt aleph/netproof`)는 이제 `main`이다. 2026-10-05까지 `codex/acl-suggest`에 머물러 있어서 공유 venv가 옛 엔진을 불러왔다.
- [HOME_HANDOFF.md](HOME_HANDOFF.md)는 2026-10-02 집 인계 시점 기록이다. 현재 상태는 이 문서가 기준이다.
- 날짜별 작업 정리: [10-04 ~ 10-06 첫 배포](docs/work-summary-2026-10-04_06.md), [10-06 배포 이후](docs/work-summary-2026-10-06.md).

현재 과제(pfSense 상태 추적 1단계) 설계: Claude Opus 5(사용자 승인 2026-10-06). 구현·수정: Codex (GPT-6), R1 수정·재검증 완료. 리뷰: Claude 재리뷰 대기. 직전 과제(원인 태그·통계) 설계·리뷰: Claude Opus 5, 구현: Codex (GPT-6), 2026-10-06 병합. 결정·병합: 사용자.
이전 배포 작업: 단계 안내·DB 준비 스크립트·공개 주소 점검·문서 Claude (Claude Opus 5.5). 가입·SQL 실행·Vercel 입력·병합: 사용자.

## 프로젝트 소개·회고 문서 (2026-10-06)

- 사용자 요청: 대화에서 정리한 NetProof 소개와 다섯 단계 회고를 Markdown으로 저장한다. 이번 문서 작업은 사용자가 직접 요청한 별도 범위다.
- 브랜치: `codex/project-retrospective`, 기준 `main` `329e74c`.
- 결과물: [프로젝트 소개와 개발 과정 회고](docs/netproof-retrospective-2026-10-06.md).
- 내용: 문제 발견 → 접근 → 시행착오 → 피드백 반영 → 배운 점, 내부 네트워크 수업 구성, 구현 상태와 pfSense 계획 구분, 설명용 짧은 소개와 근거 링크.
- 최신화: GitHub에서 PR #41의 병합(`2026-10-06T03:22:38Z`)을 확인해 회고에 반영했다. 공개 사이트의 신규 기능 반영은 이번 작업에서 확인하지 않았다. 위 원인 태그 과제 기록은 별도 이력으로 유지한다.
- 제품 코드·화면 변경 없음. pfSense 설계나 구현을 수행하지 않았고, 실제 실습·사람의 수동 QA를 완료로 바꾸지 않았다.
- 상태: `main`에 들어갔다(`5199532`). Claude 확인(2026-10-06): 링크 8개 유효, AI 답 기록 16행(CLCO 12 + qwen3.5:9b 4)·판정 불일치 0건, 합성 사례 3개로 본문과 맞는다. **고칠 곳 두 군데** — ① 「원인 태그·불일치 원인 Top 5」의 "공개 사이트 반영 미확인"은 **반영 확인됨**(번들 해시가 리뷰 때 빌드한 것과 같다) ② "HANDOFF에 병합 대기 문구가 남아 있다"는 PR #42에서 해소됐다. 작성자가 고친다.

실제 실행한 테스트 출력(2026-10-06):

```text
cd engine && ../.venv/Scripts/python -m pytest -q
382 passed, 2 xfailed in 4.45s

cd server && ../.venv/Scripts/python -m pytest -q
149 passed, 1 skipped in 26.65s

npm --prefix web test
Test Files  32 passed (32)
     Tests  440 passed (440)
  Duration  2.52s (transform 52%, import 30%, tests 10%, worker 8%)
```

`git diff --check` 오류 없음. 화면을 변경하지 않아 web build는 실행하지 않았다.

Codex (GPT-6)
