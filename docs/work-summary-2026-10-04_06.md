# NetProof 3일 작업 정리 (2026-10-04 ~ 10-06)

작성: Claude (Opus 5.5), 2026-10-06
근거: `git log`(origin/main), `decisions/ai-work-log.md`, PR 리뷰 코멘트, 배포 뒤 공개 주소 점검 결과

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 병합한 PR | 16개 ([#19](https://github.com/myeongjundev/netproof/pull/19) ~ [#34](https://github.com/myeongjundev/netproof/pull/34)) |
| 첫 배포 | https://netproof-vert.vercel.app (Vercel 함수 서울 `icn1` + Supabase 서울, `main` `1fef9b6`) |
| 테스트 | 엔진 326 → 350 (+2 xfail), 서버 91 → 140 (+1 skip), 웹 128 → 417 |
| 진행 방식 | Claude 설계 → 사용자 승인 → Codex 구현·테스트 → Claude 독립 리뷰(테스트 직접 실행, 실제 브라우저) → 사용자 병합 |

## 날짜별 기록

### 10-04: 판정기·홈·학습실 다듬기, QA 도구 (PR 10개 병합)

| PR | 내용 | 리뷰 |
| --- | --- | --- |
| #19 | ACL 수정 후보: 막힌 통신을 통과시키는 ACL 줄을 엔진이 다시 판정해서 제안 | PASS. 독립 구현과 무작위 6,000회 대조, 불일치 0 |
| #20 | 사례 게시판 학습형 화면(시작 안내, 목록과 모바일 카드, 받은 답 출처 분리) | PASS |
| #21 | 판정기 비교 배너, 덮어쓰기·삭제 되돌리기, Ctrl+Enter, 점검·후보 접기 | R1(IPv4 즉시 검사) → PASS |
| #22 | 병합 뒤 HANDOFF·작업 기록 정리(문서) | PASS |
| #23 | 홈, 학습실(3주제), 모바일 헤더, 입력 복귀 | PASS |
| #24 | 홈 예상 퍼즐, 두 얼굴 홈, 학습 경로(홈 critique 27/40 기반) | R1~R4(메뉴 키보드 순서, 제목 단계, 예시 단추가 답을 미리 보여 줌) → PASS |
| #25 | 홈·학습 2차: 계산 범위 띠, 퍼즐 주 행동, 실습마다 예상 | PASS |
| #26 | 비교 배너 중립 문장, 실습 이어서 하기와 다음 실습 | PASS |
| #27 | 후속 F15~F17, 로컬 QA 도구(`scripts/qa_local.py`), 수동 QA 체크리스트(`docs/qa-manual.md`) | PASS |
| #28 | QA 서버가 빈 연결 하나에 멈추던 문제 수정(동시 연결 처리) | PASS. #27 리뷰에서 순차 요청만 확인해 놓친 결함 |

- 홈 critique 점수가 27 → 26 → 26 → 25로 더 오르지 않았다. 다음 판단은 학생 관찰로 하기로 했다.
- 실습 모드는 프로그래머스 화면을 참고해 설계했다. 1차 설계에서는 결과가 첫 화면 아래로 밀려서 2차로 다시 설계했다. 구성은 왼쪽, 내 예상과 결과는 오른쪽에 두고 칸 번호 ①~④를 달았으며, 라이트 테마를 기본으로 했다.

### 10-05: 실습 화면 완성, 로드맵 1~3 (PR 6개 병합)

| PR | 내용 | 리뷰 |
| --- | --- | --- |
| #29 | 전용 실습 화면(`#/practice/:id`), 판정기와 입력 분리, 라이트 기본 | PASS |
| #30 | 휴대폰에서 구성 접기(F18·F4), F19~F23 | R1(폭 360에서 ③ 칸 맞추기) → PASS |
| #31 | F5 빈 템플릿 알림 제거, F6 조사 오류 7곳 | PASS(후속 F24 발견) |
| #32 | 로드맵 1. 변경 전/후 판정 비교와 다른 통신 영향(엔진 `change_impact`, `POST /api/change-impact`) | PASS. 무작위 3,000회 대조, 불일치 0 |
| #33 | 로드맵 2. 로그인 실패·잠금 기록을 파일·syslog로 남겨 Graylog·Wazuh로 보냄, 학습실 도구 주제, F26 헤더 | PASS. 실제 서버와 UDP 수신기로 파일 10줄 = UDP 10개, 비밀번호 0건 확인 |
| #34 | 로드맵 3. n8n 연동 예시(웹훅 → `/api/verify` → 결과 응답), 학습실 n8n 주제, F27·F29 | R1(n8n 문서 링크 404 두 개 등, Claude 설계 실수) → PASS |

- 로드맵을 합의했다. 수업에서 Cisco·pfSense를 쓰지 않으므로 Cisco 설정 붙여넣기는 뺐다. 수업 도구(Graylog·Wazuh·n8n)와 이어지는 기능을 앞에 두었다.

### 10-05 밤 ~ 10-06: 첫 배포

1. **0단계:** 주 작업 폴더가 옛 브랜치(`codex/acl-suggest`, main보다 81커밋 뒤)에 있어서 최신 `main`으로 바꿨다.
2. **Supabase:** 무료 한도는 조직이 아니라 사람 기준이어서(켜진 무료 프로젝트 2개) 새 프로젝트를 만들 수 없었다. 두 프로젝트 모두 쓰는 중이라 **t08(패스키 포트폴리오, 서울) 안에 NetProof 전용 계정과 스키마**를 두기로 했다.
   - 전용 계정과 전용 스키마의 이름은 모두 `netproof`다. 표 3개(`users`·`sessions`·`cases`)는 `netproof` 계정 소유이고 RLS가 켜져 있다.
   - `netproof` 계정에게는 t08 표가 하나도 보이지 않는다. t08의 표·비밀번호·설정은 바꾸지 않았다.
   - SQL Editor에서 실행한 SQL에는 비밀번호 대신 SCRAM 확인값만 들어 있다. 비밀번호는 스크립트가 만들었고 화면에 출력하지 않았다.
   - 처음에는 사용자가 터미널과 클립보드를 오가는 방식으로 했는데, 계정을 만드는 SQL이 실행되지 않아 두 번 실패했다. 그래서 Claude가 스크립트를 돌리고, 사용자는 SQL Editor에서 Run만 누르는 방식으로 바꿔서 끝냈다.
   - 계정을 `postgres`에게 다시 넘기는 문장은 Supabase PostgreSQL 17.6에서 막힐 수 있어서 뺐다. 바꾼 SQL은 같은 조건의 임시 PostgreSQL에서 먼저 시험했다.
3. **Vercel:** GitHub 앱에 `netproof` 저장소를 허용했다. 가져오기 화면의 Application Preset은 `Services`에서 `Other`로 바꿨다(`vercel.json` 하나로 화면과 API를 함께 배포). 환경 변수는 `DATABASE_URL`과 `NETPROOF_SECURE_COOKIES=1` 두 개다.
   - `netproof.vercel.app`은 다른 사람의 사이트라서 우리 주소는 `netproof-vert.vercel.app`이 되었다.
4. **공개 주소 점검(로그인 없이):**

| 항목 | 결과 |
| --- | --- |
| 화면 | 판정기, 학습실(n8n 포함), 정책 검증, 실습, 사례 게시판이 1280px와 375px에서 열림. 가로 넘침 0, 콘솔 오류 0 |
| 판정 | 브라우저에서 판정하면 통과와 경로가 나옴. API로는 AI 답 PASS → DISAGREE, DENY → AGREE, 답 없음 → NO_CLAIM. `X-NetProof` 헤더가 없으면 403 |
| 엔진 | 정책 매트릭스·변경 영향 API 200 |
| DB | 없는 세션 쿠키로 `/api/auth/me`를 부르면 DB를 조회한 뒤 `user: null`. 로그인 없이 `/api/cases`를 부르면 401 |
| 지역 | `x-vercel-id`가 `icn1::icn1`이라 함수가 서울에서 실행됨. API 응답 38~330ms(이 PC에서 잰 값) |
| 보안 헤더 | CSP, nosniff, no-referrer, X-Frame-Options DENY, HSTS. API 응답은 `Cache-Control: no-store` |
| 빌드 | 번들 이름 `index-D1dnOq1Z.js`가 #34 리뷰 때와 같음 |

## 사용자 결정

- **10-04**
  - #24에서 예시 단추가 답을 미리 보여 주는 문제(P0)는 같은 PR에서 고치고, F9~F11도 함께 고친다.
  - 비교 배너는 중립 문장과 근거 안내로 한다. 이어서 하기에는 실습 이름과 다음 실습을 보인다.
  - 수동 QA는 준비 도구와 체크리스트로 한다. F17 개념 질문은 부제로 둔다.
  - 실습 모드 1차: 판정기와 입력 분리, 휴대폰은 위아래로 쌓기, 결과는 판정과 근거만.
  - 실습 모드 2차: 구성은 왼쪽, 결과는 오른쪽, 칸 번호, 라이트 테마 기본.
- **10-05**
  - 폭 360에서 ③ 칸 맞추기는 #30 안에서 한다.
  - 수업에서 Cisco·pfSense를 쓰지 않으므로 Cisco 붙여넣기를 빼고, 다음 기능 순서를 정했다.
  - 변경 비교: 판정한 통신과 다른 통신 영향을 함께 본다. 기준은 직전 판정이고, 판정기와 실습 양쪽에 넣는다. 영향 계산은 단추를 눌렀을 때만 한다.
  - 보안 로그: 학습실에는 도구별로 두 주제를 두고, 기록은 파일과 syslog 둘 다 남긴다. F26도 함께 한다.
  - n8n: AI 답은 웹훅으로 받는다. 결과는 웹훅 응답으로 돌려주고, 불일치 알림은 선택으로 둔다. 학습실에 n8n 주제를 넣고, 수업은 Docker로 설치한 n8n을 쓴다.
  - #34 병합 뒤 다음 일은 배포다.
- **10-06**
  - DB는 t08 안의 전용 공간에 둔다(무료, 서울).

## 남은 일

### 사람이 할 일
1. 배포 사이트에서 가입하고 사례를 저장한 뒤, 사례 게시판에서 보이는지 확인하고 로그아웃한다. 닉네임을 Claude에게 알려 주면 Claude가 검토자로 지정한다(배포 7단계).
2. (권장) Vercel의 `DATABASE_URL`을 Production에만 둔다. 미리보기에서도 API가 필요하면 Preview에만 `sqlite:////tmp/netproof.db`를 넣는다.
3. 수동 QA(`docs/qa-manual.md`) A~E를 한다.
   - A: 사례 게시판 G2 화면
   - B: 삭제 취소 확인창
   - C: 홈과 실습 흐름
   - D: 수업 Graylog·Wazuh
   - E: 수업 Docker n8n
4. t08 Postgres 오류의 원인을 확인한다(Supabase → Logs). 최근 60분에 111건이 일정한 간격으로 찍혀 있었다.
5. 이전부터 남은 일: 학생 인터뷰, 사례 04 손계산, PR #10 결정, Cloudflare 수업 사용 범위 확인.

### Claude가 할 일
1. 검토자 지정이 끝나면 집 PC 임시 폴더에 있는 비밀 파일(운영 DB 주소)을 지운다.
2. ~~문서 PR~~: 완료. [#35](https://github.com/myeongjundev/netproof/pull/35)(`0cabeba`)에서 `HANDOFF.md`(배포 상태), `docs/deploy.md`(t08 공유 방식, 전용 계정 SQL, Preset `Other`, 가려진 주소 입력), 작업 기록 한 줄을 반영했다.

### 다음 기능과 후속
- 로드맵 4~8:
  - 4: 원인 태그·통계(배포 뒤 하기로 한 것)
  - 5: 불일치 사례를 회귀 테스트로
  - 6: 구성도 그림과 경로 재생
  - 7: 연습 문제 모드 다시 정의
  - 8: Batfish
- 후속:
  - F28: 변경 영향 응답 크기(최대 971줄, 571KiB)
  - F2: 용어 통일
  - F3: 받은 답 종류 정리

## 학원 PC에서 이어가기

학원 PC의 PowerShell에서 한 번 준비한다. 필요한 것은 Git, Python 3.11 이상(집 PC는 3.12), Node.js(집 PC는 24)다.

```powershell
git clone https://github.com/myeongjundev/netproof.git
cd netproof
python -m venv .venv
.venv\Scripts\python -m pip install -e "engine[test]" -r requirements.txt
npm --prefix web ci
```

- 이미 받아 둔 폴더가 있으면 `git switch main`과 `git pull --ff-only`를 한 뒤 아래 두 설치 명령만 다시 실행한다.
- 가상환경은 activate하지 않고 `.venv\Scripts\python`으로 바로 쓴다. 스크립트 실행 제한이 걸린 PC에서도 막히지 않는다.

확인 명령은 아래 넷이다. 엔진 `350 passed, 2 xfailed`, 서버 `140 passed, 1 skipped`, 웹 `417 passed`, 빌드 성공이 나오면 준비가 끝난 것이다.

```powershell
cd engine; ..\.venv\Scripts\python -m pytest -q; cd ..
cd server; ..\.venv\Scripts\python -m pytest -q; cd ..
npm --prefix web test
npm --prefix web run build
```

- Claude Code나 Codex를 열어 "HANDOFF 읽고 이어서 하자"라고 하면 된다. 집 PC의 Claude 기억(한국어로 답하기 등)은 넘어가지 않으므로 처음에 한 번 말해 준다.
- 학원 PC에서 하기 좋은 일:
  - 배포 6단계(가입, 사례 저장, 로그아웃)
  - 수동 QA D: 로그를 남기는 NetProof 서버를 학원 PC에 띄워야 한다(`docs/security-logs.md`). 공개 배포는 로그가 꺼져 있다.
  - 수동 QA E: n8n의 HTTP Request 주소를 `https://netproof-vert.vercel.app/api/verify`로 바꾸면 NetProof를 학원 PC에 띄우지 않아도 된다. 예시는 합성 데이터다.
- 공용 PC라면:
  - 운영 DB 주소를 넣지 않는다. 검토자 지정은 집 PC에서 한다.
  - 끝나면 GitHub·Vercel·Supabase·Claude에서 로그아웃하고, 브라우저에 비밀번호를 저장하지 않는다.

## 주의할 점과 배운 점
- Supabase 무료 프로젝트는 사람 한 명당 2개까지 켜 둘 수 있다. 멈춘 프로젝트는 세지 않지만, 멈춘 지 90일이 지나면 다시 켤 수 없다.
- NetProof는 t08 프로젝트에 기대어 있다. t08을 멈추거나 지우면 NetProof도 멈춘다. 반대로 t08의 DB 비밀번호를 바꿔도 NetProof는 영향이 없다(계정이 따로다).
- Supabase 연결 풀러는 직접 만든 계정도 `계정.프로젝트ID` 이름으로 접속을 받는다.
- 화면을 캡처하면 클립보드 내용이 바뀐다. 터미널에서 Ctrl+C는 복사가 아니라 프로그램 중지다.
- 앱의 터미널 연동 파일을 읽지 못하는 오류 때문에 Claude가 터미널 패널에 명령을 대신 입력하지 못했다.
- 리뷰에서 놓친 것도 남긴다.
  - #27: 순차 요청만 확인해서 동시 연결 결함을 놓쳤고, #28에서 고쳤다.
  - #34: 문서 링크를 열어 보지 않고 설계해서 R1에서 고쳤다.
