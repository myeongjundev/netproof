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
- 작업: **원인 태그·통계("가장 많이 틀린 원인 Top 5")** — 로드맵 「F5·F6 다음 기능 순서」 4번, 순환 고리 ⑤. 배포가 끝나서 다음 후보였다.
- 브랜치: `codex/cause-tags`(origin/main `88bddf2`에서 만듦, Orca worktree). 승인 범위 안 구현·테스트·문서 갱신 완료.
- 단계: **Claude 설계 → 사용자 승인 완료(2026-10-06, D1~D4 확정) → Codex 구현·검증 완료 → Claude 리뷰 대기.**
- 다음 차례: **Claude(리뷰).**
- PR: [#41 원인 태그와 불일치 원인 Top 5](https://github.com/myeongjundev/netproof/pull/41), 구현 커밋 `5ca7561`. 커밋·푸시·PR 생성 완료, 병합하지 않았다.
  1. 이 브랜치에서 `git pull` 후 `git diff main...HEAD`와 PR을 확인한다. `main`으로 바꾸거나 새 브랜치를 만들지 않는다.
  2. 아래 테스트 명령을 직접 실행하고 저장 JSON 분류·집계 불변식·상한 표시·상세 원인을 검토한다.
  3. 지적에는 파일:줄과 재현 명령을 붙여 첫 줄 `[Claude]`인 PR 코멘트를 남긴다. 병합은 사용자 결정이다.
- 구현 메모: 엔진 순수 함수 `cause`와 9개 태그, 검토자 대시보드 Top 5·복귀 수·제외 수, 상세 원인 표시. DB 표·열·판정 경로·사례 JSON·verify API·사례 목록은 변경하지 않았다.
- 집계 분모: 전체 불일치 `disagree_total` + 세 제외 = 전체 사례 수. Top 5 + 그 외 + 분류 못 함 = 실제 집계 분모 `denominator`. 상한 초과 때는 최근 2,000건 비율과 전체 불일치 수를 구분해 보인다(아래 테스트·semantics §13).
- QA: 기본 `seeded_qa()` 4건은 유지하고 CLI에서 `seed_cause_example()`로 복귀 불일치 1건을 더해 총 5건이다. 검증은 허용된 `server/tests/test_dashboard.py`에 추가했으며 `test_qa_local.py` 변경·범위 확장은 하지 않았다.
- 배포 후속(사람 대기, 이번 과제와 별개): ① 배포 사이트 가입 → 사례 저장 → 사례 게시판 확인 → 로그아웃(배포 6단계), 닉네임을 Claude에 알려 주면 Claude가 `make-reviewer`(7단계) ② Vercel `DATABASE_URL`을 **Production에만** 두기 ③ 검토자 지정 뒤 임시 비밀 파일 삭제. 공개 주소는 **https://netproof-vert.vercel.app**(`main` `1fef9b6`, 2026-10-06 배포). 상세는 아래 「배포 구성」·「공개 주소 점검」·「비밀값 처리」.

## 작업 정의 — 원인 태그·통계 (설계: Claude Opus 5 · **사용자 승인 2026-10-06**)

### 목표
저장된 사례에서 **받은 답이 NetProof 판정과 어긋난 사례의 원인을 엔진 근거로 분류**해, 대시보드에 「가장 많이 틀린 원인 Top 5」를 건수·비율로 보인다. 사례 상세에는 그 사례의 원인 태그 한 줄을 보인다.

- 원인은 **새 판단이 아니다.** 이미 저장된 판정 JSON의 결정적 단계(`verdict.decisive`의 `step`·`rule_seq`)와 막힌 방향의 사유(`forward.reason`/`return.reason`)를 **묶어 이름을 붙이는 것**이다. PASS/DENY·`comparison`을 만들거나 바꾸지 않는다(ADR-001, 집계 ≠ 판정 — PR #17 합의).
- 분류할 수 없으면 **`분류 못 함`으로 둔다.** 그럴듯한 원인을 추측하지 않는다(ACL 점검의 "점검 못 함"과 같은 규칙).
- 앱 안 LLM은 쓰지 않는다(ADR-002). 정답·채점·점수·완료 표시를 만들지 않고 `cases/*.json`의 `expect`를 읽지도 바꾸지도 않는다(AGENTS.md).

### 원인 태그 (엔진 근거에서 계산, D2 확정)
| 코드 | 화면 이름 | 엔진 근거 |
|---|---|---|
| `acl_rule` | ACL 규칙에서 차단 | `decisive.step`이 `acl_in`·`acl_out`이고 `rule_seq`가 있음 |
| `acl_implicit` | ACL 암묵적 deny(일치 규칙 없음) | 같은 단계이고 `rule_seq`가 없음 |
| `no_route` | 경로 없음 | 막힌 방향의 `reason`이 `경로 없음` |
| `no_gateway` | 기본 게이트웨이 없음 | 같은 자리의 `기본 게이트웨이 없음` |
| `no_next_hop` | 다음 홉 없음 | 같은 자리의 `다음 홉 없음` |
| `host_no_forward` | 호스트가 전달하지 않음 | 같은 자리의 `호스트가 전달하지 않음` |
| `routing_loop` | 라우팅 루프 | 같은 자리의 `라우팅 루프` |
| `no_block` | 막는 곳 없음(통과) | `result`가 `PASS`(막힌다고 한 답이 틀린 경우) |
| `other` | 분류 못 함 | 위 어느 것도 아님. 옛 사례·형태가 다른 JSON 포함 |

- **방향**은 태그를 쪼개지 않고 별도 값으로 둔다. `verdict.return`이 있고 `delivered`가 거짓이면 `복귀 방향`, 아니면 `정방향`. Top 5의 각 행에 `복귀 N건`을 함께 적는다(세션 응답이 막혀 DENY가 되는 자리가 수업에서 가장 잘 틀리는 곳이라 수를 잃지 않는다).
- `UNSUPPORTED`·`INVALID`는 태그가 아니라 **분모 밖**(`not_comparable`)이다.
- 화면 문구는 **엔진 문장을 그대로 베끼지 않고** 표의 이름만 쓴다. 엔진 문장이 바뀌어도 조용히 `other`로 새지 않도록, 엔진 테스트가 태그마다 실제 토폴로지를 만들어 왕복 확인한다(완료 조건 3).

### 집계 규칙 (D3 확정)
- 분모: `comparison = DISAGREE`인 사례(받은 답 ≠ NetProof 판정). AI 답과 사람 예상을 **한 분모**로 세고 `claim.kind`별 건수를 한 줄로 덧붙인다.
- 제외(각각 수를 화면에 적는다): `AGREE`, `NO_CLAIM`(답 없음), `NOT_COMPARABLE`(`UNSUPPORTED`·`INVALID`). **분모 + 세 제외 = 전체 사례 수**여야 한다(서버 테스트 불변식).
- 정렬: 건수 내림차순, 같으면 위 표 순서(결정적). 6위 이하는 `그 외 N건` 한 줄로 합친다. 분모 0이면 비율은 `—`.
- **오탐·미탐(혼동 행렬)과 다른 축이다.** `DISAGREE`에서 오탐·미탐을 유도하지 않고, 실제 결과·검토 확인을 분모 조건으로 쓰지 않는다(§10 규칙 유지).
- 성능: `DISAGREE` 행만 `(id, result, verdict)`로 읽어 Python에서 센다. 상한 2,000건을 두고 넘으면 최근 2,000건만 세고 화면에 **최근 2,000건만 집계**라고 적는다(조용히 자르지 않는다).

### 변경 범위 (만질 파일)
| 파일 | 변경 |
|---|---|
| `engine/src/netproof_engine/cause.py` (새 파일) | 순수 함수 `cause(verdict) -> {"tag", "direction"}`. 저장된 판정 JSON만 받고 네트워크를 다시 읽거나 판정하지 않는다. 키가 없어도 예외 없이 `other` |
| `engine/src/netproof_engine/__init__.py` | `cause` 공개(+`__all__`) |
| `engine/tests/test_cause.py` (새 파일) | 태그 9개 왕복(토폴로지 → `verify` → `cause`), 방향, 빈·깨진 JSON → `other` |
| `server/netproof_api/cases.py` | `GET /api/dashboard` 응답에 `causes`(Top 5 행·`그 외`·`other`·제외 수·분모·상한 표시) 추가 |
| `server/netproof_api/models.py` | `Case.detail()`에 `cause` 추가(엔진 함수 호출). `summary()`·목록 응답은 그대로 |
| `server/tests/test_dashboard.py` | 집계·정렬·동률·제외 불변식·상한 표시 |
| `web/src/causeView.ts` + `.test.ts` (새 파일) | 코드 → 화면 이름·비율 문구. **태그를 계산하지 않는다**(서버가 준 값만 그린다) |
| `web/src/types.ts` | `CauseStat` 타입 |
| `web/src/pages/DashboardPage.tsx` | 「가장 많이 틀린 원인」 섹션(표 + 제외 줄 + 축 설명 한 줄) |
| `web/src/pages/CaseDetailPage.tsx` | NetProof 계산 블록에 `원인: …` 한 줄 |
| `scripts/qa_local.py` | 합성 사례 1~2건 추가(원인이 둘 이상 보이게: `synthetic-02`에 AI 답 `PASS`) |
| `docs/qa-manual.md` | 합성 사례 개수 문구 수정 + 대시보드 Top 5 확인 항목 |
| `docs/semantics.md` | §13 「원인 태그」 신설(태그 표·방향·분모·제외·분류 못 함) |
| `HANDOFF.md`, `decisions/ai-work-log.md` | 상태·기록 |

### 건드리지 않을 것
- `engine/verify.py`·`trace.py`·`acl.py`·`model.py` — 판정 경로. `Hop`·`Trace`·`verify()`의 반환 형태를 바꾸지 않는다(API 응답과 이미 저장된 JSON 형태가 따라 바뀐다).
- `cases/*.json`과 `expect`, 사례 정답·채점.
- `POST /api/verify` 응답(판정기 화면은 이번에 안 바꾼다. 이미 사유와 결정적 단계를 보인다).
- `GET /api/cases` 목록·필터·검색 — 원인별 목록 링크는 저장 열이 필요하므로 **다음 과제**.
- 혼동 행렬(`confusion`) 계산·칸 링크·`actual`·검토 확인 로직, 로그인·세션·보안 헤더·보안 로그.
- **DB 표·열**(D1의 선택에 따라 필요해질 때만. 아래 절차 참고).

### 사용자 결정 (2026-10-06 승인 — 확정, 추천안 그대로)
| | 결정 | 구현에 뜻하는 것 |
|---|---|---|
| **D1 원인을 누가 정하나** | **엔진 근거에서 계산만.** 사람이 붙이는 태그는 쓰임새를 본 뒤 별도 과제로 미룬다 | 새 열·입력 화면·검토 권한 없음. **DB 표·열 변경 없음**(아래 운영 DB 절차는 이번에 쓰지 않는다) |
| **D2 태그 목록** | **위 9개 그대로.** 방향은 태그를 쪼개지 않고 행 안에 `복귀 N건` | 태그를 합치거나 늘리지 않는다. 화면 이름도 표의 것을 쓴다 |
| **D3 "틀림"의 기준** | **받은 답 ≠ NetProof 판정**(`comparison=DISAGREE`). AI 답과 사람 예상은 **한 분모 + 종류별 건수 한 줄** | 실제 결과·검토 확인을 분모 조건으로 쓰지 않는다. 혼동 행렬과 섞지 않는다 |
| **D4 공개 범위** | **검토자 전용** — 지금 `GET /api/dashboard`에 더한다 | 권한·새 화면·새 경로를 만들지 않는다 |

고르지 않은 선택지(사람 태그, 방향별 18개 태그, 엔진 ≠ 실제 축, 로그인 사용자·비로그인 공개)는 **이번 범위가 아니다.** 필요해지면 설계부터 다시 한다.

### 예상 리스크
1. **원인이 판정·정답으로 읽힘.** → 섹션 문구에 "집계이며 판정·정답이 아니다", 점수·등급·완료 표시 없음. `docs/semantics.md` §13에 명시.
2. **엔진 문장이 바뀌면 조용히 `other`로 샌다**(`경로 없음` 등 다섯 사유는 문장 비교다). → 태그마다 실제 토폴로지로 `verify` → `cause` 왕복을 확인하는 엔진 테스트. 문장이 바뀌면 테스트가 깨진다.
3. **옛 사례·엔진 버전 차이로 JSON 형태가 다름.** → `cause()`는 `.get()`만 쓰고 예외를 올리지 않는다. 모르면 `other`(추측 금지).
4. **분모 혼동**(혼동 행렬과 섞어 읽기). → 축 설명 한 줄 + 분모·제외를 같은 화면에 표시 + 합 불변식 테스트.
5. **판정 JSON을 많이 읽어 느려짐**(F28처럼 응답·메모리가 커질 수 있다). → `DISAGREE`만, 필요한 세 열만, 상한 2,000건과 화면 표시.
6. **방향 판정 실수**(`복귀 방향`을 정방향으로 셈). → `synthetic-02`(복귀 경로 없음)를 고정 회귀로 쓴다.
7. **QA 합성 사례를 늘리면 기존 체크리스트 문구와 어긋난다.** → `docs/qa-manual.md`를 같은 PR에서 수정.
8. **DB 변경은 이번 범위가 아니다.** D1에서 (b)·(c)를 고르거나 원인별 목록 필터를 당기면 `cases.cause_tag` 열이 생기고, 그때는 아래 절차가 **먼저** 끝나야 배포할 수 있다.

### DB 변경이 필요해질 때만 (운영 DB 반영 절차)
읽을 때 계산하는 추천안(D1-a)에서는 **표·열 변경이 없다.** 아래는 D1에서 (b)·(c)를 고르거나 원인별 목록 필터를 넣을 때의 절차다.
1. Claude는 SQL 문장만 만든다: `ALTER TABLE netproof.cases ADD COLUMN cause_tag varchar(32);`(+ 필요하면 집계용 인덱스). **이 PC에서는 `DATABASE_URL`을 입력·저장하지 않는다.**
2. 사용자가 Supabase t08 → SQL Editor에서 실행한다. `cases`는 `netproof` 소유이므로 그 권한으로 실행하고 `public` 스키마는 건드리지 않는다.
3. 배포 순서: **열 추가 → Vercel 배포 → 기존 행 채우기.** 열이 없어도 500이 나지 않는 코드(없으면 읽을 때 계산)여야 미리보기 배포와 운영이 겹쳐도 안전하다.
4. 기존 행 채우기는 1회 서버 명령으로 하고 사례 내용·`expect`는 바꾸지 않는다.
5. 되돌릴 때는 코드만 되돌리고 열은 남긴다(열 삭제는 사용자 결정).
6. 완료 조건에 더한다: 운영 공개 주소에서 대시보드 200과 Top 5 표시, `/api/cases` 목록이 그대로 200.

### 완료 조건 (실행 가능한 명령과 기대 출력)
기준값은 이번 설계 시점에 Claude가 **직접 실행해** 받은 수다(2026-10-06, `codex/cause-tags`, 코드 변경 전).
1. `cd engine && ../.venv/Scripts/python -m pytest -q` → 기준 `350 passed, 2 xfailed`에서 **기존 350건이 줄지 않고** `test_cause.py` 추가분만 늘어난다.
2. `cd server && ../.venv/Scripts/python -m pytest -q` → 기준 `140 passed, 1 skipped`에서 추가분만 늘어난다.
3. 엔진 왕복 확인(합성 사례 3건, 기대 출력 고정):
   ```
   cd engine && ../.venv/Scripts/python -c "import json; from netproof_engine import verify, cause; [print(n, cause(verify(d['network'], d['flow']))) for n in ('01-https-acl','02-missing-return-route','03-acl-out') for d in [json.load(open('../cases/synthetic-%s.json' % n, encoding='utf-8'))]]"
   ```
   → `01-https-acl {'tag': 'acl_rule', 'direction': 'forward'}` · `02-missing-return-route {'tag': 'no_route', 'direction': 'return'}` · `03-acl-out {'tag': 'acl_rule', 'direction': 'forward'}`
4. `npm --prefix web test` → 기준 `417 passed`에서 추가분만 늘어난다. `npm --prefix web run build` 성공.
5. 서버 테스트가 **분모 + `AGREE` + `NO_CLAIM` + `NOT_COMPARABLE` = 전체 사례 수**와 **Top 5 + `그 외` + `other` = 분모**를 확인한다(테스트 출력으로 근거를 낸다).
6. 화면: `.venv/Scripts/python scripts/qa_local.py`로 띄워 `qa_reviewer`로 로그인 → `#/dashboard`의 「가장 많이 틀린 원인」 표에 **원인 두 종류 이상**(ACL 규칙에서 차단 / 경로 없음 `복귀 1건`)과 분모·제외 줄이 보인다. 사례 상세에 `원인: …` 한 줄이 보인다. **1280×800·375×812에서 가로 넘침 0, 콘솔 오류 0.**
7. `git diff main...`에 「건드리지 않을 것」의 파일이 없다. `verify.py`·`trace.py`와 `cases/*.json`은 변경 0줄.
8. `HANDOFF.md`·`docs/semantics.md` §13·`decisions/ai-work-log.md`를 갱신한다.

### 테스트 결과 (Codex가 채운다 — 실제 실행 출력만)
- 실행: 2026-10-06, 이 worktree의 `.venv`·`web/node_modules`, Codex (GPT-6). PowerShell에서는 engine/server를 실행 디렉터리로 지정해 같은 명령을 실행했다.
- `cd engine && ../.venv/Scripts/python -m pytest -q`:
  ```text
  ........................................................................ [ 18%]
  ........................................................................ [ 37%]
  ........................................................................ [ 56%]
  ........................................................................ [ 75%]
  ........................................................................ [ 93%]
  ......................xx                                                 [100%]
  382 passed, 2 xfailed in 4.32s
  ```
- `cd server && ../.venv/Scripts/python -m pytest -q`:
  ```text
  ........................................................................ [ 48%]
  ...................s.................................................... [ 96%]
  ......                                                                   [100%]
  149 passed, 1 skipped in 26.79s
  ```
- 엔진 왕복 확인(완료 조건 3):
  ```text
  01-https-acl {'tag': 'acl_rule', 'direction': 'forward'}
  02-missing-return-route {'tag': 'no_route', 'direction': 'return'}
  03-acl-out {'tag': 'acl_rule', 'direction': 'forward'}
  ```
- `npm --prefix web test`(출력 요약 줄):
  ```text
  Test Files  32 passed (32)
       Tests  434 passed (434)
    Start at  11:43:42
    Duration  2.75s (transform 59%, import 23%, tests 13%, worker 4%)
  ```
- `npm --prefix web run build`(폰트 자산 목록 생략, 실제 출력 줄):
  ```text
  > tsc --noEmit && vite build
  vite v8.3.1 building client environment for production...
  ✓ 60 modules transformed.
  dist/assets/index-CQWvs7G8.css                            80.94 kB │ gzip:  22.54 kB
  dist/assets/index-CSAdkAWj.js                            359.88 kB │ gzip: 108.66 kB
  ✓ built in 264ms
  ```
- 서버 추가 회귀: 정렬·동률·Top 5 이후 합·분류 못 함·세 제외·분모 불변식, 상한 2,000/2,001 경계·날짜/ID 순서, SQL이 DISAGREE의 세 열만 선택·LIMIT 적용, 상세/목록 호환·옛 JSON·재판정 없음·QA 합성 사례/정리. 기존 140건 + 9건.
- 화면 확인(완료 조건 6): `scripts/qa_local.py`의 실제 `main()`을 호출하는 비커밋 QA 하네스로 임시 SQLite·127.0.0.1 서버 실행. stdout의 임시 비밀번호는 브라우저 프로세스 RAM에서만 읽어 UI 로그인, 서버 종료만 QA 전용 WSGI 처리로 연결했다. Chromium headless·라이트, 실제 배포 번들, CSS/응답 대역 없음. 주요 실제 출력:
  ```text
  Dashboard 1280x800 overflow=0 tags=ACL/no_route return=1
  Case 5 1280x800 overflow=0 원인: 경로 없음 · 복귀 방향
  Dashboard 375x812 overflow=0 tags=ACL/no_route return=1
  Case 5 375x812 overflow=0 원인: 경로 없음 · 복귀 방향
  Console errors=0
  QA server/browser cleaned
  ```
  사례 5건 × 두 크기 모두 상세 원인·방향과 overflow=0 확인. API: 전체 5·불일치/분모 2·AI 답 2, ACL 규칙 1·복귀 0 / 경로 없음 1·복귀 1, 제외 AGREE 1·NO_CLAIM 2·NOT_COMPARABLE 0. 화면 각 50%, 캡처 육안 확인. QA 서버·브라우저·임시 DB/프로필 정상 정리, 4863/9233 listen 0. 사용자 수동 QA A~E는 대기 유지.
- 변경 범위: 지정 파일 안에서만 변경. `git diff --numstat -- cases engine/src/netproof_engine/verify.py engine/src/netproof_engine/trace.py engine/src/netproof_engine/acl.py engine/src/netproof_engine/model.py` 출력 없음. `git diff --check` 오류 없음.

### 리뷰 기록 (Claude가 채운다)
- 

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
4. [ ] 원인 태그·통계("가장 많이 틀린 원인 Top 5") — ⑤ **← 구현·검증 완료(2026-10-06), Claude 리뷰 대기**
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
- **Claude:** 위 「다음 차례」 1~3. 결정은 「사용자 결정」 표가 기준이고 거기서 고르지 않은 선택지는 범위 밖이다. 이 브랜치에서 리뷰하고 `main`으로 바꾸지 않는다.
- **사용자:** 배포 후속(가입·사례 저장·로그아웃·검토자 지정·Vercel 환경 변수)과 수동 QA A~E는 사람이 확인한다.
- **검토자 지정(7단계):** `make-reviewer`는 `netproof` 계정 연결 주소로 실행한다(`docs/deploy.md` 7). 주소는 채팅·명령줄·캡처에 넣지 않는다.
- **배포 흐름:** `main`에 병합하면 바로 운영에 나간다. 리뷰 원칙은 그대로이고, 병합 뒤 공개 주소에서 바뀐 화면·API를 한 번 확인한다.
- **t08 Postgres 오류:** 배포 전 t08 대시보드에 최근 60분 Postgres 오류 111건이 일정한 간격으로 보였다(NetProof와 무관, 원인 미확인). 사용자가 Supabase Logs에서 확인한다.
- **남은 후속:** F28 change-impact 응답에 바뀐 칸 전체가 담김(최대 971줄·571 KiB), F2 용어 통일, F3 받은 답 종류·중복 정리.
- 접기는 CSS(`.mobile-fold`)로만 하고 React로 `open`을 관리하지 않는다. 넓은 화면은 지금과 같아야 한다. 판정기는 접지 않는다.
- 실습 입력은 `practiceDrafts`에만 두고 판정기 `draft`는 `판정기로 가져가기`(기존 되돌리기) 때만 바꾼다. 실습 판정은 verify만 부른다. 승인된 다른 통신 영향은 단추로 change-impact를 요청하고 비교·분류를 화면에서 다시 계산하지 않는다(ADR-001). 정답·채점·완료 표시를 만들지 않는다.
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

현재 과제(원인 태그·통계) 설계: Claude Opus 5(승인 2026-10-06). 구현: Codex (GPT-6). 리뷰: Claude 대기. 결정·병합: 사용자.
이전 배포 작업: 단계 안내·DB 준비 스크립트·공개 주소 점검·문서 Claude (Claude Opus 5.5). 가입·SQL 실행·Vercel 입력·병합: 사용자.
