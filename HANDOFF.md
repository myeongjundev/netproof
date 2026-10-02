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
- 작업: **오탐·미탐 대시보드** — AI 답·사람 예상·NetProof 판정을 각각 **확인된 실제 결과**와 2×2로 비교하고, 칸을 누르면 그 사례 목록으로 간다 (로드맵 3주차, 순환 고리 ⑤)
- 사용자 승인(2026-10-02): PR #16을 `309238d`로 main 병합 완료 → 다음 과제로 진행. Claude가 설계, Codex가 구현·테스트한다.
- 기반: 최신 origin/main `309238d`(**PR #16 실제 결과 붙여넣기 병합 완료**). 판정기·정책 검증·매트릭스·사례 게시판·검색·대시보드·실습 과제·복제·관측 파서는 모두 동작한다.
- 브랜치: `codex/confusion-dashboard` (origin/main `309238d` 기반, 코드 변경 없는 깨끗한 상태). 설계는 main이 아니라 이 브랜치에 기록한다.
- 단계: **설계 선행 커밋 7af59c3 → 구현·검증·Claude 독립 리뷰 PASS(e0d26b3) 완료 → 사용자 최종 확인·PR #17 병합 결정 대기.** 최종 기록은 문서만 갱신한다.
- **사용자 확정(2026-10-02): 양성(positive)은 통신 차단, 즉 `DENY`다.** 이 정의가 TP·FP·FN·TN 전부의 방향을 정한다. 바꾸려면 사용자에게 먼저 묻는다.
- 보류: **Cisco 설정 붙여넣기**는 수업 ACL이 Cisco인지 확인(사람 트랙)까지 보류.
- 이 과제는 **읽기 전용**이다. 사례를 만들거나 고치거나 확인 상태를 바꾸지 않고, 판정도 다시 계산하지 않는다.

## 작업 정의
- 목표: 검토자 대시보드에 **혼동 행렬 세 개**(AI 답 / 사람 예상 / NetProof 판정)를 세고, 각 칸(TP·FP·FN·TN)을 누르면 **그 칸에 세어진 사례만** 걸러진 사례 게시판으로 이동한다.
- **이것은 판정이 아니라 집계다.** 이미 저장된 `result`(엔진이 계산한 판정)·`claim.expected`(받은 답)·`actual_result`(작성자가 적고 검토자가 확인한 실제 결과)를 **읽어서 교차표를 세는 것뿐이다.** 판정 로직을 서버·화면에 복제하지 않고(ADR-001), 엔진은 **한 줄도 고치지 않는다**(`__version__`도 그대로).
- **세 축은 서로 다른 예측자다.** 한 사례가 세 축에 동시에 들어갈 수 있고, 축마다 분모가 다르다.

| 축 | `axis` | 예측값 | 비어 있을 때 |
|---|---|---|---|
| AI 답 | `ai` | `claim.kind == "ai"`인 사례의 `claim.expected` | AI 답이 없는 사례는 이 축의 분모에서 빠진다 |
| 사람 예상 | `self` | `claim.kind == "self"`인 사례의 `claim.expected` | 사람 예상이 없는 사례는 이 축의 분모에서 빠진다 |
| NetProof 판정 | `engine` | 저장된 `result` | `UNSUPPORTED`·`INVALID`는 이 축의 분모에서 빠진다 |

### 1) TP·FP·FN·TN의 뜻 (양성 = `DENY`)
- **분모에 들어가는 사례**: `confirmed_at`이 있고(검토자 확인), `actual_result`가 `PASS`/`DENY`이고, **그 축의 예측값이 `PASS`/`DENY`인** 사례. 셋 중 하나라도 아니면 그 축에서 **제외**한다.

| 칸 | 예측 | 실제 | 한국어 이름 | 뜻 |
|---|---|---|---|---|
| `tp` | `DENY` | `DENY` | 맞게 잡은 차단 | 막힌다고 했고 실제로 막혔다 |
| `fp` | `DENY` | `PASS` | **오탐** | 막힌다고 했는데 실제로는 통했다 |
| `fn` | `PASS` | `DENY` | **미탐** | 통한다고 했는데 실제로는 막혔다 |
| `tn` | `PASS` | `PASS` | 맞게 본 통과 | 통한다고 했고 실제로 통했다 |

- **FP와 FN을 뒤집는 것이 이 과제의 1번 버그다.** 양성이 `DENY`이므로 "예측 `DENY` + 실제 `PASS` = 오탐(FP)"이다. 테스트로 방향을 못 박는다.
- 제외 사유는 **한 사례당 하나만** 세고 순서는 `not_confirmed` → `no_actual` → `no_prediction`이다. 따라서 축마다 다음 항등식이 성립한다(테스트로 확인한다).
  `tp + fp + fn + tn + not_confirmed + no_actual + no_prediction == 전체 사례 수`
  - `not_confirmed` — 검토자가 확인하지 않았다. **미확인은 통계에 섞지 않는다.**
  - `no_actual` — 확인은 됐지만 실제 결과가 `PASS`/`DENY`가 아니다(**미정**). 지금 서버는 실제 결과 없는 사례를 확인할 수 없어 보통 0이지만, 방어적으로 세고 화면에 드러낸다.
  - `no_prediction` — 그 축의 예측값이 양·음 둘 중 하나가 아니다. `engine` 축은 `UNSUPPORTED`(**미지원**)·`INVALID`, `ai`·`self` 축은 그 종류의 답이 없는 경우다.
- 분모(`total` = `tp+fp+fn+tn`)를 **축마다 응답에 함께 담는다.** 화면은 "3 / 7"처럼 분모를 반드시 함께 보여 준다. 분모가 0이면 비율은 `—`다(기존 `ratio()` 헬퍼 그대로).
- **`comparison`과 다른 축이다.** `comparison`(AGREE/DISAGREE/…)은 *받은 답 vs 엔진 판정*이고, 이 대시보드는 *예측 vs 확인된 실제 결과*다. 섞어 쓰지 않고 `comparison`에서 TP/FP를 유도하지 않는다.
- 정밀도·재현율은 **이번 범위에서 만들지 않는다.** 사례 수가 한 자릿수인 동안 비율은 오해를 만든다. 칸 개수 + 분모 + 기존 방식의 정확도(일치/분모)까지만 보여 준다.

### 2) 서버: 기존 `/api/dashboard` 확장 (`server/netproof_api/cases.py`)
- **새 엔드포인트를 만들지 않는다.** 기존 `GET /api/dashboard`(`@reviewer_required`) 응답에 키를 **더한다**. 기존 키(`total`·`confirmed`·`unsupported`·`invalid`·`confirmed_in_scope`·`agree`·`ai_confirmed`·`ai_wrong`·`mismatches`)는 **이름과 뜻을 모두 그대로** 둔다.

| 키 | 뜻 |
|---|---|
| `confusion.positive` | 항상 `"DENY"` — 양성 정의를 화면이 추측하지 않게 서버가 적어 준다 |
| `confusion.axes` | 길이 3 배열, 순서 고정 `["ai", "self", "engine"]` |
| `axes[].axis` | `"ai"` / `"self"` / `"engine"` |
| `axes[].tp`·`fp`·`fn`·`tn` | 위 표의 네 칸 |
| `axes[].total` | `tp+fp+fn+tn` (그 축의 분모) |
| `axes[].excluded` | `{not_confirmed, no_actual, no_prediction}` — 세 키를 항상 담는다(0이어도) |
| `mismatches_total` | 엔진이 실제와 다른 사례의 **전체 개수**(`mismatches` 배열은 최근 20건으로 자른다) |

- **DB 전체 materialize를 없앤다.** 지금 `dashboard()`는 `Case.query.all()`로 모든 사례의 `network`·`flow`·`verdict` JSON을 파이썬으로 끌어온다(`server/netproof_api/cases.py:305`). 사례가 늘면 그대로 메모리·시간 문제가 되고, `mismatches`의 `summary()`가 `owner.nickname`을 건드려 N+1 질의까지 난다. 다음으로 바꾼다.
  - **집계 질의 1개**: `GROUP BY claim의 kind, claim의 expected, result, actual_result, (confirmed_at IS NULL)` + `func.count()`. 행 수는 최대 3×3×4×3×2 = 216으로 **사례 수와 무관하게 유한**하다. 기존 키 9개와 세 축 전부를 이 결과에서 파이썬 산술로 만든다.
  - **목록 질의 1개**: `mismatches`용. `result != actual_result`·확인됨·범위 안 조건으로 걸러 `joinedload(Case.owner)`와 `ORDER BY created_at DESC, id DESC`(기존 목록과 같은 정렬)로 **20건만** 가져온다. 전체 개수는 집계 결과에서 이미 알므로 추가 질의가 없다.
  - JSON 경로 추출은 **기존 코드와 같은 방식**(`Case.claim["kind"].as_string()`)을 쓴다. `list_cases`의 `Case.flow["src"].as_string()`(`server/netproof_api/cases.py:142-144`)이 이미 같은 방식이다. PostgreSQL에서 JSON `GROUP BY`가 다르게 동작하면 **같은 한 번의 질의 안에서** `func.sum(case(...))` 조건부 합으로 바꿔도 된다. 질의 수(2개)와 항등식 테스트만 지키면 방식은 Codex가 고른다.
  - `mismatches` 배열을 20건으로 자르는 것은 **의도한 동작 변경**이다(지금은 상한이 없다). 화면이 `mismatches_total`로 "전체 N건 중 최근 20건"을 밝히고, 전체 보기는 아래 목록 필터 링크로 보낸다.
- **새 필터 세 개를 `/api/cases`에 더한다.** 칸 링크가 가리킬 주소가 필요하다. 기존 `allowed` 검증 표(`server/netproof_api/cases.py:118-123`)에 같은 모양으로 넣는다.

| 질의 변수 | 허용값 | 조건 |
|---|---|---|
| `actual` | `PASS` · `DENY` · `none` | `actual_result` 열. `none`은 `IS NULL` |
| `claim_kind` | `ai` · `self` · `none` | `claim`의 `kind`. `none`은 `IS NULL` |
| `claim_expected` | `PASS` · `DENY` | `claim`의 `expected` |

  - 허용값 밖은 기존과 똑같이 **400**이다. 세 필터는 기존 필터와 **AND**로 합쳐진다.
  - 기존 동작은 전부 그대로다: `mine`·`q`·`result`·`comparison`·`confirmed`·`source`, 배열 응답(`page`/`per_page`가 없으면 `limit(200)` 배열), 페이지 응답(`items`·`total`·`page`·`per_page`·`pages`), 정렬, 마지막 페이지 보정, 검색 이스케이프, 검색어 100자 상한.
  - **칸과 목록은 같은 조건을 써야 한다.** 칸 하나 = `confirmed=1` + `actual=<실제>` + (`engine` 축이면 `result=<예측>`, `ai`·`self` 축이면 `claim_kind=<축>&claim_expected=<예측>`). 집계와 목록이 어긋나면 사용자가 수를 믿을 수 없다 → 아래 교차 확인 테스트로 못 박는다.
- **쓰기는 없다.** 이 과제에서 `POST`·`PATCH`·`DELETE`·`confirm`·`unconfirm`·`export`·`observe`·`verify`·`policy-matrix`는 한 줄도 고치지 않는다. 새 DB 열·인덱스·마이그레이션을 만들지 않는다(`models.py`는 손대지 않는다).

### 3) 화면: 2×2 세 개 + 칸 → 목록 (`web/src/pages/DashboardPage.tsx`, `CasesPage.tsx`)
- 대시보드에 **섹션 하나**를 더한다: "오탐·미탐"(기존 요약 카드와 "엔진이 실제와 다른 사례" 사이). 새 라우트·새 탭·새 페이지를 만들지 않는다.
- 섹션 머리에 고정 문구 네 개를 반드시 쓴다.
  - **"여기서 양성은 통신 차단(DENY)입니다. 막힌다고 본 것이 맞았는지를 셉니다."**
  - **"오탐은 막힌다고 했는데 실제로 통한 경우, 미탐은 통한다고 했는데 실제로 막힌 경우입니다."**
  - **"검토자가 확인한 실제 결과만 셉니다. 미확인·미정·지원 범위 밖 사례는 분모에서 빠집니다."**
  - **"이 표는 판정을 다시 하지 않습니다. 이미 저장된 답·판정·실제 결과를 세기만 합니다."**
- 축마다 2×2 `<table>` 하나. 행은 예측(`DENY`/`PASS`), 열은 실제(`DENY`/`PASS`)이고 `<th scope>`로 머리글을 준다. 칸 안에 **개수와 칸 이름**을 쓴다(오탐·미탐은 이름을 꼭 보이게 한다). 표 아래 한 줄로 분모와 제외 내역(`미확인 n · 미정 n · 예측 없음 n`)을 밝힌다.
- 칸 링크: 개수가 **1 이상일 때만** `<a href="#/cases?…">`로 만든다. 0건은 링크하지 않는다(빈 목록으로 보내지 않는다). `aria-label`에 "AI 답 차단 · 실제 통과 · 오탐 3건, 사례 목록으로"처럼 뜻을 적는다.
- 주소는 **기존 직렬화 함수를 재사용한다**: `caseSearchParams`로 만든다. 새 질의 문자열 형식을 따로 만들지 않는다.
- 새 순수 모듈 `web/src/confusion.ts`:
  - `confusionCellFilters(axis, predicted, actual): CaseFilters` — 칸 → 필터. **여기 한 곳만** 축·예측·실제를 필터로 바꾼다.
  - 칸 이름·설명 상수(`오탐`·`미탐`·`맞게 잡은 차단`·`맞게 본 통과`)와 축 이름(`AI 답`·`사람 예상`·`NetProof 판정`).
  - 비율은 기존 `DashboardPage`의 `ratio()`를 그대로 쓴다. 새 포맷 함수를 만들지 않는다.
- `web/src/caseSearch.ts`:
  - `emptyCaseFilters`·`CaseFilters`에 `actual`·`claim_kind`·`claim_expected` 세 문자열 칸을 더한다. **질의 변수 이름과 같은 이름**을 써서 `caseSearchParams`의 기존 반복문에 키만 추가하면 되게 한다.
  - `parseCaseFilters(query: string): CaseFilters` 추가 — 주소의 질의 문자열을 필터로 되돌린다. **허용값 밖·모르는 키는 버린다**(서버에서 400이 날 값을 보내지 않는다). `mine=1`만 `true`, `q`는 100자에서 자른다. `caseSearchParams`와 왕복이 맞아야 한다.
- `web/src/router.ts`: `/cases`에만 질의 문자열을 허용한다 — `{ page: "cases"; query?: string }`. **질의가 없으면 `query` 키를 넣지 않는다**(기존 `parseRoute("#/cases")` → `{page:"cases"}` 테스트가 그대로 통과해야 한다). `/`·`/s/…`·`/matrix`·`/dashboard`·`/settings`·`/cases/<id>`의 해석은 **바꾸지 않는다**.
- `CasesPage`: `route.query`가 있으면 그 값으로 필터와 검색창 초기값을 잡고, `route.query`가 바뀌면 다시 잡는다(1페이지로). 적용된 필터는 기존 "적용한 검색어" 자리 옆에 한 줄로 **보여 준다**(주소에만 있고 화면에 안 보이는 필터를 만들지 않는다). 기존 "초기화" 버튼이 세 필터도 지운다.
  - **단방향이다.** 화면에서 필터를 바꿀 때 주소를 다시 쓰지 않는다(공유·뒤로 가기는 대시보드에서 온 주소에만 적용된다). 양방향 동기화는 범위 밖 — 한계에 적는다.
  - 세 필터를 기존 `case-filters` 묶음에 `<select>`로 더한다(실제 결과 · 받은 답 종류 · 받은 답). 묶음은 375px에서 이미 줄바꿈된다.
  - 이번에 CasesPage를 만지므로 **남아 있던 후속 1건을 함께 고친다**: 빈 검색창에 공백만 입력하면 매 타자마다 재조회되는 문제(`CasesPage.tsx:52-54`). 다듬은 값이 현재 `filters.q`와 **다를 때만** 다시 조회한다.
- 대시보드 "엔진이 실제와 다른 사례" 블록: 목록 모양·링크는 그대로 두고, `mismatches_total > mismatches.length`일 때 "전체 N건" 안내와 전체 보기 링크를 붙인다.
- `web/src/types.ts`: `Dashboard`에 `confusion`·`mismatches_total`, `CaseFilters`에 세 칸, `ConfusionAxis` 타입만 더한다. 기존 타입은 바꾸지 않는다. `api.ts`는 `dashboard()`·`searchCases()`를 그대로 쓰므로 **고칠 것이 없다**(고치게 되면 이유를 적는다).

### 4) 범위 밖 · 허용 파일
- 허용 파일: `server/netproof_api/cases.py`, `server/tests/test_dashboard.py`(신규), `server/tests/test_case_search.py`, `server/tests/test_cases.py`, `web/src/{confusion.ts,confusion.test.ts}`(신규), `web/src/{caseSearch.ts,caseSearch.test.ts,router.ts,router.test.ts,types.ts}`, `web/src/pages/{DashboardPage.tsx,CasesPage.tsx}`, `web/src/styles.css`, `docs/semantics.md`, `HANDOFF.md`, `decisions/ai-work-log.md`.
- 제외: **엔진 전부**(`verify`·`compare`·`policy_matrix`·`observe`·`__version__`), `server/netproof_api/{models.py,auth.py,__init__.py}`, 새 DB 열·인덱스·마이그레이션, 새 엔드포인트, 새 라우트·새 탭, `CaseDetailPage`·`JudgePage`·`PolicyMatrixPage`·`SettingsPage`, `draft.ts`·`share.ts`·`practice.ts`·`observe.ts`, 기존 `expect`·`cases/*.json`, 새 의존성, 앱 안 LLM 호출, 배포·병합, 실제 장비 접속.
- **하지 않는 것**(사용자 확정): 판정 복제·재계산, 기대값(`expect`) 자동 생성·수정, 실제 결과·확인 상태 자동 변경, 붙여넣은 원문 저장(이번 과제는 쓰기 자체가 없다), 정밀도·재현율·시계열 추세, 사용자별 순위, 미확인 사례를 분모에 넣기.
- 위험:
  - **FP·FN 뒤집힘** → 양성이 `DENY`라는 방향을 테스트 2건으로 못 박는다(예측 `DENY`+실제 `PASS`는 `fp`, 예측 `PASS`+실제 `DENY`는 `fn`).
  - **분모 부풀리기** — 미확인·미정·미지원을 분모에 넣으면 "AI가 90% 맞췄다"가 나온다 → 항등식 테스트 + 화면에 제외 내역 표시.
  - **칸 수와 목록이 다름** — 집계와 목록이 조건을 따로 쓰면 사용자가 수를 믿을 수 없다 → 칸마다 목록을 실제로 불러 개수가 같은지 보는 교차 확인 테스트.
  - **DB 전체 materialize가 남음** — 집계로 바꾸지 않으면 사례가 늘수록 대시보드가 느려지고 `mismatches` 응답이 무한정 커진다 → 질의 수가 사례 수와 무관한지 보는 테스트 + 20건 상한.
  - **JSON 경로 집계의 DB 의존** — SQLite와 PostgreSQL의 JSON 처리가 다를 수 있다(이슈 #13 비ASCII 검색과 같은 부류) → SQLite에서 테스트하고 **PostgreSQL 실연결은 미검증으로 기록**한다.
  - **새 필터에 맞는 인덱스가 없다** — `actual_result`·JSON `claim` 조건은 기존 인덱스를 쓸 수 없다. 수업 규모(사례 수백 건)에서는 괜찮고 새 열을 만들지 않는다는 결정이 우선이다 → 한계에 적는다.
  - **적은 표본의 비율** → 정밀도·재현율을 만들지 않고 개수와 분모를 함께 보인다.
  - **검토자만 보는 수, 로그인한 모두가 보는 목록** — 대시보드는 검토자 전용(`@reviewer_required`)이고 칸 링크가 가는 사례 게시판은 로그인한 사용자 전체가 본다. 이는 **기존 권한 구조 그대로**이고 새로 넓히는 것이 없다. 일반 사용자에게 대시보드 탭·주소를 열어 주지 않는다(`web/src/App.tsx:78-80`·`106` 그대로).
- 완료 조건: 아래 네 명령을 **직접 실행**하고 출력을 붙인다.
  - `cd engine && ../.venv/Scripts/python -m pytest -q` (엔진은 고치지 않지만 회귀 확인)
  - `cd server && ../.venv/Scripts/python -m pytest -q`
  - `npm --prefix web test`
  - `npm --prefix web run build`
  - 서버 테스트(`test_dashboard.py`): **양성 방향 2건**(예측 `DENY`+실제 `PASS` → `fp`, 예측 `PASS`+실제 `DENY` → `fn`) / 축마다 **항등식** `tp+fp+fn+tn+not_confirmed+no_actual+no_prediction == 전체 사례 수` / 제외 사유 우선순위(미확인이면 `not_confirmed`에만 센다) / `UNSUPPORTED`·`INVALID`는 `engine` 축 `no_prediction`이고 `ai` 축 계산에는 영향 없음 / `ai`와 `self` 축이 섞이지 않음(`kind` 없는 답은 두 축 모두에서 `no_prediction`) / 빈 DB는 모든 칸 0·`positive == "DENY"`·축 3개 / **기존 키 호환**: `agree == engine.tp + engine.tn`, `ai_confirmed == ai.total`, `ai_wrong == ai.fp + ai.fn`, `total`·`confirmed`·`confirmed_in_scope`·`unsupported`·`invalid`는 기존 테스트(`server/tests/test_cases.py:121`) 값 그대로 / `mismatches` 20건 상한과 `mismatches_total` / 비검토자 403·로그인 없이 401 / **질의 수가 사례 수와 무관**(사례 3건과 30건에서 `/api/dashboard`의 SQL 문장 수가 같고 작은 상한 이하 — SQLAlchemy 이벤트로 센다).
  - 서버 테스트(목록 필터, `test_case_search.py`): 새 필터 세 개가 각각 걸러짐 / 허용값 밖은 400 / `none`이 `IS NULL`과 맞음 / 기존 필터·검색·`mine`·배열 응답·페이지 응답·정렬·마지막 페이지 보정 **회귀** / **교차 확인**: 혼동 행렬의 칸마다 그 칸의 필터로 `/api/cases`를 불러 `total`이 칸 개수와 같다(세 축 × 네 칸 전부).
  - 웹 테스트: `confusion.test.ts` — 12개 칸(3축×4칸)이 각각 기대하는 질의 문자열을 만들고, `engine` 축은 `result`를, `ai`·`self` 축은 `claim_kind`+`claim_expected`를 쓰고, 모든 칸에 `confirmed=1`이 붙는다. `caseSearch.test.ts` — `parseCaseFilters` ↔ `caseSearchParams` 왕복, 허용값 밖·모르는 키·빈 질의 문자열 버리기, `q` 100자 절단, 기존 `caseSearchParams` 테스트 회귀. `router.test.ts` — `#/cases?actual=PASS`가 `{page:"cases", query:"actual=PASS"}`이고 `#/cases`는 **`{page:"cases"}` 그대로**, `#/cases/12`·`#/s/abc`·나머지 라우트 회귀.
  - 브라우저(**375×812 기준**): 검토자로 로그인 → 대시보드에 2×2 세 개와 고정 문구 네 개 보임 → 오탐 칸(개수 ≥ 1) 클릭 → 사례 게시판이 그 조건으로 걸러지고 **표시된 결과 수가 칸 개수와 같음** → 적용된 필터가 화면에 보임 → 뒤로 가기로 대시보드 복귀 → "초기화"가 세 필터도 지움 → 0건 칸은 클릭되지 않음. **본문 가로 넘침 없음**(body scrollWidth ≤ 375 — 2×2 표가 가로 스크롤을 만들면 표 자체를 `overflow-x: auto`로 감싼다), console error 0, 데스크톱 1280에서도 확인. 일반 사용자로는 대시보드 탭이 보이지 않는 것까지 확인. 임시 DB와 손으로 만든 사례만 쓴다.
  - `docs/semantics.md`에 **10절 "오탐·미탐(혼동 행렬)"** 추가: 양성은 `DENY`(사용자 결정) / 네 칸 정의표 / 분모와 세 가지 제외 사유 / 세 축의 예측값 출처 / `comparison`과 다른 축이라는 점 / 이것은 집계이고 판정을 만들지 않는다. **1~9절은 바꾸지 않는다.** 새 문서는 만들지 않는다(계약은 이 문서의 작업 정의에 둔다).

## 완료 내용 / 테스트 결과
- 기존 dashboard API에 DENY 양성·세 축·네 칸·상호 배타 제외 집계 추가. SQL GROUP BY는 필요한 작은 열만 선택하며, 알 수 없는 저장 값은 미정으로 정규화한다(정상 데이터 216그룹 이하, 알 수 없는 result까지 270 이하). 불일치 최근20건·전체건수, owner joinedload. 기존 배열·페이지 응답 유지.
- 목록 실제 결과/답 종류/답 필터, 주소 허용값 검증·코드포인트100자, 2×2 링크 helper 구현. CasesPage 내부 useRoute로 query를 읽어 App.tsx 수정 없이 주소 변경 반영. 초기화 및 빈 검색창 공백 재조회 수정. 전체 불일치는 오탐·미탐 두 목록 링크로 나눠 연결한다.
- 실제 실행: `cd engine && ../.venv/Scripts/python -m pytest -q` → **263 passed, 2 xfailed in 7.57s**; `cd server && ../.venv/Scripts/python -m pytest -q` → **85 passed, 1 skipped in 14.71s**; `npm --prefix web test` → **10 files, 105 passed, 866ms**; `npm --prefix web run build` → **tsc 성공, 39 modules, built in 676ms**.
- 추가 검증: 각 축 분모·제외 항등식, 미지원이 답 축을 막지 않음, 종류 없는 답 제외, 12칸과 목록 건수 일치, 새 필터 none·AND·배열 회귀, 3건/30건에서 SQL 수 동일(5이하), 불일치20건·정렬·전체30건. 최초 서버 테스트1건 실패는 합성 예시 claim.kind가 없는 것을 AI라고 가정한 테스트 fixture 오류였다. 테스트 준비값에 종류를 명시하고 전체 서버 재실행 통과; 기존 사례 파일은 수정하지 않았다.
- 임시 DB에 합성 통계 사례8개와 임시 검토자만 추가해 브라우저 QA. 375×812 body360≤375, 표3개·고정 문구, AI오탐1건 클릭→목록1건·필터 표시, 뒤로가기·초기화(35건 전체) 확인. QA사례28을 잠시 미확인으로 두어 0건 셀 링크0 확인 후 복구. 일반 계정 대시보드 탭 없음 확인. 기존 사례27·운영 DB 변경 없음.
- 데스크톱 body1265≤1280, 콘솔 오류0, 기본 뷰포트 복구·대시보드 화면 유지. 전체 DOM 자동 테스트·인위적 지연 주입·PostgreSQL 실연결·실장비·배포는 미검증. 필터 주소는 단방향이며 새 JSON 조건 인덱스는 없다. 판정·쓰기·엔진·expect 불변.
- 추가 수동 QA: 같은 CasesPage에서 주소의 AI오탐 조건→엔진오탐 조건 변경 시 1건→2건으로 갱신. 로딩 중 이전 결과 안내 확인, 대시보드로 복귀.

## 현재 과제 리뷰 기록
- PR #17: https://github.com/myeongjundev/netproof/pull/17 . 검토 코드 SHA **e0d26b3**, Claude (Claude Opus 5) 독립 리뷰 **PASS, 차단0·비차단3**.
- 리뷰 원문: https://github.com/myeongjundev/netproof/pull/17#issuecomment-5946024286 . Claude가 직접 실행·검토 후 저장소 밖 `comment.md`를 완성했으나, 게시 단계에서 외부 API 재시도가 반복되어 Codex가 작성자/게시자를 명시하고 원문을 그대로 전달했다. Claude 작성 판단이며 Codex 자체 리뷰로 대체하지 않았다.
- Claude 직접 engine **263 passed, 2 xfailed in 2.57s**, server **85 passed, 1 skipped in 14.10s**, web **105 passed, 803ms**, build **333ms**. 저장소 테스트와 별도의 독립 probe67개 전부 OK: 방향·분모·제외 우선순위·12칸 목록일치·기존키·권한·배열/페이지·JSON 미지 값·읽기 전후 DB불변. SQL SELECT는 10건/40건 모두4개(세션/사용자/집계/목록). PG 방언 컴파일만 확인, 실연결은 미검증.
- 비차단 후속3건: CasesPage 진입 시 초기화 effect의 새 필터 객체로 조회2번 발생(첫 응답 cleanup으로 버림, DOM 실행 재현은 미검증); 빈 질의 `#/cases?`가 query 빈문자열 키를 남김(동작상 빈 필터); 임의 DB kind값은 집계에서 예측 없음인데 claim_kind=none은 NULL만 필터(현 쓰기 경로에서는 kind 정규화, 12칸 링크에는 영향 없음).
- 내부 useRoute·전체 불일치 두 링크·정규화 그룹270이하는 설계 의도 내 선택으로 Claude가 수용. 엔진/expect/쓰기 경로/허용 밖 변경 없음. Claude 독립 브라우저 확인·인위적 지연 주입·PG 실연결·실장비는 미검증. 추가 코드 변경 없이 기록만 커밋한다.

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
- **PR #16 실제 결과 붙여넣기 (병합 완료, `309238d`)**: 엔진 `observe` 순수 파서(ping·Nmap 출력 → 실제 결과 **입력 후보**), 상태 없는 `POST /api/observe`(로그인 필요, DB 접근 없음), 작성자 전용 상세 UI, `web/src/observe.ts` 적용 헬퍼. Claude 독립 리뷰 PASS(`33f957d`) → Codex 보완 14건 → Claude 보완 재리뷰 PASS 유지(`28eff26`, 차단 0건) → 사용자 병합. 최종 실행: engine 263 passed·2 xfailed, server 80 passed·1 skipped, web 90 passed, build 성공.
  - 유지되는 합의: **관측 ≠ 판정.** 붙여넣은 출력은 "실제로 본 것"이고 PASS/DENY는 `engine/`의 `verify`가 정한다. **무응답·filtered는 DENY의 증거가 아니라서 DENY 후보를 만들지 않는다.** 붙여넣은 **원문은 저장하지 않고**(사람이 확인한 메모 1000자만), 적용·저장은 사람이 버튼을 눌러서 한다.
  - 남은 비차단 후속 3건: Nmap에 ping 응답 낱줄만 섞인 경우 미인식, NBSP·전각 공백도 보수적으로 거절, 머리글 뒤 거절에서 읽은 `target`이 남음(화면은 `OK`에서만 표시). 명시적 금지 메시지(administratively prohibited) 인식과 출력 위조 증명은 범위 밖.
- **PR #15 사례 복제·실습 과제 템플릿 (병합 완료, `7b15fde`)**: `web/src/practice.ts` 실습 과제 3개, 받은 답을 비운 "복제해 다시 풀기". 앱은 기대값·정답·채점을 만들지 않는다. 후속: 예시 버튼 제목이 풀이 원인을 드러내는 문제, 제목 길이 UTF-16/코드포인트 차이.
- **PR #14 정책 검증 + 도달성 매트릭스 (병합 완료, `c0ab37e`)**: 엔진 `policy_matrix`, `POST /api/policy-matrix`, `#/matrix` 화면. 상한 초과는 잘라 계산하지 않고 거절한다. `policy`와 `comparison`은 다른 축이다(`docs/semantics.md` 8절).
- **PR #13 사례 목록 검색·필터·페이지 (병합 완료)**: 비ASCII 검색은 DB 의존, `mine=1`·무인자 배열 응답 호환 유지. 후속 1건(빈 검색창 공백 재조회)은 **이번 과제에서 함께 고친다**.
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
- [ ] Cisco 설정 붙여넣기 ①`interface`/`ip address` ②`ip route` — ① **보류: 수업 ACL이 Cisco인지 확인(사람 트랙) 뒤 착수**

**3주차 (10-12~10-18, 해커톤 1차 주말 — 가볍게)**
- [x] 실제 결과 붙여넣기(ping·Nmap 출력 → 실제 결과 입력 후보) — ④ (PR #16 병합 완료, `309238d`)
- [ ] 오탐·미탐 대시보드 — ⑤ AI 답·사람 예상·NetProof 판정을 각각 실제 결과와 2×2로, 칸을 누르면 목록 필터로. **DENY 양성. PR17 구현·검증·Claude PASS 완료 → 사용자 병합 결정 대기 — 브랜치 codex/confusion-dashboard**
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
- [ ] 동기 3명 인터뷰 · [ ] 실제 결과가 있는 사례 모으기(붙여넣기 기능의 재료) · [ ] 사례 04 손계산
- [ ] **수업 ACL이 Cisco인지 pfSense인지 확인(Cisco 과제의 선행 조건)** · [x] **오탐·미탐 양성 정의: 통신 차단(DENY)** · [ ] 표어 결정
- [ ] 배포(Vercel·Supabase 가입, 비밀값) · [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

**위험**: 4주차 전에 ①~⑤의 핵심(하이라이트·목록 필터·정책 검증·오탐/미탐·실제 결과 붙여넣기)이 끝나지 않으면 사용자 테스트가 흔들린다. 밀리면 4·5주차 항목부터 미룬다.

## 다음 LLM이 확인할 내용
- `git pull`, `git status`, `git log -3` 후 사용자 PR17 병합 결정을 확인한다. 구현·독립 리뷰는 완료되어 새 구현은 필요 없다. 병합 뒤 다음 독립 과제는 **ACL 점검(가려진 규칙·중복·과도한 permit)의 Claude 설계**이며 Cisco 붙여넣기는 사람 확인까지 보류한다. 양성은 사용자 확정 DENY로 유지한다.
- Codex: 구현 전에 `server/netproof_api/cases.py`(`dashboard()`의 `Case.query.all()`·`list_cases`의 `allowed` 검증 표와 JSON 경로 조건), `server/netproof_api/models.py`(`Case.in_scope`·`summary()`·기존 인덱스 — **읽기만 한다**), `web/src/caseSearch.ts`(`caseSearchParams`), `web/src/router.ts`(`parseRoute`), `web/src/pages/{DashboardPage.tsx,CasesPage.tsx}`, `web/src/types.ts`(`Dashboard`·`CaseFilters`)를 읽고 **새 DB 열·새 엔드포인트·판정 재계산을 만들지 않는지** 확인한다.
- 네 칸의 정의, 양성 정의, 제외 규칙, 세 축의 예측값 출처를 줄이거나 늘리고 싶으면 **먼저 요청한다.** 이것을 바꾸는 것은 통계의 뜻이 바뀌는 변경이다.
- 집계 결과와 칸 링크가 가리키는 목록이 어긋나면 **구현 쪽 버그다.** 수를 맞추려고 분모나 필터 뜻을 바꾸지 않는다.

## 주의사항 / 미해결 이슈
- 관계없는 줄바꿈 변경 금지.
- **집계 ≠ 판정.** 대시보드는 저장된 `result`·`claim.expected`·`actual_result`를 세기만 한다. PASS/DENY는 `engine/`의 `verify`가 정하고(ADR-001), 화면·서버는 어느 쪽도 다시 계산하지 않는다.
- **양성은 통신 차단(`DENY`)이다**(사용자 확정). 오탐 = 막힌다고 했는데 실제로 통함, 미탐 = 통한다고 했는데 실제로 막힘.
- **미확인·미정·미지원은 분모에서 뺀다.** 제외한 수를 숨기지 않고 화면에 함께 적는다.
- **관측 ≠ 판정.** 붙여넣은 출력은 실제 결과(④)이고, 무응답·filtered는 DENY의 증거가 아니다. 자동 DENY 후보를 만들지 않는다.
- 붙여넣은 **원문은 저장하지 않는다.** 이번 과제는 쓰기가 아예 없다.
- 실제 결과가 바뀌면 확인이 풀리는 것은 **기존 서버 동작**이다. 화면에서 확인·확인 해제를 자동으로 부르지 않는다.
- 앱은 기대값·정답·채점을 만들지 않는다(AGENTS.md). 기존 `expect`·`cases/*.json`을 바꾸지 않는다.
- 유니코드 숫자·긴 숫자로 `int()`를 부르면 이슈 #7·#9가 되돌아온다. ASCII 십진수를 확인하고 길이 상한을 본 뒤 변환한다(`page`·`per_page` 기존 검증 그대로).
- 새 목록 필터(`actual`·`claim_kind`·`claim_expected`)는 기존 인덱스를 쓸 수 없다. 수업 규모에서는 괜찮지만 사례가 크게 늘면 인덱스나 열을 다시 논의한다.
- 사례 게시판의 필터 ↔ 주소 동기화는 **단방향**이다(주소 → 화면). 화면에서 필터를 바꾼 결과를 공유하려면 양방향 동기화가 필요하고, 그것은 후속 과제다.
- PostgreSQL 실연결에서의 JSON 집계·필터는 미검증이다(SQLite 기준으로 테스트한다). 이슈 #13의 비ASCII 검색과 같은 부류의 한계다.
- 이전 PR #12의 별도 버그(strict xfail 두 건), Hypothesis 하한 문제는 별도 후속 범위.
- PR #15 후속: 예시 버튼 제목이 풀이 원인을 드러내는 문제, 제목 입력 UTF-16/코드포인트 단위 차이. 이번 범위가 아니다.
- PR #16 후속 3건(Nmap에 ping 낱줄 혼합, NBSP·전각 공백 거절, 거절 시 `target` 잔존)은 이번 범위가 아니다.

설계: Claude (Claude Opus 5)

Codex (GPT-6)
