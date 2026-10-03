# 사례 게시판 학습형 UI 1차 — 설계 계약 (확인 대기)

**결론.** 이 작업에는 새 라우트도, API·DB·엔진 변경도 필요 없습니다. 첫 화면 안내는 기존 판정기의 `page-head`에 넣으면 충분합니다. 여기에 표시용 순수 모듈 1개, 읽기 전용 구성 표시 컴포넌트 1개, 페이지 3개 수정, 참고 출처 문서 1개를 더하면 됩니다. 사용자가 이 설계를 확인하기 전에는 구현하지 않습니다.

근거는 이 worktree(c19f554)에서 직접 읽은 파일입니다. 이번에는 테스트를 실행하지 않았습니다(Read/Grep/Glob만 사용). PR19 브랜치 diff도 제 도구로는 열 수 없어서 읽지 못했습니다.

---

## 1. 목표와 승인 범위

- **목표:** 기존 기능은 그대로 두고 배치·여백·정보 위계만 다듬어, 세 동선을 학습 사이트처럼 읽히게 합니다.
  - 판정기 첫 화면 안내
  - 사례 게시판 목록
  - 사례 상세
- **사용자 승인(“진행해”)으로 하는 것:**
  1. 시작 안내
  2. 정돈된 목록
  3. 상세 화면의 세 영역 분리: 구성 / 받은 답·계산 / 실제 결과
- **하지 않는 것:**
  - 정답·난이도·점수·랭킹·진도·태그·회원 기능
  - DB·API·엔진·`expect`·`cases/` 변경
  - LLM 호출, 자동 적용, 배포, 병합
  - 판정 표현의 의미 변경(ResultPanel·Badges)
  - 라우트 재설계
  - 실제 데이터가 아닌 카드·통계
- **출처 세 가지는 섞지 않습니다.**

| 구분 | 데이터 | 화면에 보이는 곳 |
|---|---|---|
| 받은 답 출처 | `claim.source` | 상세의 “받은 답” 영역 |
| 실제 결과 출처 | `actual.source` + `actual.note` | 상세의 “실제 결과” 영역 |
| 화면 디자인 참고 출처 | solved.ac · comcbt.com · cve-news.vercel.app | `docs/case-learning-ui.md`에만. 앱 화면에는 표시하지 않음 |

## 2. 파일 범위

**허용 (이 목록 밖은 건드리지 않음)**

| 파일 | 변경 |
|---|---|
| `web/src/caseView.ts` | 신규. 표시용 순수 함수 5개(6절) |
| `web/src/caseView.test.ts` | 신규 |
| `web/src/components/CaseNetwork.tsx` | 신규. 읽기 전용 구성 표시, 상태 없음 |
| `web/src/pages/JudgePage.tsx` | 179–191행 `page-head` 블록만 |
| `web/src/pages/CasesPage.tsx` | 표 머리·셀 내용, 적용 조건 문구(94–100행 교체) |
| `web/src/pages/CaseDetailPage.tsx` | 배치, 받은 답 영역, CaseNetwork 삽입, 비소유자 `dt` 문구 1개, 오류 시 목록 링크 |
| `web/src/styles.css` | 파일 끝에 `/* 사례 학습형 UI */` 블록 추가. 기존 297–301행 `.board` 640px 규칙만 교체 |
| `docs/case-learning-ui.md` | 신규. 참고 근거 문서 |
| `HANDOFF.md`, `decisions/ai-work-log.md` | 기록 |

**금지 (변경 시 차단)**
- `engine/**`, `server/**`, `cases/**`, `docs/semantics.md`
- `types.ts`, `api.ts`, `router.ts`, `App.tsx`
- `caseSearch.ts`, `practice.ts`, `draft.ts`, `share.ts`, `observe.ts`, `confusion.ts`, `policyMatrix.ts`, `aclAudit.ts`
- `ResultPanel.tsx`, `Badges.tsx`, `AclEvidence.tsx`, `AclAudit.tsx`, `FlowForm.tsx`, `NetworkEditor.tsx`
- Dashboard·Matrix·Settings·Login 페이지, `theme.ts`
- 기존 테스트 파일 수정, `package.json`·lock, 새 의존성

## 3. 화면별 계약

### 3-1. 판정기 시작 안내 (`#/`)

**평가:** 기존 판정기에 안내를 더하는 것으로 해결됩니다. 이유는 다음과 같습니다.
- `#/`가 이미 판정기입니다.
- 예시 불러오기(`api.examples`)와 “처음 구성” 단추가 이미 있습니다.
- 안내는 정적 문구라 새 상태·요청·라우트가 필요 없습니다. App/router 변경이 0이므로 `#/s/` 공유와 로그인 복귀가 그대로 유지됩니다.

**배치 (`page-head` 안, 위에서 아래로)**
1. 기존 소개 문장은 문구를 그대로 둡니다.
2. 영역 이름 “시작 안내”인 번호 목록 3개:
   1. “예시를 불러오거나 처음 구성에서 장비·ACL을 적습니다.”
   2. “확인할 통신과 받은 답(AI 답이나 내 예상)을 적습니다.”
   3. “판정하기를 누르면 경로와 막힌 규칙을 근거로 보여 줍니다.”
3. 기존 예시 단추 줄 앞에 보이는 글자 “예시 불러오기”를 붙입니다. 예시가 0개면 이 글자는 숨깁니다. “처음 구성” 단추는 문구와 동작을 그대로 둡니다.
4. 실습 과제 `details`는 그대로 둡니다.

**그대로 두는 것**
- `load`·`judge`·`revision`·`showAcl`·`save`·공유
- 모바일 하단 고정 판정 단추
- 단계 상자 안에 숫자나 통계를 넣지 않음

**치수**
- 901px 이상: 3열 그리드, 간격 12px. 각 상자는 `--surface` 배경, `--line` 테두리, 모서리 8px, 안쪽 여백 10px×12px, 13px 글자.
- 900px 이하: 1열, 간격 4px, 상자 테두리 없음.

### 3-2. 사례 게시판 (`#/cases`, `#/cases?…`)

**API 사실:** `CaseSummary`에는 id·title·author·result·comparison·claim_kind·actual_result·confirmed·created_at만 있습니다. flow·claim.expected·actual_source는 목록에 표시하지 않습니다. 추가 요청으로 가져오지도 않습니다.

**표 (table 구조 유지)**

| 열 머리 (`data-label`과 같은 문구) | 내용 |
|---|---|
| 사례 | 제목 링크 + 메타 “#{id} · {작성자} · {날짜}” |
| NetProof 계산 | 기존 `ResultBadge` |
| 받은 답 비교 | 작은 글자 `comparisonCaption` + 기존 `ComparisonBadge` |
| 실제 결과·확인 | 기존 `ActualBadge` |

**그대로 두는 것**
- 검색 폼, 필터 7개, “내 사례만”, 초기화, 페이지당 20개
- 이전/다음, `loadCasePage` 취소 규칙
- “다시 시도”, “아래는 이전 조회 결과입니다.”
- 빈 목록 문구, 주소 → 필터 단방향 동기화

**바꾸는 것**
- 적용 조건 줄을 `appliedFilterText`가 0개를 넘을 때만 “적용한 조건: a · b · c”로 보입니다. 지금은 일부 필터에서만 나오고 comparison·source·mine이 빠지는데, 이를 바로잡습니다.
- “적용한 검색어” 줄은 그대로 둡니다.

**치수**
- 데스크톱: 2~4열은 `width:1%`·`nowrap`, 행에 마우스를 올리면 `--gray-bg`.
- 640px 이하 카드형:
  - 행은 2열 그리드입니다. 1행은 사례(2칸), 2행은 계산과 받은 답 비교, 3행은 실제 결과·확인(2칸)입니다.
  - 각 셀 위에 `data-label`을 12px 회색 글자로 붙입니다.
  - 표 안 배지는 `white-space: normal`입니다.

### 3-3. 사례 상세 (`#/cases/{id}`)

**순서 (위에서 아래로)**

A. **머리 패널 (기존 그대로)**
- 목록 링크, 제목, 메타(작성자·시간·엔진 버전)
- 판정기에서 열기, 복제해 다시 풀기, 삭제, 복제 안내

B. **“네트워크 구성” 패널** (신규 `CaseNetwork`, 전체 폭)
- 안내: “저장된 입력을 그대로 보여 줍니다. 계산 결과는 아래 판정 칸에 있습니다.”
- “확인할 통신”: `flowText(item.flow)`를 고정폭 글꼴로.
- 장비 카드 그리드 `repeat(auto-fill, minmax(min(100%, 260px), 1fr))`, 간격 12px. 카드마다:
  - 장비 id(h3)와 종류(plain 배지)
  - 인터페이스 목록: “이름 · IP · 들어올 때 ACL x / 나갈 때 ACL y”(값이 있을 때만)
  - 게이트웨이(있을 때만)
  - 정적 경로 “prefix → via”
- ACL마다 닫힌 `details` 하나:
  - 요약: “ACL {이름} · {n}줄 · 붙은 곳: {목록}” 또는 “붙은 곳 없음”
  - 본문: 줄 번호와 원문(`pre-wrap`)
  - ACL이 없으면 “ACL 없음”.
- 규칙 해석, 경로 계산, 판정 추론은 하지 않습니다(ADR-001).

C. **`detail-grid` 2열 (기존 클래스)**
- 왼쪽 묶음: “받은 답” 패널(신규, CaseDetailPage 안) → 기존 `ResultPanel`(props 그대로).
  - claim이 없거나 expected가 null이면 “이 사례에는 받은 답이 없습니다.”
  - 있으면 `facts`로 표시합니다:
    - 종류: `claimKindText`
    - 답: “된다(PASS)” / “안 된다(DENY)”
    - **받은 답 출처**: `claim.source`, 없으면 “적지 않음”
    - 내용: `claim.text`(`pre-wrap`), 없으면 “적지 않음”
  - 고정 안내: “받은 답 출처는 답을 준 곳(AI 도구·사람)입니다. 실제 결과 출처와 다릅니다.”
- 오른쪽: 기존 “실제 결과” 패널.
  - 소유자 입력, 출력 붙여넣기(관측), 검토자 확인·거두기·JSON은 모두 그대로 둡니다.
  - 비소유자 표시의 `dt` “확인 방법”만 “확인 방법(실제 결과 출처)”로 바꿉니다.

**치수:** 900px 이하에서는 1열입니다(기존 미디어쿼리). 순서는 머리 → 구성 → 받은 답 → 판정 → 실제 결과입니다.

**오류 상태:** 기존 오류 문단 아래에 “사례 게시판으로” 링크를 더합니다. 로딩 문구는 그대로 둡니다.

**변하지 않는 것**
- 상태 변수 0개 추가
- `run`·`parseRevision`·`onOpenInJudge`·`cloneTitle` 그대로
- 요청은 `GET /api/cases/{id}` 1회 그대로

## 4. 데스크톱 1280 / 모바일 375×812

- 본문 가로 넘침 없음(`body.scrollWidth ≤ viewport`).
  - 긴 IP·ACL 원문·제목은 `overflow-wrap:anywhere`로 줄바꿈합니다.
  - ACL 원문은 고정폭 글꼴이고 줄바꿈을 허용합니다.
- 1280에서 예상 배치:
  - 판정기 안내는 3열 한 줄입니다.
  - 목록은 4열 표입니다.
  - 상세는 구성 전체 폭 뒤에 2열입니다.
- 375에서:
  - 판정 단추는 하단 고정이 유지되고, 안내가 그 뒤에 가려지지 않습니다(기존 `padding-bottom: 88px` 유지).
  - 터치 대상은 44px 이상입니다(기존 `pointer: coarse` 규칙). 새 `summary`에도 `padding: 12px 0`을 줍니다.

## 5. 접근성 · 테마 · 상태

- **의미 구조**
  - 패널 제목은 h2, 장비는 h3입니다.
  - 목록 표 머리는 `th scope="col"`을 유지합니다.
  - `details`/`summary`는 키보드로 Enter·Space로 엽니다.
  - 포커스 테두리는 기존 `:focus-visible` 규칙을 씁니다.
- **색과 테마**
  - 새 색은 만들지 않고 기존 `light-dark` 변수만 씁니다. 그래서 라이트·다크가 자동으로 맞습니다.
  - 배지 색·문구는 그대로이고, 상태는 색만이 아니라 글자로도 전달합니다.
- **상태별 처리**
  - 오류·로딩·빈 목록·이전 조회 결과는 기존 문구와 `aria-live`를 그대로 씁니다.
  - 상세 오류에는 목록 링크만 더합니다.
  - 판정기의 이전 결과(stale) 표시는 그대로 둡니다.

## 6. 표시용 순수 함수 `caseView.ts`와 테스트 계약

새 의존성 없이 vitest만 씁니다. 판정·규칙 평가는 하지 않습니다.

| 함수 | 계약 |
|---|---|
| `claimKindText(kind)` | ai → “AI 답”, self → “사람 예상”, null·undefined → “받은 답” |
| `comparisonCaption({comparison, claim_kind})` | NO_CLAIM → “받은 답 없음”. 그 밖은 “{claimKindText}과 계산” |
| `flowText(flow)` | 형식 “{src} → {dst} · {프로토콜} · {모드}”. 프로토콜: tcp/udp는 “TCP 443”(포트가 없으면 “TCP”), icmp는 “ICMP”(+ “ ” + icmp 값이 있을 때). 모드: session·없음 → “왕복”, one-way → “한 방향” |
| `networkView(network)` | 아래 별도 설명 |
| `appliedFilterText(filters)` | q를 뺀 조건만, 순서는 mine·result·comparison·confirmed·source·actual·claim_kind·claim_expected. 문구는 현재 select 옵션 글자에 접두어를 붙인 것(예: “판정 차단”, “받은 답과 판정 불일치”, “실제 결과 출처 출처 없음”, “받은 답 종류 AI 답”, “내 사례만”). 빈 필터면 `[]` |

`networkView(network)` 계약:
- 반환: `{devices, acls}`.
- devices
  - 입력 순서를 유지합니다. 종류는 “호스트”/“라우터”입니다.
  - 게이트웨이는 trim한 값이고, 비면 null입니다.
  - 인터페이스는 `{name, ip, aclIn, aclOut}`이고 빈 값은 null입니다.
  - 경로 `via`: next_hop과 out_if가 둘 다 있으면 “next_hop (out_if)”, 하나만 있으면 그 값, 둘 다 없으면 “—”.
- acls
  - `Object.keys` 순서입니다. 줄 번호는 index+1이며 빈 줄도 셉니다(`AclEvidence`와 같은 기준).
  - `attachedTo`는 장비·인터페이스 순서대로 “R1 g0/0 들어올 때”/“나갈 때” 형식입니다.
- 방어 처리
  - `acls`·`routes`가 undefined면 빈 값으로 처리합니다.
  - 없는 ACL을 가리키는 인터페이스는 장비 카드에만 보이고 acls 목록에는 넣지 않습니다.

**`caseView.test.ts` 필수 사례**
1. `claimKindText`: 세 값과 undefined
2. `comparisonCaption`: 네 comparison × 세 kind 중 대표 5개. NO_CLAIM은 kind와 상관없이 “받은 답 없음”
3. `flowText`: tcp 포트, udp, icmp+echo, icmp만, one-way, 포트 누락
4. `networkView`:
   - blankDraft 모양
   - routes·acls 누락
   - 같은 ACL이 두 인터페이스 in/out에 붙은 경우
   - 없는 ACL 참조
   - 빈 줄 포함 번호
   - 입력 객체가 바뀌지 않음(동결 객체로 확인)
5. `appliedFilterText`: 빈 필터는 `[]`, 모든 필터는 순서와 문구, `q`만 있으면 `[]`

## 7. 회귀 원칙

- **네트워크 요청 수가 변경 전과 같아야 합니다.** 브라우저 Network 탭으로 확인합니다.
  - 판정기 진입: `/api/examples` 1회
  - 목록 진입: 기존 2회 그대로. 알려진 후속 과제이므로 고치지도, 늘리지도 않습니다.
  - 상세: `/api/cases/{id}` 1회
  - N+1·새 엔드포인트 0
- **새 상태 없음:** `useState`·`useEffect`·`useRef`를 JudgePage·CasesPage·CaseDetailPage에 하나도 더하지 않습니다. CaseNetwork는 props만 받습니다.
- **금지 파일 diff는 비어 있어야 합니다:** `git diff main... -- engine server cases web/src/components/ResultPanel.tsx web/src/components/Badges.tsx web/src/types.ts web/src/api.ts web/src/router.ts web/src/App.tsx`
- **유지할 라우트:** `#/`, `#/s/…`, `#/cases`, `#/cases?…`(대시보드 칸 링크 포함), `#/cases/{id}`, 로그인 후 복귀, 대시보드 탭.

## 8. 완료 명령 (Codex가 직접 실행해 출력 첨부)

| 명령 | 기대 |
|---|---|
| `cd engine && ../.venv/Scripts/python -m pytest -q` | 구현 전 main 기준 수치와 동일, 실패 0 |
| `cd server && ../.venv/Scripts/python -m pytest -q` | 동일, 실패 0 |
| `npm --prefix web test` | 기존 수 + `caseView` 신규 수, 실패 0 |
| `npm --prefix web run build` | `tsc` 오류 0, 빌드 성공 |

engine·server 기준 수치는 구현 전에 main에서 한 번 실행해 HANDOFF에 적습니다.

## 9. 임시 DB 브라우저 체크리스트

**준비**
- `DATABASE_URL=sqlite:///%TEMP%\netproof-case-ui-<무작위>\qa.db`로 서버를 띄웁니다. 기존 `instance/netproof.db`는 쓰지 않습니다.
- 순서: `flask --app server/wsgi.py init-db` → `npm --prefix web run build` → `flask … run --port 5183`.
- UI로 가입합니다: 작성자 A, 검토자 B. B는 같은 `DATABASE_URL`로 `make-reviewer B`를 실행합니다.
- **사례는 UI로만 만듭니다(코드에 넣는 가짜 데이터 금지).**
  - QA-1: 예시01 + AI 답 DENY + 출처 “QA 도구”
  - QA-2: 예시02, 받은 답 없음
  - QA-3: 예시03 + 사람 예상 PASS → 실제 결과 PASS·ping 저장 → B가 확인

**확인 항목** (각 항목을 1280×900과 375×812에서, 라이트와 다크 둘 다)
1. 판정기
   - 시작 안내 3단계와 “예시 불러오기” 글자가 보임
   - 예시 불러오기, 처음 구성, 판정이 동작
   - 하단 고정 단추가 안내를 가리지 않음
   - 링크 복사 → 새 탭 `#/s/…`에서 입력 복원
2. 목록
   - 4열(모바일은 카드), “#id · 작성자 · 날짜”
   - 받은 답 비교 문구: QA-1 “AI 답과 계산”, QA-2 “받은 답 없음”
   - 필터 하나마다 “적용한 조건” 문구
   - 검색, 초기화, `#/cases?comparison=DISAGREE` 직접 진입
   - 결과 0건 문구, “1 / 1 페이지”와 단추 비활성
   - 서버를 멈추고 페이지 이동 → 오류와 “다시 시도”, “이전 조회 결과” 문구 → 서버를 다시 띄우고 재시도
3. 상세
   - 구성 카드·ACL 줄 번호가 “판정기에서 열기” 결과와 같음
   - ACL `details`를 키보드로 엶
   - 받은 답 출처 “QA 도구”와 실제 결과 출처 “ping·접속 결과”가 서로 다른 영역에 있음
   - 출력 붙여넣기 → 후보 → 입력칸 적용 → 저장
   - B로 확인·확인 거두기·JSON 만들기
   - 복제 → 제목 “복제 · …”, 받은 답 비어 있음
   - 삭제 확인창에서 취소
   - 없는 id `#/cases/9999` → 오류와 목록 링크
4. 로그인 복귀
   - 로그아웃 상태에서 `#/cases/1` → 로그인 필요 → 로그인 → `#/cases/1`로 복귀
   - 대시보드 탭은 B에게만 보임
5. 공통
   - `body.scrollWidth ≤ 화면 폭`
   - console error 0
   - Network 요청 수(7절)
   - Tab 순서와 포커스 테두리
6. 정리: 임시 DB 폴더 삭제, 탭 닫기, viewport 복원

## 10. PR19(`codex/acl-suggest`)와의 충돌 대응

PR19 diff는 직접 확인하지 못했습니다.
- **구현 시작 전:** Codex가 `git diff --stat main...origin/codex/acl-suggest`로 겹치는 파일을 HANDOFF에 적습니다.
- **예상 충돌 지점:** `JudgePage.tsx`, `styles.css`, `HANDOFF.md`, `ai-work-log.md`. 이 작업은 `types.ts`·`api.ts`·`AclAudit`를 건드리지 않습니다.
- **충돌 최소화**
  - JudgePage는 `page-head` 블록만 고칩니다(판정·점검 영역과 떨어져 있음).
  - CSS는 파일 끝 별도 블록에 넣고, 기존 `.board` 640px 규칙만 교체합니다.
- **병합 순서가 정해지면:** 뒤에 병합되는 쪽이 `git merge origin/main`을 합니다(리베이스·`--force` 금지).
  - HANDOFF는 두 과제 기록을 모두 남기도록 손으로 정리합니다.
  - 그 뒤 8절의 네 명령과 9절의 판정기 항목을 다시 실행합니다.

## 11. `docs/case-learning-ui.md` (신규) 내용

- **참고 표** (사이트 / 확인일 2026-10-03 / 확인 방법 / 가져온 패턴(추상) / 가져오지 않은 것)

| 사이트 | 확인 방법 | 가져온 패턴 | 가져오지 않은 것 |
|---|---|---|---|
| solved.ac | 공식 소개 | 정돈된 문제 목록·탐색 | 난이도·태그·CLASS |
| comcbt.com | 공식 소개 | 해설과 문제의 분리 | 자동채점·성적·오답노트 |
| cve-news.vercel.app | 사용자 첨부 8화면. 라이브 동작은 미확인 | 설명 단계·접히는 카드·출처 영역 | — |
| acmicpc.net | 준비 중 안내 화면이라 목록 UI를 조회하지 못함 | — | — |
| goldmagnetsoft board | 제목/내용 검색만 확인, 본문은 미확인 | — | — |

- **원칙:** 원문 문구·문제·브랜드·색상을 복사하지 않습니다.
- **고정 문장:** “이 사이트들은 화면 배치 아이디어의 출처일 뿐이며, NetProof의 판정이나 실제 결과를 검증하지 않는다.”
- **세 출처 구분 표:** 받은 답 / 실제 결과 / 디자인 참고(1절 표와 같은 내용)

## 12. 승인 단계

| 단계 | 하는 사람 | 다음으로 넘어가는 조건 |
|---|---|---|
| G0 설계 확인 | 사용자 | 이 문서 승인. 그 전에 구현 없음. 승인 후 Codex가 이 계약을 branch HANDOFF에 옮김 |
| G1 구현 | Codex | 8절 네 명령 출력과 3화면 × 2폭 × 2테마 캡처 |
| G2 화면 확인 | 사용자 | 캡처·임시 DB 화면 승인. 계약에 없는 문구·배치 변경은 이 단계에서만 결정 |
| G3 리뷰 | Claude | `git diff main...`과 직접 실행 결과로 PASS/요청 |
| G4 병합 | 사용자 | 직접 결정 |

**사용자 결정 1건(G0 전):** 상세의 “받은 답” 패널에서 `self`를 “사람 예상”으로 쓸지 정해 주세요. 목록 필터와 같은 문구인데, 판정 칸(ResultPanel, 수정 금지)은 “내 예상”이라 상세 한 화면에 두 표현이 함께 보입니다. 제 권장은 “사람 예상”으로 필터와 맞추는 것입니다.

설계: Claude (Claude Opus 5.5)

## 확인 출처 원문 링크 (Codex 조사 기록)

- 확인일: 2026-10-03. 이 기록은 화면 구성 참고 자료이며 개별 사례 증거가 아니다.
- [solved.ac 공식 소개](https://solved.ac/): 문제 탐색·새싹/CLASS·태그/난이도 소개 텍스트 확인. 이번 작업은 화면 탐색·위계 아이디어만 참고하며 해당 기능을 추가하지 않는다.
- [전자문제집 CBT 공식 소개](https://www.comcbt.com/): 해설·모의고사·오답노트·성적관리 소개 확인. 문제·해설 분리 아이디어만 참고한다.
- [강사님 KEV 학습 사이트](https://cve-news.vercel.app/): 사용자 첨부 8화면에서 단계별 설명·접히는 사례 카드·출처 영역을 확인했다. 웹 도구 접근 실패로 라이브 동작은 확인하지 않았다.
- [백준](https://www.acmicpc.net/): 현재 조회에서는 채점 서비스 준비 중 안내만 보여 문제 목록 UI를 직접 확인하지 못했다. 확인하지 않은 현재 화면을 구현 근거로 삼지 않는다.
- [GoldMagnet 게시판](https://app.goldmagnetsoft.com/board): 제목·내용 검색 확인. 게시글 본문은 로딩 상태여서 확인하지 못했다.

이 사이트들은 화면 배치 아이디어의 출처일 뿐이며, NetProof의 판정이나 실제 결과를 검증하지 않는다. 원문 문구·문제·브랜드·색상을 복사하지 않는다.

브라우저 QA에서 만들어 넣는 결과·출처·검토 상태는 임시 DB의 **합성 UI 시험 데이터**이며 실제 장비 실험의 증거가 아니다. 운영 DB에 넣거나 실제 검증 사례로 공개하지 않는다.

Claude 설계 세션: `605fe8ce-e740-4acb-ba1c-4560f2c6d00a`, 모델 `claude-opus-5-5`, Read/Grep/Glob만 허용. Claude는 테스트를 실행하지 않았고 Codex가 별도로 기준 테스트를 실행했다. 실 코드 변경·구현 승인 없음.

설계: Claude (Claude Opus 5.5), 조사·기록: Codex (GPT-6)

