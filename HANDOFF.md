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
- 작업: 사례 목록 검색·필터·페이지
- 사용자 승인(2026-10-02): 이번 과제는 Codex가 설계까지 담당한다. 독립 리뷰는 Claude에게 요청한다.
- 기반: main e0d420c, PR #11·#12 병합 완료.
- 브랜치: codex/case-search
- 단계: Claude 독립 리뷰·6건 보완·재리뷰 PASS 완료 → 사용자 최종 확인 대기
- 다음 차례: 사용자 최종 확인·병합 결정(PROMPTS.md 5번). PR #13은 OPEN, 자동 병합하지 않는다.

## 작업 정의
- 목표: 200개 제한 목록에서 제목·작성자·flow src/dst IP 검색, 판정·받은 답과 판정 비교·확인·실제 결과 출처 필터, 서버 페이지 이동을 제공한다.
- 검색: q(최대 100자), ASCII 영문 대소문자 무시 부분 문자열. SQLite 비ASCII 대소문자 변환은 보장하지 않으며 PostgreSQL locale/collation에 따라 결과가 다를 수 있다. %, _, /는 문자 그대로 처리한다. 네트워크 내부의 모든 주소 검색은 제외한다.
- 필터: mine=0/1, result=PASS/DENY/UNSUPPORTED/INVALID, comparison=AGREE/DISAGREE/NOT_COMPARABLE/NO_CLAIM, confirmed=0/1, source=nmap/ping/device/other/none. 필터는 AND, 검색 대상 필드는 OR. 빈 값은 전체.
- API: page 또는 per_page가 있으면 {items,total,page,per_page,pages}. 기본 20개, 최대 100개, page 최대 1,000,000. page/per_page 문자열은 7자리 이하 ASCII 숫자(앞의 0 포함). 형식/자리수와 값 범위 오류는 다른 문구로 400. 필터/검색 길이 오류는 400. page 초과는 마지막 페이지로 보정, 빈 목록은 page=pages=1. 페이지 인자가 없는 기존 요청은 배열(최대 200개)을 유지한다.
- 정렬: created_at DESC, id DESC. 필터링·count·offset/limit을 DB에서 처리하고 owner를 한 번에 가져온다.
- 인덱스: created_at/id, owner_id/created_at/id, result/created_at/id. 기존 SQLite는 앱 시작 시, 배포 DB는 기존 flask init-db 명령 재실행으로 checkfirst 적용한다. 데이터/컬럼 변경 없음.
- UI: 검색 제출, 네 필터, 내 사례, 초기화, 전체 건수·페이지 수·이전/다음. 조건 변경 시 첫 페이지. 검색창을 비우면 q도 즉시 해제, 드롭다운 변경 시 현재 입력 검색어 적용. 로딩 중 이전 결과 표시와 비활성 페이지 버튼 유지. 요청 순서가 바뀌어도 이전 응답 무시. 로딩·오류·빈 결과·재시도 제공, 작은 화면에서도 줄바꿈.
- 변경 파일: server/netproof_api/{cases,models,__init__}.py, server/tests/test_case_search.py, web/src/{api,types,caseSearch,caseSearch.test}.ts, web/src/pages/CasesPage.tsx, web/src/styles.css, docs/case-search.md, HANDOFF.md, decisions/ai-work-log.md.
- 제외: 엔진/판정 로직, cases 기대값, 인증·권한, 대시보드, 새 의존성, 배포·병합.
- 리스크: SQLite/PostgreSQL JSON 표현 차이, LIKE 와일드카드, 정렬 동률/페이지 경계, 기존 DB 인덱스 미적용, 이전 요청 덮어쓰기. 부분 검색/복합 필터는 데이터 규모에 따라 스캔할 수 있다. offset 페이지는 동시 추가/삭제 시 중복/누락 가능(스냅샷 계약 없음).
- 완료 조건: engine pytest, server pytest, npm web test, npm web run build 직접 실행. 200개 초과 탐색·동률 정렬·각 필터/AND·검색 특수문자/작성자/양쪽 IP·잘못된 인자·비로그인 차단·기존 응답·기존 인덱스 적용 테스트. 브라우저로 데스크톱/모바일 UI 확인. PostgreSQL 실제 연결이 없으면 미검증으로 명시.

## 완료 내용 / 테스트 결과
- 검색·필터·페이지 UI, 기존 배열 API 호환, owner 일괄 로드, 기존 DB 인덱스 적용 구현 완료.
- 2026-10-02 직접 실행 결과:
  - `cd engine && ../.venv/Scripts/python -m pytest -q` → `158 passed, 2 xfailed in 3.03s`
  - `cd server && ../.venv/Scripts/python -m pytest -q` → `70 passed, 1 skipped in 13.10s`
  - `npm --prefix web test` → `Test Files 6 passed (6)`, `Tests 69 passed (69)`, `Duration 1.03s`
  - `npm --prefix web run build` → `✓ built in 912ms`
  - `git diff --check` → 오류 없음(exit 0).
- 브라우저: 임시 SQLite/합성 사례 25개, 별도 4821 서버에서 2/2 페이지(5개) → ping 필터 13개/첫 페이지 → 빈 검색 0개 → 초기화 25개 → HTTPS 25 검색 1개 확인. 375×812에서 content width 360, viewport 375로 가로 넘침 없음. 콘솔 error 0.
- PostgreSQL: JSON 검색 SQL 컴파일 테스트 통과. 실제 PostgreSQL 연결은 환경 미제공으로 미검증. 서버 테스트의 기존 PostgreSQL 전용 1건은 skip.
- 실제 장비 증거가 아닌 합성 데이터다. 기존 사용자 DB에 QA 사례를 넣지 않았다.

## 리뷰 기록
- [Claude 독립 리뷰](https://github.com/myeongjundev/netproof/pull/13#issuecomment-5943803710), 검토 SHA b990e661d2d93355ae248c53cfe67f6c694ceb13. 모델 Claude Opus 5. 차단 결함 없음, 비차단 6건 보완 요청. 아래는 Codex 반영 상태이며 Claude가 a807b6a에서 F1~F6 해결을 확인했다.
| 항목 | 반영 | 검증 |
|---|---|---|
| F1 SQLite 비ASCII 검색 설명 | ASCII 보장·DB별 Unicode 한계 문서/작업 정의 명시 | SQLite ÄÖ/äö와 ASCII 회귀 테스트 |
| F2 검색창 지우기·필터 변경 시 q 불일치 | 빈 입력 즉시 q 해제, 필터 변경 시 현재 검색어 적용, 적용 검색어 표시 | 브라우저 네이티브 ×로 1→13개(ping 유지), 초기화 25개; 제출 없이 HTTPS 25 입력+ping 선택 1개 |
| F3 숫자 인자 오류 문구 | 형식/7자리 초과와 범위 오류 분리 | 앞의 0 포함 8자리·5000자리 거절 문구 테스트 |
| F4 검색 중복 조인 | contains_eager로 명시 조인 재사용 | 실제 결과 SELECT별 users 조인 1개 단언 |
| F5 오래된 응답 자동 검증 | CasesPage effect cleanup을 loadCasePage helper로 분리 | 늦은 성공/오류 두 테스트; active 가드 제거 시 2 failed, 복원 후 4 passed(364ms) |
| F6 로딩 중 페이지 버튼 사라짐 | data 유지+loading, 이전 결과 문구/표 aria-busy/흐림, nav 유지·disabled | 브라우저 2/2 페이지 이동 확인 |
- 기존 mine=true 무시→400은 의도한 입력 검증 강화다. 기존 클라이언트의 mine=1/무인자 호환은 유지.
- F5는 실제 effect에서 쓰는 helper의 응답 순서 테스트이며 CasesPage DOM 마운트 전체를 자동 검증하는 테스트는 아니다. 화면 흐름은 브라우저로 확인했다.
- Claude 직접 실행: 엔진 158+2 xfail(1.60s), 서버 68+1 skip(13.55s), 웹 67(557ms), 빌드 363ms. 보완 후 Codex 실행은 위 최신 결과.
- PostgreSQL 실연결·EXPLAIN은 미실행.

### Claude 재리뷰 PASS (2026-10-02)
- [재리뷰 코멘트](https://github.com/myeongjundev/netproof/pull/13#issuecomment-5943941359). 검토 SHA a807b6a8c28a77529e9c97c96f0748032048c94e. 모델 Claude Opus 5. 검토 범위 b990e66..a807b6a, F1~F6.
- 직접 실행: 서버 검색 테스트 26 passed in 5.01s, 서버 전체 70 passed/1 skipped in 11.59s, 웹 검색 테스트 4 passed(200ms). contains_eager SQL도 단일 users 조인 확인.
- 미해결 차단 결함 없음. F5 helper 레이스 테스트와 DOM 전체 마운트 테스트를 구분한 범위에 동의했다.
- 비차단 후속 1건: web/src/pages/CasesPage.tsx 빈 검색창에서 공백만 입력하면 매 타자마다 조건이 같아도 새 filters 객체로 재조회된다. 이미 q가 빈 값이면 건너뛰는 개선은 후속으로 남긴다. 결과 정확도에는 영향 없으며 이번 PASS를 막지 않는다.
- 사용자 병합 결정 대기. 이후 문서 기록 커밋은 실행 코드 변경 없음.

## 남은 작업 — 로드맵 (2026-09-30 확정, ADR-015)
**정체성**: 네트워크 설정에 대한 답(AI·사람)을 계산으로 검증하고, 왜 그런지 보여 주고, 실제 결과로 그 검증까지 검증하는 실습실.
**순환 고리**: ① 입력 → ② 판정·설명 → ③ 보안 점검 → ④ 실제 결과로 확인 → ⑤ 통계·학습 → ①. 모든 기능은 이 중 하나를 강화한다.
**근거**: 강사님 피드백 — 목록 필터·검색·최적화 / 오탐·미탐 감지 / 시각화·하이라이트·색. 사용자가 "전부 넣는다"로 결정.
**원칙**: 판정·점검·수정 후보는 모두 엔진 계산(ADR-001). 앱 안 LLM 설명은 계속 제외(ADR-002). 과제마다 설계 → 구현 → 리뷰 → 병합 한 바퀴. 같은 폴더에서 Codex 작업은 한 번에 하나(병행하려면 별도 worktree).

**끝난 것**
- [x] 협업 파일 도입 · [x] P1 사례 URL 공유(PR #2) · [x] 도달 못 한 목적지 표시(PR #4)
- [x] `plan.md` 목표 변경 기록(ADR-015)

**2주차 전반 (~10-04)**
- [x] ACL 규칙 줄 하이라이트(이슈 #5 · PR #6 병합) — ② 판정을 가른 줄 빨강, 통과시킨 줄 초록, 도달하지 않은 줄 회색
- [x] 이슈 #7 유니코드 숫자 `ValueError`·500 수정(PR #8 병합, 이슈 #7 닫음) — 버그. `isdigit()`가 참이어도 `int()`가 거부하는 **문자**(`²`·`①`)
- [x] 이슈 #9 긴 숫자 `int()` 한도(PR #11 병합 완료) — 버그. 같은 약속("예외 없이 네 값 중 하나")의 남은 부분: 문자는 맞지만 **자릿수**가 4300을 넘는 경우
- [ ] 사례 목록 검색·필터·페이지 — ⑤ 제목·작성자·IP 검색, 판정·일치·확인·출처 필터, 서버 페이지·인덱스

**2주차 (10-05~10-11)**
- [ ] 정책 검증 + 도달성 매트릭스 ★대표 — ③ "이 통신은 막혀야/열려야 한다" 의도 입력 → 모든 호스트 쌍 × 주요 포트 히트맵, "막혀야 하는데 열림"(노출) 최우선 강조. 기존 `verify` 반복 호출로 판정 의미 유지
- [ ] Cisco 설정 붙여넣기 ①`interface`/`ip address` ②`ip route` — ① (수업 ACL이 Cisco인지 확인 필요)
- [ ] 사례 복제·실습 과제 템플릿 — ①

**3주차 (10-12~10-18, 해커톤 1차 주말 — 가볍게)**
- [ ] 오탐·미탐 대시보드 — ⑤ AI 답·사람 예상·NetProof 판정을 각각 실제 결과와 2×2로, 칸을 누르면 목록 필터로. **양성 정의는 사용자가 정한다**
- [ ] 실제 결과 붙여넣기(ping·Nmap 출력 → PASS/DENY) — ④
- [ ] ACL 점검(가려진 규칙·중복·과도한 permit) — ③ `docs/semantics.md` 함께
- [ ] Cisco 설정 붙여넣기 ③`access-list`/`ip access-group`
- [ ] **배포**(사람 트랙과 함께) — 4주차 테스트 전에 공개 URL

**4주차 (10-19~10-25) — 사용자 테스트 주간, 기능은 병행**
- [ ] 수정 후보 제안("무엇을 바꾸면 통하나") — ② 엔진 계산
- [ ] 변경 전/후 판정 비교 — ②
- [ ] 원인 태그·통계("가장 많이 틀린 원인 Top 5") — ⑤

**5주차 (10-26~11-01, 해커톤 2차 주말) — 11-01 기능 동결**
- [ ] 연습 문제 모드(판정 숨기고 예측 → 채점, 개인 오탐·미탐) — ⑤
- [ ] 구성도 그림 + 경로 재생 — ②
- [ ] 불일치 사례 → 회귀 테스트 내보내기, 엔진 버전별 재판정 — ④
- [ ] 로그인 실패 → Graylog(GELF, 로컬 시연용) — 운영 (설계 중이던 것)
- [ ] Batfish 차등 테스트 — ④

**6주차 (11-02~11-08)**: 버그 수정만, 2차 테스트, 발표·제출

**사람 트랙 (동시에, LLM에 넘기지 않음)**
- [ ] 동기 3명 인터뷰 · [ ] 실제 결과가 있는 사례 모으기(오탐·미탐 대시보드의 재료) · [ ] 사례 04 손계산
- [ ] 수업 ACL이 Cisco인지 pfSense인지 확인 · [ ] 오탐·미탐 양성 정의 · [ ] 표어 결정
- [ ] 배포(Vercel·Supabase 가입, 비밀값) · [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

**위험**: 4주차 전에 ①~⑤의 핵심(하이라이트·목록 필터·정책 검증·오탐/미탐·실제 결과 붙여넣기)이 끝나지 않으면 사용자 테스트가 흔들린다. 밀리면 4·5주차 항목부터 미룬다.


## 다음 LLM이 확인할 내용
- git pull, git status, git log -3 후 본 작업 정의와 PR diff, 테스트 출력 확인.
- 구현 완료 후 Claude 독립 리뷰, 사용자 병합 결정.

## 주의사항 / 미해결 이슈
- 관계없는 줄바꿈 변경 금지.
- 이전 PR #12의 별도 버그(strict xfail 두 건), Hypothesis 하한 문제는 별도 후속 범위.

Codex (GPT-6)
