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
- 작업: 정책 검증 + 도달성 매트릭스 (로드맵 2주차 ★대표)
- 사용자 승인(2026-10-02): 이번 과제는 CLAUDE.md/AGENTS.md 역할대로 Claude가 설계, Codex가 구현·테스트한다.
- 기반: 최신 origin/main(PR #13 병합 완료). 사례 목록 검색·필터·페이지는 끝났다.
- 브랜치: codex/policy-matrix (origin/main 기반 새 브랜치). 설계는 main이 아니라 이 브랜치에 기록한다.
- 단계: Claude 설계 → Codex 구현·테스트·브라우저 확인 완료 → Claude 독립 리뷰 준비
- 다음 차례: Claude 독립 리뷰. 병합은 사용자 최종 확인 후 결정한다.

## 작업 정의
- 목표: 판정기에 입력한 network로 모든 host 인터페이스 IP 순서쌍 × 주요 서비스(TCP/UDP 포트, ICMP)를 기존 `verify`로 반복 판정하고, 사용자가 적은 PASS/DENY 의도와 비교해 "막혀야 하는데 열림"(노출)을 최우선으로 보여 준다.
- 엔진: 새 모듈 `matrix.py`, 공개 API는 `policy_matrix(network_data: dict, spec: dict) -> dict` 하나. `__init__.py`의 `__all__`에 추가한다. `verify`·`trace`·`acl`·`model`은 고치지 않고 호출만 한다. 판정·정책 비교·집계는 엔진 안에서만 한다(ADR-001). 어떤 입력에도 예외 대신 결과 사전을 돌려준다.
- spec: `{"services":[{"proto":"tcp|udp|icmp","dst_port":1~65535,"icmp":"echo|echo-reply|숫자","label":"HTTPS"}], "mode":"session|one-way", "intents":[{"src","dst","service":"tcp/443","expect":"PASS|DENY","note"}]}`. mode는 매트릭스 전체에 하나. 서비스 키는 `tcp/443`·`udp/53`·`icmp/echo`로 정규화하고, 중복 서비스·중복 의도는 하나로 합친다. 의도는 (src, dst, service) 정확 일치만 쓰고 와일드카드는 넣지 않는다.
- 끝점: `kind=host` 장비의 인터페이스 IP만. (device id, interface name) 순 정렬. **자기 자신 쌍(같은 IP)과 같은 장비 쌍은 제외**한다 — 실행으로 각각 INVALID와 허위 DENY를 확인했다(`trace.py:88` `_neighbor`가 같은 장비 인터페이스를 건너뛰어 "다음 홉 없음"이 된다). ACL은 방향성이 있으므로 두 방향을 각각 계산한다.
- 셀 상태: `policy` = NO_POLICY(의도 없음) · AGREE(의도와 같음) · EXPOSED(의도 DENY인데 PASS) · BLOCKED(의도 PASS인데 DENY) · UNDECIDED(result가 UNSUPPORTED/INVALID라 비교 불가). 심각도 순서는 EXPOSED > BLOCKED > UNDECIDED > AGREE > NO_POLICY. 기존 `comparison`(AGREE/DISAGREE/NOT_COMPARABLE/NO_CLAIM)과 **다른 이름**을 쓰고 대응 관계를 `docs/semantics.md`에 적는다.
- JSON 계약: `{status:"OK"|"INVALID", problems:[], mode, engine_version, endpoints:[{ip,device,interface}], services:[{key,proto,dst_port,icmp,label}], cells:[{src,dst,service,result,policy,expect,reason,decisive}], totals:{checks,PASS,DENY,UNSUPPORTED,INVALID,NO_POLICY,AGREE,EXPOSED,BLOCKED,UNDECIDED}, exposures:[심각도 순 셀]}`. network가 성립하지 않으면 `status:"INVALID"`와 `load`의 problems만 돌려주고 셀을 만들지 않는다. 셀에는 hop 전체를 넣지 않고 `decisive` 한 개만 넣는다.
- 상한: 끝점 24개, 서비스 8개, 의도 500개, 검사 건수(쌍×서비스) 2,000개. 초과하면 계산하지 않고 `status:"INVALID"`와 초과 수치를 문구로 돌려준다. 기존 LIMITS(장비 40·인터페이스 16)는 그대로 둔다.
- 서버: `POST /api/policy-matrix`. 기존 `_limit_problem`으로 network 크기 422, spec 상한 초과 422, 그 밖에는 엔진 결과를 그대로 jsonify한다. `/api/verify`처럼 로그인 없이 쓴다. 서버는 입력 한도와 API만 담당하고 판정·비교·집계를 복제하지 않는다.
- UI: 새 라우트 `#/matrix`와 탭 "정책 검증". 판정기와 같은 draft의 `toNetwork(draft)`를 쓰고 판정기에 "정책 검증으로" 버튼을 둔다. 서비스 편집·mode 선택, 서비스별 src×dst 격자(행 출발지·열 목적지), 노출 셀 최우선 강조와 "노출 N건" 요약을 맨 위에 둔다. 셀을 누르면 의도를 PASS/DENY/없음으로 지정하고, **상세 증거는 기존 `POST /api/verify`를 그 흐름 하나로 호출해 기존 ResultPanel·AclEvidence로 보여 준다**(새 증거 계약 없음). spec은 이 화면의 localStorage 키에만 저장하고 사례·공유 JSON에는 넣지 않는다. UI는 입력·표시만 한다.
- 순수 함수는 `web/src/policyMatrix.ts`에 두고(격자 피벗, 심각도 정렬, 셀↔의도 변환) DOM 없이 테스트한다.
- 허용 파일: `engine/src/netproof_engine/{matrix.py(신규),__init__.py}`, `engine/tests/test_policy_matrix.py`(신규), `server/netproof_api/cases.py`, `server/tests/test_policy_matrix.py`(신규), `web/src/{policyMatrix.ts,policyMatrix.test.ts}`(신규), `web/src/pages/PolicyMatrixPage.tsx`(신규), `web/src/{App.tsx,router.ts,router.test.ts,api.ts,types.ts,styles.css}`, `web/src/pages/JudgePage.tsx`(링크 버튼만), `docs/{policy-matrix.md(신규),semantics.md}`, `HANDOFF.md`, `decisions/ai-work-log.md`.
- 제외: `verify`·`trace`·`acl`·`model` 판정 로직 수정, 기존 malformed 입력 예외 버그 수정, cases 기대값, 새 의존성, DB 스키마·모델, 인증·권한, 실제 패킷·장비 접근, 대시보드·오탐/미탐, 배포·병합.
- 위험: `verify`가 호출마다 `load`로 network를 다시 파싱하므로 상한에서 느릴 수 있다(측정 필수). 같은 장비 쌍 허위 DENY와 자기 자신 INVALID를 빼먹으면 노출·차단 판정이 거짓이 된다. ECMP·재귀 next hop은 `Unsupported`를 던져 UNDECIDED가 된다. session 모드의 비 echo ICMP는 UNSUPPORTED이며 버그가 아니다. 상한의 셀 수는 응답 크기·격자 렌더링·모바일 레이아웃에 부담이 된다. `policy`와 기존 `comparison`을 혼동할 수 있다. `load`의 기존 예외 버그는 그대로 상속된다(이번 범위 밖).
- 완료 조건: `cd engine && ../.venv/Scripts/python -m pytest -q`, `cd server && ../.venv/Scripts/python -m pytest -q`, `npm --prefix web test`, `npm --prefix web run build`를 직접 실행하고 출력을 붙인다. 엔진 테스트: 방향별 두 셀 생성, 같은 장비 쌍·자기 자신 제외, 서비스·의도 중복 합치기, 네 상한 초과 거절, EXPOSED 최우선 정렬, ECMP로 UNDECIDED, session ICMP non-echo로 UNDECIDED, 의도 없음 NO_POLICY, INVALID network는 status INVALID + problems, totals 합이 checks와 같음, 같은 network/spec은 같은 결과(결정성). 서버 테스트: spec 상한 초과 422, 큰 network 422, 정상 200 계약. 웹 테스트: 격자 피벗·심각도 정렬·셀↔의도 변환, `#/matrix` 라우트. 상한 근처(끝점 16·서비스 8·검사 1,920)에서 `policy_matrix` 1회 실행 시간을 측정해 여기 적고, 2초를 넘으면 상한을 낮추자고 요청한다. 브라우저로 노출 강조·셀 상세와 375폭 가로 넘침 없음을 확인한다.

## 완료 내용 / 테스트 결과
- 구현: 엔진 policy_matrix·공개 API, POST /api/policy-matrix, 판정기 draft 연동 정책 검증 탭·서비스 편집·의도 지정·서비스별 표·셀 상세 기존 증거 UI·localStorage 입력 저장.
- Claude 추가 합의: exposures는 EXPOSED/BLOCKED/UNDECIDED의 우선 확인 목록, 실제 노출 수는 totals.EXPOSED만. 중복 기대값 충돌은 전체 INVALID. ICMP 8/0은 echo/echo-reply 키로 정규화. UNDECIDED는 의도 유무 무관. limit_exceeded boolean을 응답에 추가해 서버가 상한 계산을 복제하지 않고 422를 결정한다(나머지 INVALID는 200).
- 형식 규칙: 서비스 label 80자·의도 note 200자, TCP/UDP JSON 정수 포트(bool 제외), ICMP 0~255/최대 3자리 ASCII. 대상 밖 의도는 자동으로 버리지 않고 INVALID 안내. 원본 서비스/의도 목록에도 상한 적용.
- 2026-10-02 직접 실행:
  - `cd engine && ../.venv/Scripts/python -m pytest -q` → `185 passed, 2 xfailed in 2.61s`
  - `cd server && ../.venv/Scripts/python -m pytest -q` → `74 passed, 1 skipped in 12.33s`
  - `npm --prefix web test` → `Test Files 7 passed (7)`, `Tests 79 passed (79)`, `Duration 692ms`
  - `npm --prefix web run build` → `✓ built in 373ms`
- 독립 리뷰 중 Codex 자체 확인으로 422 상한 오류의 엔진 problems가 화면에서 일반 오류로 가려지던 부분을 보완했다. API errorDetail이 detail 또는 problems를 전달하고 회귀 테스트 1개를 추가했다.
- 성능 실측: 합성 호스트 16·라우터 1(서브넷 2개/in permit ACL)·TCP 서비스 8·1,920건 → status OK, 0.8265초(perf_counter 1회). 모든 구성의 2초 보장은 아니다. 긴 ACL/많은 라우터에서의 속도 한계는 docs/policy-matrix.md에 명시.
- 브라우저: 기본 구성 10건 PASS/의도 없음 → HTTPS DENY 의도 → 재계산 노출 1건·9건 의도 없음. 기존 예시 01 구성 연동 → HTTPS DENY/의도 일치 → 셀 상세 ACL 101 1번 차단·목적지 미도달 확인. console error 0. 375×812에서 첫 표 넘침 발견·수정 후 본문 scrollWidth 360/viewport 375, 표 내부 scrollWidth 436. 임시 DB·합성 구성만 사용했고 사례 기대값은 수정하지 않았다.
- 입력 변경/언마운트·다른 셀 선택의 늦은 응답을 화면 guard로 무시. 성공/오류 guard는 순수 helper 테스트이며 전체 DOM 마운트 테스트는 아니다. 화면 흐름은 위 브라우저로 확인.
- 설계 단계에서 Claude가 직접 실행해 확인한 사실(구현의 전제):
  - 같은 장비의 다른 인터페이스 쌍(PC1 eth0 10.10.10.10 → PC1 eth1 10.30.30.10) → `DENY "다음 홉 없음"`. 실제 차단이 아니라 모델 한계이므로 매트릭스에서 제외한다.
  - 자기 자신 쌍(같은 IP) → `INVALID "출발지와 목적지가 같습니다"`. 제외한다.
  - 정상 교차 장비 쌍(10.10.10.10 → 10.20.20.5, tcp/443, session) → `PASS`.
- 참고한 기존 코드: `engine/src/netproof_engine/verify.py`(RESULTS·mode·`_reverse`·UNSUPPORTED/INVALID 경로), `trace.py`(Hop·decisive·`_neighbor`·ECMP Unsupported), `model.py`(`kind=host/router`, `all_interfaces`, `owner`), `server/netproof_api/cases.py`(`LIMITS`·`_limit_problem`·`/api/verify`), `web/src/draft.ts`(`toNetwork`·`endpoints`), `web/src/components/ResultPanel.tsx`·`AclEvidence.tsx`(증거 UI 재사용 대상), `web/src/router.ts`.

## 리뷰 기록
- 정책 검증 + 도달성 매트릭스: 설계만 끝났고 구현 전이라 리뷰 없음. Codex 구현 후 Claude 독립 리뷰 차례다.

### 지난 과제 — 사례 목록 검색·필터·페이지 (PR #13 병합 완료)
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
- 사용자가 PR #13을 병합했다(origin/main 반영 완료). 남은 비차단 후속 1건(빈 검색창 공백 재조회)은 다음에 CasesPage를 만질 때 함께 처리한다.

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
- [x] 사례 목록 검색·필터·페이지(PR #13 병합 완료) — ⑤ 제목·작성자·IP 검색, 판정·일치·확인·출처 필터, 서버 페이지·인덱스

**2주차 (10-05~10-11)**
- [ ] 정책 검증 + 도달성 매트릭스 ★대표 — ③ "이 통신은 막혀야/열려야 한다" 의도 입력 → 모든 호스트 쌍 × 주요 포트 히트맵, "막혀야 하는데 열림"(노출) 최우선 강조. 기존 `verify` 반복 호출로 판정 의미 유지. **설계 완료(위 작업 정의), 구현 진행 중 — 브랜치 codex/policy-matrix**
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
- Codex: 구현 전에 `engine/src/netproof_engine/{verify,trace,model}.py`와 `web/src/{draft.ts,components/ResultPanel.tsx}`를 읽어 매트릭스가 호출만 하고 판정을 복제하지 않는지 확인한다.
- 구현 완료 후 Claude 독립 리뷰, 사용자 병합 결정.

## 주의사항 / 미해결 이슈
- 관계없는 줄바꿈 변경 금지.
- 이전 PR #12의 별도 버그(strict xfail 두 건), Hypothesis 하한 문제는 별도 후속 범위.
- 매트릭스는 `verify`를 호출만 한다. 셀 하나라도 판정·비교를 서버나 화면에서 다시 계산하면 ADR-001 위반이다.
- 같은 장비 쌍 허위 DENY와 자기 자신 INVALID는 엔진 버그 수정 대상이 아니라 **매트릭스에서 제외할 입력**이다. `verify`·`trace`를 고치지 않는다.
- 상한 초과는 잘라서 계산하지 말고 거절한다. 일부만 계산한 매트릭스는 "노출 없음"을 거짓으로 보이게 한다.
- CasesPage 후속 1건(빈 검색창 공백 재조회)은 이번 과제 범위가 아니다.

설계: Claude (Claude Opus 5)

Codex (GPT-6)
