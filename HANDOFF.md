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
- 작업: 사례 복제 · 실습 과제 템플릿 (로드맵 2주차, 순환 고리 ①)
- 사용자 승인(2026-10-02): 다음 과제로 진행. Claude가 설계, Codex가 구현·테스트한다.
- 기반: 최신 origin/main `c0ab37e`(**PR #14 정책 검증 + 도달성 매트릭스 병합 완료**). 판정기·정책 검증·사례 게시판·검색·대시보드는 모두 동작한다.
- 브랜치: `codex/case-templates` (origin/main c0ab37e 기반). 설계는 main이 아니라 이 브랜치에 기록한다.
- 단계: **Codex 구현·검증 완료 → Claude 독립 리뷰 대기.**
- 보류: Cisco 설정 붙여넣기는 **수업 ACL이 Cisco인지 확인(사람 트랙)** 이 끝날 때까지 착수하지 않는다.

## 작업 정의
- 목표: 이미 있는 예시·사례를 **"다시 풀 수 있는 편집 초안"** 으로 열어 주는 길을 만든다. 앱은 과제의 네트워크·질문·확인할 점만 주고, 판정은 사람이 "판정하기"로 다시 받고 기대값은 사람이 손으로 적는다. **정답·기대값·채점을 앱이 만들지 않는다.**
- 범위를 이렇게 좁힌 이유: 과제 재료(`cases/*.json` 3개)와 적재 경로(`fromCase`·`load`), 저장 경로(`api.createCase` + 서버 재계산)가 이미 있다. 새 엔드포인트·DB 컬럼·자동 채점 없이 **신규 파일 2개 + 화면 3개 소폭 수정**으로 끝낸다.

### 1) 교육 템플릿 형식 (`web/src/practice.ts`, 신규·순수 함수)
- `interface PracticeTask { case_id: string; title: string; question: string; checkpoints: string[] }`
  - `case_id`는 `/api/examples`가 돌려주는 id(`synthetic-01`·`02`·`03`). 템플릿에는 **network·flow·acls를 복사하지 않는다**(원본 한 곳만 고치면 되게).
  - `question`은 한 줄 질문("PC1에서 SRV의 HTTPS에 접속되나?"), `checkpoints`는 2~4개의 "확인할 점"(예: "ACL이 붙은 방향", "돌아오는 경로").
  - **`question`·`checkpoints`에 판정과 규칙 번호를 쓰지 않는다.** 금칙어 `PASS`·`DENY`·`rule_seq`를 테스트로 막는다.
- `export const PRACTICE: PracticeTask[]` — 합성 교육용 3개. 문구는 `docs/workbench-tasks.md`의 질문 스타일을 따르되 **답은 옮기지 않는다**.
- `export function practiceTasks(examples: CaseItem[]): { task: PracticeTask; example: CaseItem }[]` — id로 join. 예시에 없는 `case_id`는 **조용히 버린다**(하드코딩 fallback network 금지). `PRACTICE` 순서를 유지한다.
- `export function cloneTitle(title: string): string` — `복제 · {원제목}`, 80자(서버 제목 한도)로 잘라낸다.

### 2) 실습 과제 UI (`web/src/pages/JudgePage.tsx`)
- 과제 재료는 **이미 불러오는 `api.examples()` 결과를 그대로 재사용**한다(JudgePage.tsx:35-37). 새 API 호출·새 라우트·새 탭을 만들지 않는다.
- `page-head` 예시 버튼 줄 아래에 `<details>` "실습 과제" 하나. `practiceTasks(examples)`가 비면 `details`를 그리지 않는다.
- 과제 시작 = `load(fromCase(example))` → **claim(받은 답) 비움** → 지역 상태 `task` 설정 → 저장 제목 기본값 `task.title`.
- 과제 안내 패널(제목·질문·확인할 점 + 고정 문구): **"정답은 들어 있지 않습니다. 직접 판정하고, 받은 답이나 내 예상을 적어 비교하세요."** 와 "그만하기" 버튼(`task`만 비우고 입력은 남긴다).
- `task`는 JudgePage **지역 상태**다. `Draft`·공유 링크·사례 JSON·localStorage에 넣지 않는다(계약 변경 없음). 화면을 옮기면 안내만 사라지고 입력은 남는다 — 의도한 동작이다.
- 다른 예시·"처음 구성"·공유 링크·사례 열기로 바뀌면 `load()`가 `task`도 비운다(`load` 안에 한 줄).

### 3) 사례 복제 (`web/src/pages/CaseDetailPage.tsx`)
- `row-actions`의 "판정기에서 열기" 옆에 **"복제해 다시 풀기"** 버튼 하나. 기존 버튼의 동작은 바꾸지 않는다.
- 복제 초안 = `fromCase({ ...item, id: String(item.id), source: "" })`에서 `claim`을 `EMPTY_CLAIM`(draft.ts의 기존 export)으로 바꾼 것. **`fromCase`·`draft.ts`는 고치지 않고 호출부에서 비운다.**
- **받은 답 보존 여부**: 복제는 `claim`(받은 답·내 예상·출처 메모)을 **비운다**. 다시 푸는 것이 목적이고, 남의 답이 남아 있으면 비교가 아니라 베끼기가 된다. 원래 답까지 그대로 보려면 **기존 "판정기에서 열기"** 를 쓴다. 옵션 UI 없이 버튼 두 개로 가른다.
- **복사하지 않는 것**: 원 사례 id·작성자(`author`·`owner_id`)·`actual`·`confirmed`/`confirmed_by`/`confirmed_at`·`verdict`·`comparison`·`engine_version`·`created_at`. `fromCase`가 `network`·`flow`·`claim`만 읽으므로 현재도 새지 않는다 — **회귀 테스트로 고정**한다.
- `cases/*.json`의 `expect`·`hand_first`(정답·손계산)는 `/api/examples`가 6개 키만 돌려주므로(cases.py:89) 애초에 화면에 오지 않는다. 이 사실도 테스트로 고정한다.

### 4) 저장 기본값 · 실제 검증 상태 초기화
- 저장은 **기존 `api.createCase(title, toNetwork(draft), flow, claim)` 만** 쓴다. 새 엔드포인트·새 요청 필드·원본 사례 링크 컬럼을 만들지 않는다.
- 서버가 `verdict`를 다시 계산해 저장하고(cases.py:169-177) `actual`·`confirmed`는 빈 상태로, 작성자는 요청자로 시작한다 → **실제 검증 상태 초기화는 기존 동작으로 보장**된다. 화면이 보낸 판정·확인 값은 서버가 무시한다.
- **재판정 강제**: `load()`가 `verdict`·`judgedNetwork`·`judged`를 지우므로 저장 패널이 사라지고, 사람이 "판정하기"를 눌러야 저장이 열린다. 기대값·실제 결과를 자동 생성하지 않는다.
- 저장 제목은 **기본값**일 뿐 사람이 고칠 수 있다. 전달은 `App`의 `onOpenInJudge(draft, saveTitle?)` 두 번째 인자 → `titleHint` prop → JudgePage가 **값이 바뀔 때만** `setTitle`(매 렌더 적용은 사람이 고친 제목을 덮어쓴다). 빈 문자열은 무시한다.

### 5) 네트워크/flow 가져오기 계약 · 기존 공유 호환 · 오래된 응답 가드
- 가져오기는 `fromCase(item) → Draft`, 내보내기는 `toNetwork(draft)` 한 쌍만 쓴다. 과제·복제 전용 변환을 새로 만들지 않는다. ACL은 `fromCase`가 이미 `{이름: [줄]}` → textarea 문자열로 바꾼다.
- `share.ts`(버전 접두사 `1.`), `encodeShare` payload(`{network, flow, claim}`), `caseJson`, `fromCase` 시그니처를 **바꾸지 않는다**. 과제 안내·제목 힌트는 공유 링크에 넣지 않는다. 기존 공유 링크·기존 사례 JSON은 그대로 열린다 — `share.test.ts`·`draft.test.ts` 기존 테스트가 회귀를 막는다.
- 오래된 응답: 과제 적재·복제는 **반드시 `load()`를 거친다**(`revision.current`가 올라가 진행 중인 `judge` 응답을 무시, JudgePage.tsx:43-50·88-108). `setDraft`를 직접 부르지 않는다.
- `api.examples()` useEffect에 **언마운트 가드**(`let active = true` + cleanup)를 넣는다(현재 없음). 과제 목록이 이 응답에 의존하므로 늦은 응답이 떠난 화면의 목록을 되살리지 않게 한다. 이것은 순수 helper 테스트가 아니라 리뷰·브라우저로 확인하는 범위다(PR #13 F5와 같은 구분).
- 허용 파일: `web/src/{practice.ts,practice.test.ts}`(신규), `web/src/pages/{JudgePage.tsx,CaseDetailPage.tsx}`, `web/src/App.tsx`, `web/src/draft.test.ts`, `web/src/styles.css`, `server/tests/test_cases.py`, `docs/practice.md`(신규), `HANDOFF.md`, `decisions/ai-work-log.md`.
- 제외: `engine/` 전부(판정 변경 없음), `web/src/{draft.ts,share.ts,api.ts,types.ts,router.ts}` 수정(새 라우트·탭 없음), `server/netproof_api/` 수정(새 엔드포인트·필드·DB 스키마·원본 링크 컬럼 없음), 자동 정답·자동 채점·점수·정답 공개, `cases/*.json` 수정(`expect`·`hand_first` 포함), 새 의존성, 실제 장비·패킷, Cisco 설정 붙여넣기(수업 장비 확인 전 보류), 정책 검증 화면 수정, 배포·병합.
- 위험:
  - 안내 문구에 답을 쓰면 과제의 의미가 사라진다 → 금칙어 테스트로 막는다.
  - `fromCase`는 `CaseDetail`의 남는 키를 "무시"할 뿐 지우지 않는다. `CaseDetail`에 키가 늘면 초안으로 샐 수 있다 → 회귀 테스트로 고정.
  - 복제 저장은 제목만 닮은 **별개 사례**다. 원본의 확인 상태·통계를 물려받는다고 오해하면 ⑤ 통계가 왜곡된다 → 안내 문구에 명시.
  - 예시 API가 비면(`cases/` 누락·배포 설정) 과제 목록이 빈다. 하드코딩 fallback을 넣지 않는다 — 과제가 안 보이는 쪽이 낫다.
  - 과제 안내를 `Draft`에 넣으면 공유·사례 JSON 계약이 바뀐다. 넣지 않는다.
- 완료 조건: 아래 네 명령을 **직접 실행**하고 출력을 붙인다.
  - `cd engine && ../.venv/Scripts/python -m pytest -q` (변경 없음 확인용 회귀)
  - `cd server && ../.venv/Scripts/python -m pytest -q`
  - `npm --prefix web test`
  - `npm --prefix web run build`
  - 웹 테스트: `practiceTasks`가 ① 없는 `case_id`를 버림 ② `PRACTICE` 순서 유지 ③ 빈 예시 배열에 빈 결과. `question`·`checkpoints` 금칙어(`PASS`·`DENY`·`rule_seq`) 없음. `cloneTitle` 접두사·80자 절단. 복제 초안에 `actual`·`confirmed`·`confirmed_by`·`author`·`owner_id`·`verdict`·`engine_version`·`expect`·`hand_first` 키 없음, `claim`이 비어 있음. 기존 "판정기에서 열기" 경로는 `claim` 유지.
  - 서버 테스트: 복제 payload를 `POST /api/cases`로 보내면 201, `actual.result`가 `null`, `confirmed`가 false, 작성자가 요청자, **화면이 보낸 `verdict`/`actual`/`confirmed` 값은 무시되고 서버 재계산값이 저장**된다.
  - 브라우저(**375×812 기준**): 과제 시작 → 안내·질문·확인할 점 보임 → "판정하기"를 눌러야 저장 패널 열림 → 저장 제목 기본값 확인. 사례 상세에서 "복제해 다시 풀기" → 받은 답이 비어 있고 판정이 다시 필요함 확인. 본문 가로 넘침 없음(body scrollWidth ≤ viewport), console error 0. 임시 DB·합성 구성만 쓰고 사례 기대값은 건드리지 않는다.
  - `docs/practice.md`: 과제를 추가하는 방법(예시 사례 id에 과제 메타만 붙인다)과 "정답을 쓰지 않는다" 규칙 한 문단.

## 완료 내용 / 테스트 결과
- 기존 예시 API와 fromCase/load를 재사용한 실습 3개, 질문·확인 항목·그만하기, 받은 답을 비운 복제 버튼과 제목 기본값 구현. 다른 입력 적재 시 과제·제목·저장 오류 초기화. 사례 화면 id별 key와 요청 cleanup으로 늦은 원본 응답 차단.
- 신규 회귀: 과제 연결·금칙어·유니코드 80자 제목, 복제 메타 누출·원본 불변, 공개 예시 정답 미포함, 다른 사용자 복제의 서버 재계산·작성자·실제 결과·확인 초기화.
- 실제 실행: engine pytest **190 passed, 2 xfailed in 3.44s**; server pytest **76 passed, 1 skipped in 12.23s**; web test **8 files, 85 passed, 747ms**; web build **tsc 성공, 37 modules, built in 453ms**. 최초 서버 회귀는 잘못 쓴 테스트 닉네임(한자)으로 실패했고 허용된 한글 닉네임으로 고친 뒤 전체 재실행 통과.
- 임시 DB 브라우저: 375×812에서 과제 안내·재판정 전 저장 없음·기본 제목·직접 편집한 제목 유지·그만하기 입력 유지 확인. 원본 #26에서 복제 #27 새 저장, 받은 답 비움·실제 결과 빈 상태 확인. 기존 열기는 받은 답 유지. body 360 ≤ 375, 오류 로그 0. 데스크톱 body 1265 ≤ 1280. 화면은 실습 안내로 열어 두었다.
- 공유·JSON 계약 기존 테스트 통과. 전체 DOM 자동 테스트·인위적 네트워크 지연 주입은 미검증.

## 현재 과제 리뷰 기록
- Claude (Claude Opus 5) 독립 리뷰 대기.

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
- **PR #14 정책 검증 + 도달성 매트릭스 (병합 완료, c0ab37e)**: 엔진 `policy_matrix`, `POST /api/policy-matrix`, `#/matrix` 화면. Claude 독립 리뷰 PASS(6404ef3) → 비차단 N1(a)/N2 보완 → 보완 확인 PASS(566e6fe) → 사용자 병합.
  - 유지되는 합의: 상한 초과는 잘라 계산하지 않고 거절한다. 같은 장비 쌍·자기 자신 쌍은 매트릭스에서 제외할 입력이며 엔진 버그 수정 대상이 아니다. 대상 밖 의도는 자동 폐기하지 않고 사람이 지운다. `policy`(NO_POLICY/AGREE/EXPOSED/BLOCKED/UNDECIDED)와 기존 `comparison`은 다른 축이다(`docs/semantics.md`).
  - 미검증으로 남긴 것: 긴 ACL·다수 라우터의 최악 성능, 전체 DOM 마운트 자동 테스트.
- **PR #13 사례 목록 검색·필터·페이지 (병합 완료)**: F1~F6 보완 후 재리뷰 PASS. 비ASCII 검색은 DB 의존이고, `mine=1`·무인자 호환은 유지된다. 남은 비차단 1건은 아래 주의사항 참고.
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
- [ ] 사례 복제·실습 과제 템플릿 — ① **구현·검증 완료, Claude 독립 리뷰 대기 — 브랜치 codex/case-templates**
- [ ] Cisco 설정 붙여넣기 ①`interface`/`ip address` ②`ip route` — ① **보류: 수업 ACL이 Cisco인지 확인(사람 트랙) 뒤 착수**

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
- [ ] 로그인 실패 → Graylog(GELF, 로컬 시연용) — 운영
- [ ] Batfish 차등 테스트 — ④

**6주차 (11-02~11-08)**: 버그 수정만, 2차 테스트, 발표·제출

**사람 트랙 (동시에, LLM에 넘기지 않음)**
- [ ] 동기 3명 인터뷰 · [ ] 실제 결과가 있는 사례 모으기(오탐·미탐 대시보드의 재료) · [ ] 사례 04 손계산
- [ ] **수업 ACL이 Cisco인지 pfSense인지 확인(Cisco 과제의 선행 조건)** · [ ] 오탐·미탐 양성 정의 · [ ] 표어 결정
- [ ] 배포(Vercel·Supabase 가입, 비밀값) · [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

**위험**: 4주차 전에 ①~⑤의 핵심(하이라이트·목록 필터·정책 검증·오탐/미탐·실제 결과 붙여넣기)이 끝나지 않으면 사용자 테스트가 흔들린다. 밀리면 4·5주차 항목부터 미룬다.

## 다음 LLM이 확인할 내용
- `git pull`, `git status`, `git log -3` 후 본 작업 정의와 PR diff, 테스트 출력 확인.
- Codex: 구현 전에 `web/src/draft.ts`(`fromCase`·`toNetwork`·`EMPTY_CLAIM`), `web/src/pages/JudgePage.tsx`(`load`·`revision`·`api.examples`·저장 패널), `web/src/pages/CaseDetailPage.tsx`(`onOpenInJudge`), `server/netproof_api/cases.py`(`/api/examples`가 돌려주는 6개 키, `create_case`의 서버 재계산)를 읽어 **새 변환·새 엔드포인트를 만들지 않고 호출만 하는지** 확인한다.
- 구현 완료 후 Claude 독립 리뷰, 사용자 병합 결정.

## 주의사항 / 미해결 이슈
- 관계없는 줄바꿈 변경 금지.
- **앱은 기대값·정답·채점을 만들지 않는다.** 과제는 네트워크·질문·확인할 점까지만 주고, 판정은 사람이 "판정하기"로 다시 받고 기대값은 사람이 적는다(AGENTS.md).
- 복제는 **network/flow 편집 초안**이다. 원 사례의 `actual`·`confirmed`·작성자·`expect`를 가져오지 않고, 저장하면 서버가 판정을 다시 계산한 **별개 사례**가 된다.
- 공유 링크 형식(`1.` + `{network, flow, claim}`)과 사례 JSON 형식은 이번 과제에서 바꾸지 않는다. 과제 안내는 `Draft`에 넣지 않는다.
- 이전 PR #12의 별도 버그(strict xfail 두 건), Hypothesis 하한 문제는 별도 후속 범위.
- CasesPage 후속 1건(빈 검색창에 공백만 입력하면 매 타자마다 재조회)은 다음에 CasesPage를 만질 때 함께 처리한다. 이번 과제 범위가 아니다.
- 매트릭스는 `verify`를 호출만 한다. 판정·비교를 서버나 화면에서 다시 계산하면 ADR-001 위반이다(PR #14 이후 유지되는 규칙).

설계: Claude (Claude Opus 5)

Codex (GPT-6)
