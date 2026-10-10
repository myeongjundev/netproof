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
- 작업: **로드맵 6번 구성도 그림 + 경로 재생 구현 완료**. 사용자가 2026-10-10 설계 뒤 “구현하자”로 승인했다. 판정기·실습·사례 상세·정책 행렬에 공유 구성도와 방향별 단계 재생을 연결했다.
- 브랜치: `codex/topology-playback`, 승인된 설계 커밋 `00107e4`에서 분기. main 기준 `d7dabff`(PR #50 병합). 설계 PR #51은 아직 열려 있으므로 구현 PR에는 승인된 설계 문서도 포함된다. PR #49는 `cd23e46`으로 병합 완료, 운영 엔진 0.2.0 확인은 Claude의 공개 `/api/policy-matrix` 확인을 사용자에게 전달받은 기록이다.
- 구현: [승인 설계와 제품 화면](docs/topology-playback-design.md). 판정 당시 network·flow 고정, CIDR 소속 선, 원래 hops 순서와 정방향/복귀 분리, firewall_in/state 표시, 장비12·구간24 상한 fallback, 접근성·재생 타이머 정지를 구현했다. 현재 입력·최종 판정·사례 저장 규칙은 재생으로 바뀌지 않는다.
- 설계 PR: [#51](https://github.com/myeongjundev/netproof/pull/51). 구현 PR: [#52](https://github.com/myeongjundev/netproof/pull/52), main 대상·리뷰 대기. 자동 병합하지 않는다.
- 다음 차례: **Claude(리뷰) → 사용자(병합 결정).** 로드맵 6번은 구현·검증 완료, 리뷰·병합 대기이므로 체크는 병합 뒤 한다.
- 운영 재판정은 **비밀번호 미확보·사용자 요청으로 보류**. 성공 dry-run·운영 반영·최종 dry-run 보고서는 없다. 재입력을 요구하지 않는다. 추후 사용자 재개 요청과 비밀번호 확보 뒤 deploy.md의 dry-run → 보고서 확인·사용자 승인 → 반영 → 대상 0건 확인을 따른다.
- 사용자 할 일: Vercel `DATABASE_URL`의 **Production and Preview → Production 전용** 변경. Codex는 Vercel 설정을 바꾸지 않는다.

## 작업 정의 — 구성도 그림·경로 재생 (Codex 설계, 2026-10-10)

사용자의 설계 위임은 일반적인 Claude 설계 역할의 예외이며 역할 규칙 자체를 바꾸지 않는다. 2026-10-10 구현 승인을 받았다. 변경 범위는 설계의 웹 타입·공유 결과 패널·새 구성도/재생 컴포넌트·순수 표시/재생 함수·네 페이지·스타일·웹 테스트 및 응답 fixture, 설계 문서·제품 이미지 2장·HANDOFF·작업 로그다. 구현 범위·화면 상태·재생 규칙·완료 조건은 설계 문서가 기준이다.

웹의 공유 결과 패널은 판정기·실습·사례 상세·정책 행렬의 판정 스냅샷을 사용한다. 엔진만 최종 판정을 정한다. engine/server/cases/DB 표·열/배포 변경·pfSense 편집·운영 rejudge는 이 과제 범위 밖이다. 판정 의미가 바뀌지 않아 엔진 버전 0.2.0 유지.

### 테스트 결과 — 구성도·경로 재생 구현 (Codex 직접 실행, 2026-10-10)

아래는 직접 실행한 출력 중 진행 점·빌드 자산 목록을 생략한 부분이다. 서버 테스트와 로컬 QA는 DATABASE_URL·NETPROOF_TEST_DATABASE_URL·보안 로그 변수를 비운 임시 SQLite에서 실행했다. 웹 테스트는 485→563건(+78)이다.

```text
cd engine && ../.venv/Scripts/python -m pytest -q
489 passed, 2 xfailed in 7.27s

cd server && ../.venv/Scripts/python -m pytest -q
165 passed, 1 skipped in 56.43s

npm --prefix web test
Test Files  39 passed (39)
Tests  563 passed (563)
Duration  1.16s

npm --prefix web run build
✓ 65 modules transformed.
dist/assets/index-BHD-u76S.js  378.30 kB │ gzip: 114.17 kB
✓ built in 227ms

git diff --check
(오류 없음)

git diff --stat -- engine server cases vercel.json
(출력 없음)

git diff --numstat -- web/package.json web/package-lock.json
(출력 없음)
```

- 순수 표시 시험: 동일 CIDR·겹친 prefix 분리, /0·/32, 빈/비정상/거대 문자열·형식 없는 입력, 중복 id·떨어진 장비·결정적 순서, 장비12/13·구간24/25, 긴 이름, 누락된 인터페이스·없는 장비·같은 장비 단계·재방문. 주소 소속만 표시하며 route/gateway로 연결을 만들지 않는다.
- 재생 시험: 유일한 decisive와 복귀 실패 방향, 알 수 없는 단계, 첫/마지막 경계·일시정지/이어가기, 방향·장비 선택·busy·숨김·unmount·reduced motion의 타이머 해제, 자동 재개 없음. 판정 스냅샷과 새 응답·행렬 서비스 전환도 시험했다.
- 응답 fixture 9건은 기존 사례 3건과 메모리에서 만든 PASS/stateful/UNSUPPORTED/one-way/방화벽 DENY/중복 id INVALID다. 현재 엔진을 직접 호출해 원래 기록과 같은 것을 확인했다. `expect`나 실제 결과를 만들지 않았고 cases 파일은 그대로다.

```text
engine 0.2.0: 9 recorded verify responses match; cases unchanged
```

실제 빌드·127.0.0.1 QA API·임시 SQLite에서 Playwright로 확인했다. fixture 9건×320/375/1280px×라이트/다크=54개 상태와 장비13개·긴 이름의 3폭 추가 6개 상태에서 넘침·장비 노드 겹침·콘솔 오류가 없었다. 실제 pfSense 장비·운영 배포 검증은 아니다.

```text
{ screens: 54, failures: [], errors: [] }
추가 경계 6개: overflow 0, 장비13개 pathMode true
복귀 state: R1 · 복귀 상태 · 단계 통과
복귀 route drop: R2 · 경로 · 차단 · 전체 판정을 결정한 단계
{ reducedDisabled: true }
{ keyboardStep: 'step' }
{ replayCalls: [], saveEnabled: true }
{ playerCount: 1, staleCount: 1, saveCount: 0, blocked: true }
{ savedCaseVisible: true, version: '저장된 판정 · 엔진 0.2.0', errors: [] }
{ oldPlayerRemoved: true }
```

판정기·실습은 실제 verify 호출, 실습은 재생→편집(이전 구성 유지·정지)→재판정→저장→상세, 행렬은 계산→셀 상세→서비스 전환(이전 재생 제거)→새 셀 상세를 확인했다. 방화벽 규칙 원문·복귀 상태 선택과 재생 마지막 정지를 확인했다. 제품 화면 2장을 설계 문서에 추가했다.

QA 서버를 종료하고 남은 task 전용 임시 SQLite 파일과 빈 폴더를 절대 경로로 확인해 삭제했다. 임시 QA/fixture 확인 도구도 삭제했다.

```text
Test-Path -LiteralPath <task 전용 QA 임시 폴더의 절대 경로>
False
```

첫 웹 실행의 비교 불가 테스트는 경로 없는 응답에 방향 단추를 숨기도록 수정한 뒤 통과했다. 추가 원문 fallback 시험의 타입 단언·문구 검사를 고친 뒤 최종 전체 시험과 빌드를 통과했다. 로컬 QA 준비 도구의 Flask 등록 순서 오류는 커밋하지 않은 임시 도구에서 수정했으며 제품 서버는 바꾸지 않았다.

Codex (GPT-6)

### 테스트 결과 — 구성도·경로 재생 설계 (Codex 직접 실행, 2026-10-10)

아래는 직접 실행한 출력 중 진행 점·빌드 자산 목록을 생략한 부분이다. 서버는 DATABASE_URL·외부 PostgreSQL 시험 변수·보안 로그 변수를 비우고 테스트용 SQLite에서 실행했다. 기존 코드 회귀 확인이며, 아직 없는 제품 기능의 테스트 통과를 뜻하지 않는다.

```text
cd engine && ../.venv/Scripts/python -m pytest -q
489 passed, 2 xfailed in 6.45s

cd server && ../.venv/Scripts/python -m pytest -q
165 passed, 1 skipped in 56.45s

npm --prefix web test
Test Files  35 passed (35)
Tests  485 passed (485)
Duration  1.20s

npm --prefix web run build
✓ 61 modules transformed.
dist/assets/index-BMQjIVBk.js  364.77 kB │ gzip: 109.94 kB
✓ built in 237ms

git diff --check
(출력 없음)

git diff --stat -- engine server web cases vercel.json
(출력 없음)
```

시안은 운영 데이터 없이 기존 사례 3건과 메모리에서 만든 PASS/stateful/UNSUPPORTED 구성의 현재 엔진 verify 응답을 사용했다. Playwright로 6개 사례 × 320/375/736/1280px × 라이트/다크 = 48개 상태를 직접 검사했다. 시안의 저장 상태 알림이 재생 커서를 초기화하던 문제를 고친 뒤 다시 검사한 결과:

```text
{ states: 48, layoutFailures: [], errors: [] }
복귀 상태: R1 · 복귀 상태 · 단계 통과, 2 / 4 단계
복귀 실패: R2 · 경로 · 차단, 목적지 10.10.10.10에 맞는 경로가 없습니다
{ start: '1 / 2 단계' }
{ end: '2 / 2 단계', stopped: true }
{ autoDisabled: true, manualKeyboard: '1 / 2 단계 · 동작 줄이기: 수동 이동' }
```

이것은 대화 시안의 검사다. 제품의 큰 구성 fallback·네 화면 연결·저장 회귀·타이머 전체 시험은 설계 문서의 구현 완료 조건으로 남아 있다. 대화 시안은 저장소 밖에 있으며 PR에는 실제 확인한 이미지 2장을 넣었다.

Codex (GPT-6)

### 리뷰 기록 — PR #50 (Claude, 2026-10-10)
- 직접 실행(`a057828`): 엔진 489 passed·2 xfailed, 서버 165 passed·1 skipped(DATABASE_URL 비움), 웹 485 passed, 빌드 성공(번들 `index-BMQjIVBk.js`, main과 같음). 불변 경로 diff 출력 없음, `git diff --check` 오류 없음. Codex 기록과 같다.
- 코드 변경은 export note 한 줄(조사 없는 `엔진 판정(X) ≠ 확인된 실제 결과(Y) — 사례 #N`). 테스트는 PASS→DENY·DENY→PASS 양방향과 문구 전체를 같음으로 검사. 버전 0.2.0 유지가 §15와 맞다. 비밀값 diff 없음. **PASS.**
- PR #49는 **병합 완료(`cd23e46`)**. 운영 엔진 `0.2.0`은 Claude가 공개 `/api/policy-matrix`로 확인했다(사용자 전달).
- 운영 재판정은 **사용자 요청으로 보류**. dry-run 인증 실패 뒤 netproof 계정 비밀번호 미확보로 진행하지 못했고, 성공 보고서·반영·최종 dry-run은 없다. 연결 주소 환경 변수·임시 입력 도구를 정리했다. 사용자가 바쁠 동안 재입력을 요구하지 않는다. 추후 비밀번호 확보 뒤 dry-run → 보고서 확인·사용자 승인 → 반영 → dry-run 대상 0건 절차로 재개한다.
- 사용자 할 일: Vercel `DATABASE_URL`은 현재 **Production and Preview**에 적용되어 있다. **Production에만** 두도록 사용자가 변경한다. Codex는 Vercel 설정을 바꾸지 않았다.

### 작업 정의 — PR #49 N1 export note 조사
- 근거: 아래 Claude 리뷰 N1의 `엔진 판정(DENY) ≠ 확인된 실제 결과(PASS)` 형식 권장. 기존 작업 정의 범위 3에서 허용한 note 문구 수정이다.
- 범위: `server/netproof_api/cases.py`의 export note 한 줄, `server/tests/test_rejudge.py`의 양방향 불일치·문구 확인, HANDOFF·작업 로그.
- 엔진 계산·버전·기존 cases/expect·web·DB 표·rejudge·배포 구성은 그대로다. 운영 DB 작업은 하지 않는다.

### 테스트 결과 — N1 후속 (Codex 직접 실행, 2026-10-10)

서버 테스트는 DATABASE_URL·외부 PostgreSQL 테스트 변수·보안 로그 변수를 비우고 임시 SQLite에서 실행했다. 아래는 실제 출력의 요약이며, 웹 빌드는 자산 목록을 생략했다.

```text
cd engine && ../.venv/Scripts/python -m pytest -q
489 passed, 2 xfailed in 4.37s

cd server && ../.venv/Scripts/python -m pytest -q
165 passed, 1 skipped in 31.61s

npm --prefix web test
Test Files  35 passed (35)
Tests  485 passed (485)
Duration  1.08s

npm --prefix web run build
✓ 61 modules transformed.
✓ built in 672ms

git diff --check
(출력 없음)
git diff --stat -- engine web cases server/netproof_api/models.py vercel.json
(출력 없음)
```

엔진 응답이 달라지는 변경이 없어 버전은 0.2.0을 유지한다. note 문구 외의 export 형식·expect 규칙·판정 계산·rejudge는 바꾸지 않았다.

Codex (GPT-6)

### 리뷰 기록 — PR #49 (Claude, 2026-10-10)
- 직접 실행(`b516b91`): 엔진 489 passed·2 xfailed, 서버 164 passed·1 skipped, 웹 485 passed, 빌드 성공(번들 `index-BMQjIVBk.js`, main과 같음). 불변 경로 diff 출력 없음, `git diff --check` 오류 없음. Codex 기록과 같다.
- 설계 대비: 엔진 diff는 버전 두 파일·`tests/test_cases.py`뿐(계산 코드 0줄). 형식 검사는 xfail 밖. rejudge는 `_judge`·`_limit_problem` 재사용, 네 칸만 갱신, `id > last_id` 100건 단위, dry-run 롤백, 보고서는 id·결과·비교·버전·고정 사유만.
- 완료 조건 6·7 독립 재현(임시 SQLite·합성 값·실제 CLI subprocess, 끝난 뒤 삭제): API로 저장·확인한 3건을 `0.1.4`로 바꾸고 #3을 상태 추적 변경 전 PASS로 흉내 → dry-run `대상 3건 · 결과 바뀜 1건 · 비교 바뀜 1건`, `#3 PASS→UNSUPPORTED · AGREE→NOT_COMPARABLE`, `불일치 사라짐 #3 (확인됨)` → 실행 같은 보고서 → dry-run `대상 0건`. 확인 유지, 제목·닉네임 미출력. 불일치 export를 임시로 `cases/`에 넣으면 XFAIL, 엔진과 맞는 사례에 `known_mismatch`를 붙이면 `XPASS(strict)` 실패. 임시 파일은 지우고 커밋하지 않았다.
- **PASS.** 비차단 N1: export `note`의 조사(`DENY과`)가 값에 따라 틀림 — 조사 없는 `엔진 판정(DENY) ≠ 확인된 실제 결과(PASS)` 형식 권장, 후속 가능.
- 직전 과제 「학습 → 실습 → 기록·복습 흐름 강화」는 **PR #47 병합 완료**(`225a618`, 2026-10-10)이고 운영에 나갔다. 요약은 아래 「이전 과제 기록」.
- 별도로 남은 사용자 확인:
  1. **D5(실습 사실 5가지)** — pfSense 버전(CE/Plus)·가상화 도구, Kali(`172.31.195.249`)에서 WAN(`192.168.120.129`)까지의 실제 경로, NAT·포트 전달 사용 여부, 게시판 접속이 pfSense를 지나는지, 규칙을 화면에서 옮겨 적을 수 있는지. 주면 pfSense **2단계(실습 연동)**를 설계한다. `docs/screens/lab-network-*.png`(PR #47)에 수업 실습망이 pfSense 경계 방화벽으로 그려져 있다.
  2. 다른 후속 후보: PR #47 비차단 N1(상세의 미확인 불일치 문구)·N2(`사례 #N으로` 조사), **pfSense 화면 입력**, 로드맵 6~8번.
  3. 배포 후속(사람만 할 수 있는 일): 배포 사이트 가입 → 사례 저장 → 사례 게시판 확인 → 로그아웃(배포 6단계). 닉네임을 Claude에 알려 주면 Claude가 `make-reviewer`(7단계)를 실행한다. **검토자 계정이 생기기 전에는 대시보드(원인 Top 5)를 운영에서 볼 수 없고, 확인된 실제 사례도 없어 이번 과제는 합성 데이터로만 검증된다.** Vercel `DATABASE_URL`을 Production에만 두기, 검토자 지정 뒤 임시 비밀 파일 삭제. 수동 QA A~E도 사람 대기.

### 병합 뒤 운영 확인 (Claude, 로그인 없이, 2026-10-10)
| 항목 | 결과 |
| --- | --- |
| PR #47 반영 | 공개 주소 번들이 `assets/index-BMQjIVBk.js`로 PR #47 재리뷰·최신 커밋 재검증 빌드와 같다 |
| 권한 | 로그인 없이 `/api/cases` 401 |
| 병합 전 재검증(`ca7a040`) | 엔진 478 passed·2 xfailed, 서버 157 passed·1 skipped, 웹 485 passed, 빌드 성공([PR 코멘트](https://github.com/myeongjundev/netproof/pull/47#issuecomment-6095711479)) |

## 작업 정의 — 불일치 사례 회귀 테스트·엔진 버전별 재판정 (Claude 설계, 2026-10-10 사용자 승인)

로드맵 「F5·F6 다음 기능 순서」 5번(④ 실제 결과로 검증). 브랜치: `main`에서 `codex/rejudge`.

### 지금 있는 것 (설계 근거)
- `GET /api/cases/<id>/export`(`server/netproof_api/cases.py`, 검토자, 확인된 사례만)는 사례 1건을 `cases/` 형식으로 내보낸다. `expect.result`는 사람이 적은 실제 결과이고, 엔진과 실제가 둘 다 DENY일 때만 결정 장비를 넣는다. 사례 상세의 검토자 내보내기 칸이 이 JSON을 보여 준다.
- `engine/tests/test_cases.py`는 `cases/*.json`을 모두 판정해 `expect`와 맞춘다. **불일치 사례(엔진 ≠ 실제)를 넣으면 바로 실패한다** — 알려진 불일치 표시가 없다.
- 사례마다 `engine_version`을 저장하지만 `0.1.4`는 2026-10-01 뒤로 그대로다. **PR #44(pfSense 상태 추적)는 판정 의미를 바꿨는데 버전을 올리지 않았다.** 그래서 `0.1.4` 사례끼리도 판정한 엔진이 다를 수 있다.
- 저장된 사례를 지금 엔진으로 다시 판정하는 길이 없다(내용을 고칠 때만 서버가 재판정).

### 사용자 결정
| 번호 | 결정 | 고르지 않은 선택지 |
| --- | --- | --- |
| D1 | **버전이 다른 사례를 전부 지금 엔진으로 재판정해 DB에 반영.** (가) Vercel에는 배포 직후 파이썬을 안전하게 돌릴 지점이 없어(서버리스 시작마다 실행하면 경합, 빌드 단계에는 DB 주소 없음) **엔진 버전이 바뀐 PR 병합 뒤 명령 한 줄**(`flask rejudge`)로 반영하고 `docs/deploy.md` 절차에 넣는다. (나) 재판정은 입력·실제 결과를 바꾸지 않으므로 **검토자 확인과 `updated_at`을 유지**한다 | 보고서만(DB 무변경) / 검토자가 사례별로 골라 반영 |
| D2 | **알려진 불일치는 `known_mismatch` 표시 + strict xfail**(사용자가 Claude 추천을 따름). 기대값은 사람이 정한 실제 결과 그대로 | 그냥 실패로 둠(엔진 테스트 빨강) / 별도 폴더로 분리 |
| D3 | **이번에 엔진 `0.2.0` + 버전 규칙** | 버전 숫자는 참고만, 재판정만 |

### 목표
엔진이 실제 결과와 다르게 판정한 **확인된 사례를 지워지지 않는 엔진 테스트로 남기고**, 엔진이 고쳐지면 그 테스트가 알린다. 엔진 의미가 바뀌면 버전이 오르고, 저장된 사례의 판정을 **명령 한 번으로 지금 엔진 기준으로 맞추며 무엇이 바뀌었는지 보고**한다. 판정은 엔진만 한다(ADR-001). 기대값은 사람이 정한다.

### 변경 범위
**1. 엔진 버전 — `engine/src/netproof_engine/__init__.py`, `engine/pyproject.toml`, `docs/semantics.md` 새 §15, `AGENTS.md` 한 줄**
- `__version__`과 `pyproject.toml`의 `version`을 `0.2.0`으로.
- §15 「엔진 버전」: 같은 입력에 대한 엔진 함수 응답(특히 `verify`의 `result`·`decisive`·`reason`)이 달라질 수 있는 변경은 버전을 올린다 — 의미 변경은 둘째 자리, 결과가 바뀌는 버그 수정은 셋째 자리. 결과가 같은 리팩터·테스트·문서는 올리지 않는다. 저장된 `engine_version`은 그 사례를 **마지막으로 판정한 엔진**이다. 버전이 바뀐 배포 뒤에는 `flask rejudge`를 실행한다. PR #44의 의미 변경이 `0.1.4`로 나갔고 `0.2.0`이 그 변경을 포함한다는 사실을 한 줄 기록한다.
- `AGENTS.md`: `engine/` 계산 코드를 바꾸면 §15에 따라 버전을 올릴지 판단하고 PR 본문에 적는다.

**2. 알려진 불일치 테스트 — `engine/tests/test_cases.py`**
- 사례 파일의 선택 필드 `known_mismatch: {"engine_result": "PASS"|"DENY", "engine_version": "<문자열>", "note": "<문자열>"}`.
- 사례 목록을 `pytest.param`으로 만드는 함수를 둔다. `known_mismatch`가 있으면 `marks=pytest.mark.xfail(strict=True, reason=note)`. 지금 엔진이 `expect.result`와 다르면 xfail, **같아지면 XPASS로 실패** = 엔진이 고쳐졌으니 표시를 지우라는 뜻(지울 때 `expect`는 그대로 둔다 — 테스트 이름·`reason`·§15에 명시).
- **형식 검사는 xfail 밖의 별도 테스트**로 모든 사례 파일에 돌린다(형식 오류가 xfail에 묻히지 않게): `known_mismatch`가 있으면 `engine_result ∈ {PASS, DENY}`, `engine_result ≠ expect.result`, `expect`에 `device` 없음.
- 기존 `cases/*.json` 3개와 `expect`는 그대로. **`cases/`에 합성 불일치 사례를 넣지 않는다**(합성 사례에 가짜 실제 결과를 만들지 않는다). 장치는 `tmp_path`에 만든 파일로 param 함수와 형식 검사를 시험한다.

**3. 내보내기 보강 — `server/netproof_api/cases.py` `export_case`**
- 확인된 사례에서 `result ∈ {PASS, DENY}`이고 `actual_result`와 다르면 `known_mismatch: {"engine_result": result, "engine_version": engine_version, "note": "엔진 판정 {result}이(가) 확인된 실제 결과 {actual}와(과) 다름 — 사례 #{id}"}`를 더한다(문구는 Codex가 조사 맞춤 가능). 일치·`UNSUPPORTED`·`INVALID`면 필드 없음. `expect` 규칙은 지금 그대로.
- 화면 변경 없음. 상세의 기존 내보내기 칸에 필드가 그대로 보인다. 내보낸 JSON을 `cases/`에 넣는 일은 지금처럼 사람이 PR로 한다(서버는 저장소에 쓰지 않는다).

**4. 재판정 명령 — `server/netproof_api/cases.py`(함수), `server/netproof_api/__init__.py`(명령 등록), `docs/deploy.md`**
- `flask --app server/wsgi.py rejudge [--dry-run]`. 함수는 `cases.py`에 두고 기존 `_judge`·`_limit_problem`·`ENGINE_VERSION`을 재사용한다(판정 로직을 복제하지 않는다).
- 대상: `engine_version != ENGINE_VERSION`인 사례, id 순. 각 사례:
  - `_limit_problem(network)`이 있거나 엔진이 예외를 던지면 **바꾸지 않고 건너뜀으로 보고**하고 계속한다.
  - 아니면 `verdict`·`result`·`comparison`·`engine_version`만 덮어쓴다. `network`·`flow`·`claim`·`title`·`actual_*`·`confirmed_*`·`created_at`·**`updated_at`은 그대로**(D1 나).
  - 100건마다 커밋. 중간에 실패해도 다시 실행하면 남은 사례만 대상이 된다(멱등).
- `--dry-run`: 같은 계산·같은 보고서를 내고 DB는 바꾸지 않는다(롤백).
- 보고서(표준 출력). **사례 id·결과·비교·버전만 쓰고 제목·닉네임·구성은 쓰지 않는다**(공개 저장소 HANDOFF에 옮겨 적기 때문):
  - 첫 줄: `엔진 0.2.0 · 대상 N건 · 결과 바뀜 K건 · 비교 바뀜 M건 · 건너뜀 S건` (+ dry-run이면 `· DB 변경 없음(dry-run)`).
  - 결과나 비교가 바뀐 사례마다: `#12 PASS→UNSUPPORTED · AGREE→NOT_COMPARABLE · 0.1.4→0.2.0`.
  - 실제 결과(PASS/DENY)가 적힌 사례 중 엔진 ≠ 실제가 새로 생기거나 사라진 사례: `불일치 생김 #… (확인됨)` / `불일치 사라짐 #…`. 확인된 사례는 `(확인됨)` 표시 — 이 사례는 `known_mismatch` 내보내기 대상이 바뀐 것이다.
  - 건너뜀: `건너뜀 #… (사유)`.
- `docs/deploy.md` 새 절 「엔진 버전이 바뀐 배포 뒤 재판정」: 병합·배포 확인 → `--dry-run` 보고서 확인 → 실행 → 다시 `--dry-run`으로 대상 0건 확인 → 보고서를 HANDOFF·작업 로그에 남김. 연결 주소는 검토자 지정(7)과 같은 방식으로 다루고 채팅·명령줄·캡처에 넣지 않는다. 실행은 사용자 또는 사용자가 허락한 Claude가 한다.
- 이 과제 병합 뒤 운영 DB에서 첫 실행을 한다(모든 `0.1.4` 사례가 대상).

**5. 문서** — 이 HANDOFF의 테스트 결과·다음 차례, `decisions/ai-work-log.md` 한 줄, 로드맵 5번 체크.

### 건드리지 않을 것
- 엔진 계산 코드(`verify`·`trace`·`acl`·`firewall`·`cause` 등). 엔진 변경은 버전 문자열과 `tests/test_cases.py`뿐이다.
- 기존 `cases/*.json`과 `expect`.
- `server/netproof_api/models.py`(DB 표·열 추가 없음), API 요청·응답 형태(export의 선택 필드 하나 제외), 대시보드 집계 규칙, 사례 저장·수정 시 서버 재판정 규칙.
- `web/` 전부. 배포 구성(`vercel.json`), 서버 시작·빌드 때 자동 재판정.

### 예상 리스크
| 리스크 | 대응 |
| --- | --- |
| 재판정 덮어쓰기로 과거 판정이 사라짐 | D1 사용자 선택. `--dry-run` 먼저, 보고서를 HANDOFF·작업 로그에 남긴다 |
| 확인 표시가 남은 채 엔진 판정이 바뀌어 대시보드 엔진 축이 움직임 | 의도한 결과(지금 엔진 기준 통계). 보고서의 「불일치 생김/사라짐 (확인됨)」으로 추적 |
| 형식이 틀린 `known_mismatch`가 xfail에 묻힘 | 형식 검사를 xfail 밖 별도 테스트로 |
| 엔진을 고친 PR이 XPASS 실패를 기대값 수정으로 "해결" | 표시만 지우고 `expect`는 그대로 — 테스트 `reason`·§15·리뷰에서 확인 |
| 버전을 안 올린 의미 변경 재발(PR #44) | §15 규칙, `AGENTS.md` 한 줄, Claude 리뷰 때 엔진 diff와 버전 대조 |
| 운영 DB 실행 실수·중간 실패 | dry-run 먼저, 100건 단위 커밋, 멱등(다시 돌리면 남은 것만) |
| 보고서로 사례 내용이 공개 문서에 새어 나감 | id·결과·비교·버전만 출력, 테스트로 제목·닉네임 미출력 확인 |

### 완료 조건 (Codex가 직접 실행해 출력 첨부)
1. `cd engine && ../.venv/Scripts/python -m pytest -q` → 478 passed·2 xfailed에 새 테스트 추가, 실패 0. 최소: param 함수가 `known_mismatch` 파일에만 `xfail(strict=True)`를 붙임; 형식 검사가 잘못된 `engine_result`·`expect.result`와 같은 `engine_result`·`device` 포함을 잡음; 기존 사례 3개 그대로 통과.
2. `cd server && ../.venv/Scripts/python -m pytest -q` → 157 passed·1 skipped에 추가, 실패 0. 최소: export 불일치 → `known_mismatch.engine_result`가 저장된 `result`이자 `verify` 결과와 같고 `expect.result`와 다름; 일치·`UNSUPPORTED` → 필드 없음. rejudge: 버전 다른 사례만 갱신, 같은 버전 무변경, 두 번째 실행 대상 0건, `--dry-run` DB 무변경, 확인·`actual_*`·`updated_at` 유지, 바뀐 사례 줄·불일치 생김/사라짐 출력, 한도 초과 사례 건너뜀 보고, 출력에 제목·닉네임 없음.
3. `npm --prefix web test` → 485 passed 그대로. `npm --prefix web run build` 성공.
4. `git diff --stat main... -- web cases server/netproof_api/models.py vercel.json` → **출력 없음**. 엔진 diff는 `__init__.py`·`pyproject.toml`·`tests/test_cases.py`뿐.
5. `git diff --check` 공백 오류 없음.
6. 로컬 실연: 임시 SQLite에 사례(일치·불일치·UNSUPPORTED가 될 상태 추적 장비 각 1건 이상, 하나는 확인됨)를 만들고 `engine_version`을 `0.1.4`로 바꾼 뒤 `rejudge --dry-run` → `rejudge` → `rejudge --dry-run`(대상 0건) 출력과 export JSON 1건을 첨부. 임시 DB는 지운다.
7. 리뷰(Claude): 위 출력을 직접 재현하고, 내보낸 불일치 JSON을 임시로 `cases/`에 넣어 xfail, 엔진과 맞는 사례에 `known_mismatch`를 붙여 XPASS 실패를 확인한 뒤 되돌린다(커밋하지 않음).

### 테스트 결과 (Codex 직접 실행, 2026-10-10)

완료 조건 1~6을 직접 실행했다. PowerShell에서는 각 디렉터리를 실행 도구의 workdir로 지정했다. 서버 테스트의 외부 PostgreSQL 테스트 환경 변수는 제거해 임시 SQLite만 사용했다. 아래 출력 없음은 종료 코드 0·표준 출력 없음이다. 엔진 diff 파일은 `__init__.py`·`pyproject.toml`·`tests/test_cases.py` 세 개뿐이다.

```text
cd engine && ../.venv/Scripts/python -m pytest -q
........................................................................ [ 14%]
........................................................................ [ 29%]
........................................................................ [ 43%]
........................................................................ [ 58%]
........................................................................ [ 73%]
........................................................................ [ 87%]
.........................................................xx              [100%]
489 passed, 2 xfailed in 7.86s
```

```text
cd server && ../.venv/Scripts/python -m pytest -q
........................................................................ [ 43%]
...........................s............................................ [ 87%]
.....................                                                    [100%]
164 passed, 1 skipped in 59.70s
```

```text
npm --prefix web test

> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/gov/project/skt aleph/netproof/web


 Test Files  35 passed (35)
      Tests  485 passed (485)
   Start at  18:12:18
   Duration  1.06s (transform 66%, import 21%, tests 9%, worker 3%)

  Transform  transforming modules took 7.00s · 66% of tracked time, re-done on every run
             persist transforms across runs with fsModuleCache: true
             learn more: https://vitest.dev/guide/improving-performance#caching-between-reruns
```

```text
npm --prefix web run build

> netproof-web@0.1.0 build
> tsc --noEmit && vite build

vite v8.3.1 building client environment for production...
transforming...
✓ 61 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                            0.60 kB │ gzip:   0.44 kB
dist/assets/PretendardVariable.subset.66-C3HqaDeY.woff2    8.25 kB
dist/assets/PretendardVariable.subset.64-CTbrgYF9.woff2    8.26 kB
dist/assets/PretendardVariable.subset.65-B66rjuyf.woff2   11.10 kB
dist/assets/PretendardVariable.subset.68-DS9B48d0.woff2   16.34 kB
dist/assets/PretendardVariable.subset.73-DMrK970F.woff2   18.33 kB
dist/assets/PretendardVariable.subset.72-pYYGrEQR.woff2   19.50 kB
dist/assets/PretendardVariable.subset.75-CxKdrRNf.woff2   19.99 kB
dist/assets/PretendardVariable.subset.90-BF7RiZjm.woff2   20.85 kB
dist/assets/PretendardVariable.subset.67-BmuXdlDy.woff2   21.84 kB
dist/assets/PretendardVariable.subset.89-DOzqWPpX.woff2   21.86 kB
dist/assets/PretendardVariable.subset.74-D4tQnymK.woff2   22.39 kB
dist/assets/PretendardVariable.subset.84-Brb8EsYQ.woff2   24.49 kB
dist/assets/PretendardVariable.subset.87-Lzui2vbK.woff2   24.66 kB
dist/assets/PretendardVariable.subset.76-DhPm2b_q.woff2   24.92 kB
dist/assets/PretendardVariable.subset.85-Byo_x2hf.woff2   25.10 kB
dist/assets/PretendardVariable.subset.88-CqX6JSgh.woff2   25.64 kB
dist/assets/PretendardVariable.subset.86-XG7lTN_6.woff2   25.71 kB
dist/assets/PretendardVariable.subset.77-DwaxqOC8.woff2   26.04 kB
dist/assets/PretendardVariable.subset.79-XpoyPP38.woff2   26.22 kB
dist/assets/PretendardVariable.subset.81-BZzF9Hb3.woff2   26.30 kB
dist/assets/PretendardVariable.subset.82-BgAHe30u.woff2   26.50 kB
dist/assets/PretendardVariable.subset.78-DhqRbBzT.woff2   26.54 kB
dist/assets/PretendardVariable.subset.83-DF-zBLLe.woff2   26.96 kB
dist/assets/PretendardVariable.subset.70-BUXiAGMT.woff2   27.54 kB
dist/assets/PretendardVariable.subset.37-BD6FyOtY.woff2   27.91 kB
dist/assets/PretendardVariable.subset.71-DuPZj8us.woff2   28.32 kB
dist/assets/PretendardVariable.subset.80-DsV9Qp_h.woff2   28.79 kB
dist/assets/PretendardVariable.subset.63-B35xsm4O.woff2   28.81 kB
dist/assets/PretendardVariable.subset.40-BDaOfdUe.woff2   29.84 kB
dist/assets/PretendardVariable.subset.43-DHdpry7N.woff2   30.38 kB
dist/assets/PretendardVariable.subset.7-E2HaA55t.woff2    31.91 kB
dist/assets/PretendardVariable.subset.1-C-__qv6_.woff2    32.04 kB
dist/assets/PretendardVariable.subset.44-qHopVhdd.woff2   32.13 kB
dist/assets/PretendardVariable.subset.24-CmkE8Q8D.woff2   32.30 kB
dist/assets/PretendardVariable.subset.10-DzSWztS8.woff2   33.03 kB
dist/assets/PretendardVariable.subset.41-BUACvzZC.woff2   33.18 kB
dist/assets/PretendardVariable.subset.50-C8IyFH7L.woff2   33.22 kB
dist/assets/PretendardVariable.subset.54-Dt2-cQkx.woff2   33.34 kB
dist/assets/PretendardVariable.subset.5-K_MNGNCe.woff2    33.62 kB
dist/assets/PretendardVariable.subset.6-Bxhohlcm.woff2    33.96 kB
dist/assets/PretendardVariable.subset.9-Btb3bmS6.woff2    34.01 kB
dist/assets/PretendardVariable.subset.55-jFgflYjX.woff2   34.18 kB
dist/assets/PretendardVariable.subset.39-B_7wfth9.woff2   34.25 kB
dist/assets/PretendardVariable.subset.52-CNgqKOOJ.woff2   34.35 kB
dist/assets/PretendardVariable.subset.0-BHUkWNFR.woff2    34.56 kB
dist/assets/PretendardVariable.subset.53-BSRnyb-u.woff2   34.57 kB
dist/assets/PretendardVariable.subset.42-Dp-5mnyL.woff2   34.60 kB
dist/assets/PretendardVariable.subset.45-BniyRFfm.woff2   34.66 kB
dist/assets/PretendardVariable.subset.36-Dn5IBRQB.woff2   34.68 kB
dist/assets/PretendardVariable.subset.34-CaCS33Md.woff2   34.72 kB
dist/assets/PretendardVariable.subset.69-YT16ymcp.woff2   34.78 kB
dist/assets/PretendardVariable.subset.38-D4hu443z.woff2   34.80 kB
dist/assets/PretendardVariable.subset.62-DGSAWCfb.woff2   34.87 kB
dist/assets/PretendardVariable.subset.33--0OT__YQ.woff2   34.91 kB
dist/assets/PretendardVariable.subset.17-BfZSA-Xc.woff2   34.94 kB
dist/assets/PretendardVariable.subset.4-Bvh2YGoc.woff2    35.15 kB
dist/assets/PretendardVariable.subset.56-BwZdvJZQ.woff2   35.18 kB
dist/assets/PretendardVariable.subset.35-DWFYRGLp.woff2   35.35 kB
dist/assets/PretendardVariable.subset.27-CT6nuW9L.woff2   35.42 kB
dist/assets/PretendardVariable.subset.61-PUuTnod4.woff2   35.64 kB
dist/assets/PretendardVariable.subset.15-D04iXIE3.woff2   35.66 kB
dist/assets/PretendardVariable.subset.13-C42mj_j2.woff2   35.70 kB
dist/assets/PretendardVariable.subset.47-B-cWO2pw.woff2   35.72 kB
dist/assets/PretendardVariable.subset.57-BwFDg-Fs.woff2   35.96 kB
dist/assets/PretendardVariable.subset.51-Bxd0gTAs.woff2   36.02 kB
dist/assets/PretendardVariable.subset.49-BblQVys9.woff2   36.05 kB
dist/assets/PretendardVariable.subset.20-Ig1-z3n5.woff2   36.12 kB
dist/assets/PretendardVariable.subset.14-Bl512uUX.woff2   36.51 kB
dist/assets/PretendardVariable.subset.46-BMRq7xC-.woff2   36.54 kB
dist/assets/PretendardVariable.subset.8-CRbJhhyA.woff2    36.69 kB
dist/assets/PretendardVariable.subset.21-yKPEdLXC.woff2   37.26 kB
dist/assets/PretendardVariable.subset.11-CqVmlKJn.woff2   37.40 kB
dist/assets/PretendardVariable.subset.48-Ct-fWrPO.woff2   37.77 kB
dist/assets/PretendardVariable.subset.60-CeHezjjf.woff2   37.77 kB
dist/assets/PretendardVariable.subset.16-BQUnS2GX.woff2   37.91 kB
dist/assets/PretendardVariable.subset.12-BHuZSgT0.woff2   37.94 kB
dist/assets/PretendardVariable.subset.91-Csm0YNoH.woff2   37.99 kB
dist/assets/PretendardVariable.subset.30-CWDM1c0J.woff2   38.44 kB
dist/assets/PretendardVariable.subset.28-CpO0Y96p.woff2   38.46 kB
dist/assets/PretendardVariable.subset.22-CSqxKoOs.woff2   38.68 kB
dist/assets/PretendardVariable.subset.59-CMkWjhdo.woff2   38.97 kB
dist/assets/PretendardVariable.subset.29-D6hjrUWm.woff2   39.28 kB
dist/assets/PretendardVariable.subset.32-CGnFWD2i.woff2   40.21 kB
dist/assets/PretendardVariable.subset.23-DK80wi0t.woff2   40.28 kB
dist/assets/PretendardVariable.subset.26-Sozl8dw8.woff2   40.32 kB
dist/assets/PretendardVariable.subset.3-Dqw33sf4.woff2    40.64 kB
dist/assets/PretendardVariable.subset.58-DlucQts_.woff2   41.56 kB
dist/assets/PretendardVariable.subset.18-CwAxMC3C.woff2   41.60 kB
dist/assets/PretendardVariable.subset.31-CdmyZ5mm.woff2   41.89 kB
dist/assets/PretendardVariable.subset.25-CsoWBIZB.woff2   42.03 kB
dist/assets/PretendardVariable.subset.19-CJu4Zcdo.woff2   42.32 kB
dist/assets/PretendardVariable.subset.2-dCZkyKLw.woff2    43.92 kB
dist/assets/index-CQWvs7G8.css                            80.94 kB │ gzip:  22.54 kB
dist/assets/index-BMQjIVBk.js                            364.77 kB │ gzip: 109.94 kB

✓ built in 733ms
```

```text
git diff --stat main... -- web cases server/netproof_api/models.py vercel.json

```

```text
git diff --check

```

로컬 실연은 기존 합성 입력과 임시 SQLite를 사용했다. 아래 actual·확인 값은 실연용 합성 입력이며 실제 장비 결과가 아니다. 기존 cases 파일·expect는 변경하지 않았다. 보고서는 id·결과·비교·버전만 포함하며, 별도로 요구된 export JSON은 합성 구성과 합성 제목을 포함한다.

```text
flask --app server/wsgi.py rejudge --dry-run
엔진 0.2.0 · 대상 3건 · 결과 바뀜 3건 · 비교 바뀜 3건 · 건너뜀 0건 · DB 변경 없음(dry-run)
#1 PASS→DENY · AGREE→DISAGREE · 0.1.4→0.2.0
불일치 사라짐 #1 (확인됨)
#2 PASS→DENY · AGREE→DISAGREE · 0.1.4→0.2.0
불일치 생김 #2 (확인됨)
#3 PASS→UNSUPPORTED · AGREE→NOT_COMPARABLE · 0.1.4→0.2.0
flask --app server/wsgi.py rejudge
엔진 0.2.0 · 대상 3건 · 결과 바뀜 3건 · 비교 바뀜 3건 · 건너뜀 0건
#1 PASS→DENY · AGREE→DISAGREE · 0.1.4→0.2.0
불일치 사라짐 #1 (확인됨)
#2 PASS→DENY · AGREE→DISAGREE · 0.1.4→0.2.0
불일치 생김 #2 (확인됨)
#3 PASS→UNSUPPORTED · AGREE→NOT_COMPARABLE · 0.1.4→0.2.0
flask --app server/wsgi.py rejudge --dry-run
엔진 0.2.0 · 대상 0건 · 결과 바뀜 0건 · 비교 바뀜 0건 · 건너뜀 0건 · DB 변경 없음(dry-run)
GET /api/cases/2/export (합성 입력·확인)
{
  "claim": {
    "expected": "PASS",
    "source": "AI 답 예시(합성)",
    "text": "PC1에서 10.20.20.5의 HTTPS 서비스에 접근할 수 있다."
  },
  "expect": {
    "result": "PASS"
  },
  "flow": {
    "dst": "10.20.20.5",
    "dst_port": 443,
    "proto": "tcp",
    "src": "10.10.10.10"
  },
  "id": "field-002",
  "known_mismatch": {
    "engine_result": "DENY",
    "engine_version": "0.2.0",
    "note": "엔진 판정 DENY과 확인된 실제 결과 PASS가 다름 — 사례 #2"
  },
  "network": {
    "acls": {
      "101": [
        "access-list 101 deny tcp 10.10.10.0 0.0.0.255 10.20.20.0 0.0.0.255 eq 443",
        "access-list 101 permit ip any any"
      ]
    },
    "devices": [
      {
        "gateway": "10.10.10.1",
        "id": "PC1",
        "interfaces": [
          {
            "ip": "10.10.10.10/24",
            "name": "eth0"
          }
        ],
        "kind": "host"
      },
      {
        "id": "R1",
        "interfaces": [
          {
            "acl_in": "101",
            "ip": "10.10.10.1/24",
            "name": "g0/0"
          },
          {
            "ip": "10.20.20.1/24",
            "name": "g0/1"
          }
        ],
        "kind": "router"
      },
      {
        "gateway": "10.20.20.1",
        "id": "SRV",
        "interfaces": [
          {
            "ip": "10.20.20.5/24",
            "name": "eth0"
          }
        ],
        "kind": "host"
      }
    ]
  },
  "source": "동기 사례(작성자 익명). 실제 결과 출처: device — 합성 시험 메모",
  "title": "합성 불일치 시험"
}
임시 SQLite 삭제 확인: True
```

실연 준비 때 공백 포함 닉네임이 거절됐고, Windows cp949 출력은 export의 긴 대시를 인코딩하지 못했다. 합성 닉네임과 UTF-8 표준 출력을 사용해 위 명령 전체를 다시 성공시켰다. 실패한 실연의 임시 DB까지 삭제 확인했다. 운영 DB에는 연결하거나 rejudge를 실행하지 않았다. 신규 서버 테스트는 205건 처리 중 두 번째 커밋 실패를 주입해 첫 100건만 남고 재실행이 105건만 처리하는 것도 확인했다.

Codex (GPT-6)

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
6. [ ] 구성도 그림 + 경로 재생 — ② **사용자 설계 승인, 구현·검증 완료(웹563), Claude 리뷰·병합 대기** ([설계·제품 화면](docs/topology-playback-design.md))
7. [ ] 연습 문제 모드 다시 정의("채점" 없이, AGENTS.md 원칙) — ⑤
8. [ ] Batfish 차등 테스트(엔진 검증용, 수업과 거리 있어 낮춤) — ④
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
