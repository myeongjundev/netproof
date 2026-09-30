# HANDOFF

Claude ↔ Codex가 GitHub를 채널로 주고받는 **현재 상태 문서**입니다. 이력은 쌓지 않고 덮어씁니다.
과제별 이력은 `decisions/ai-work-log.md`, 사람과 AI의 판단이 갈린 순간은 `decisions/disagreement-log.md`(사용자가 채움)에 둡니다.

## 운영 방식
- 흐름: Claude 설계 → Codex 구현 → Claude 리뷰 → Codex 수정 → 테스트 → 사용자 최종 확인·병합.
- 역할: 설계·리뷰·문서는 Claude, 구현·테스트·버그 수정은 Codex, 병합과 최종 판단은 사용자.
- 채널: 설계는 `main`의 이 문서, 구현 중 상태는 작업 브랜치의 이 문서(차례인 쪽만 수정), 리뷰 지적은 PR 코멘트.
- 같은 GitHub 계정을 쓰므로 커밋 끝 Co-Author 줄과 코멘트 첫 줄 `[Claude]`/`[Codex]`로 구분합니다.
- 단계별 지시문: [PROMPTS.md](PROMPTS.md).
- **사람만 하는 일**: 사례 정답(손계산), 동기 인터뷰, 배포 가입·비밀값 입력, 제품 방향 결정. 어느 LLM에도 넘기지 않습니다.

## 검증 원칙
- "두 LLM이 동의했다/통과라고 했다"는 검증이 아닙니다. 근거는 테스트 출력, `git diff`, 실제 실행 결과뿐입니다.
- 리뷰 지적에는 파일:줄과 재현 명령을 붙입니다. 의견이 갈리면 가릴 수 있는 테스트부터 만듭니다.
- 금지: 비밀값 커밋, `--force` 푸시, 승인 없는 `main` 직접 푸시. 이 저장소는 공개입니다.

## 현재 작업 상태
- 다음 차례: **사용자** — 다음 과제 고르기(P0 남은 결정 또는 P2)
- 브랜치 / 마지막 커밋: `main` / PR #2 병합 `177f1f0`
- 진행 단계: P1 완료(사용자가 실제 Chrome에서 클립보드 성공 경로 확인 후 병합, 이슈 #1 닫음)
- 한 줄 요약: P1 사례 URL 공유 — 판정기 입력을 링크 하나로 주고받기(서버 저장 없음)

## 작업 정의 (설계 담당) — P1 사례 URL 공유
- **목표**: 판정기의 지금 입력(구성·흐름·받은 답)을 링크 하나로 복사하고, 그 링크를 열면 같은 입력이 판정기에 채워진다. 서버에 저장하지 않는다(plan.md Should).
- **링크 형식**: `<사이트>/#/s/<payload>`
  - `payload` = `1.` + base64url( deflate-raw( UTF-8( JSON ) ) ). 앞의 `1.`은 형식 버전
  - JSON 내용은 `{ network, flow, claim }` — 기존 `caseJson()`의 내용에서 자리표시 `id`·`source`만 뺀 것. `network`는 `toNetwork(draft)`
  - 압축은 브라우저 내장 `CompressionStream`/`DecompressionStream("deflate-raw")`, 문자 변환은 `TextEncoder`/`TextDecoder`. **새 의존성 없음**
  - `#` 뒤(해시)는 서버로 가지 않으므로 서버 로그에 입력이 남지 않는다
- **동작**
  1. 판정기에 **"링크 복사"** 단추. 누르면 링크를 클립보드에 복사하고 "링크를 복사했습니다"를 `aria-live`로 알린다
  2. 클립보드를 못 쓰면(보안 연결이 아닌 주소, 권한 거부) 오류 대신 링크를 읽기 전용 입력 칸에 보여 줘서 직접 복사하게 한다
  3. 단추 가까이에 한 줄 안내: "링크에 지금 입력(받은 답 메모 포함)이 그대로 들어 있습니다"
  4. `#/s/<payload>`를 열면 풀어서 판정기에 채운다(기존 예시 불러오기와 같은 `load` 경로 — 이전 판정 결과는 지운다). **자동으로 판정하지 않는다.** 사용자가 판정하기를 누른다
  5. 채운 직후 주소를 `#/`로 바꾼다. 그 뒤 입력을 고치고 다른 화면에 갔다 와도 **링크 내용으로 다시 덮어쓰지 않는다**
  6. 잘못된 링크(버전 다름, base64 오류, 압축 오류, JSON 오류, 모양 오류, 크기 초과)는 판정기 오류 줄에 한국어 한 줄로 알리고, 지금 입력은 그대로 둔다. 콘솔에 잡히지 않은 예외가 없어야 한다
- **인터페이스** (새 파일 `web/src/share.ts`, React 없이 순수 함수)
  - `encodeShare(draft: Draft): Promise<string>` → `payload`
  - `decodeShare(payload: string): Promise<CaseItem>` → 성공하면 `fromCase()`에 그대로 넣을 수 있는 값, 실패하면 `ShareError`(메시지는 한국어)만 던진다
  - `router.ts`: `#/s/<payload>` → `{ page: "judge", share: "<payload>" }`. `#/s/`(빈 값)는 `missing`
- **입력 검증 (신뢰 경계 — 링크는 남이 만든 값)**
  - 압축을 **풀면서** 누적 64KB(서버 `MAX_CONTENT_LENGTH`와 같음)를 넘는 순간 멈추고 `ShareError`. 다 푼 뒤에 재지 않는다
  - 모양 검사: `network.devices`는 배열, `network.acls`는 객체(없으면 `{}`), `flow`는 객체이고 `src`·`dst`가 문자열. 나머지 판정은 기존처럼 서버·엔진이 한다(장비 수 등 `LIMITS`를 화면에 복제하지 않는다)
  - 화면에는 React 텍스트로만 넣는다(`dangerouslySetInnerHTML` 금지)
- **변경 범위(만질 파일)**: `web/src/share.ts`(새), `web/src/share.test.ts`(새), `web/src/router.ts`, `web/src/router.test.ts`, `web/src/pages/JudgePage.tsx`, `web/src/App.tsx`(필요하면), `web/src/styles.css`(필요하면), `HANDOFF.md`
- **건드리지 않을 것**: `engine/`, `server/`, `api/`, `cases/`, `docs/`, 사례 게시판·상세 화면, 새 npm 의존성
- **예상 리스크** (리뷰 때 우선 확인)
  - 한글이 들어간 입력에 `btoa(문자열)`을 바로 쓰면 깨지거나 예외 — 반드시 UTF-8 바이트로 바꾼 뒤 인코딩
  - base64 기본 문자(`+ / =`)가 주소에서 깨짐 — base64url
  - 해시 라우터와 충돌: 공유 경로가 남아 있으면 화면을 옮겼다 올 때 고친 입력을 덮어씀(동작 5)
  - 압축 폭탄: 설계 확인 결과 **공백 10MB가 13,608자 링크**가 된다 → 크기 제한 없으면 탭이 멈춤
  - 클립보드 API는 보안 연결(https·localhost)에서만 동작 — 대체 경로(동작 2)
  - 휴대폰: 새 단추도 누르는 곳 44px 이상(09-29 ④ 규칙), 화면 아래 고정된 판정 단추를 가리지 않기
- **완료 조건 (실행 가능한 명령)**
  1. `npm --prefix web test` → 전부 통과. 새 테스트가 최소 아래를 포함
     - 왕복: `blankDraft()`와 예시 사례 3개를 `encodeShare` → `decodeShare` → `fromCase` 하면 원래 입력과 같다
     - 한글·특수문자(`받은 답` 메모, ACL `remark`)가 왕복 뒤 그대로
     - 오류 6종(버전 다름, base64 오류, 압축 깨짐, JSON 아님, `network`/`flow` 없음, `devices`가 배열 아님)이 모두 `ShareError`
     - 공백 10MB를 압축한 링크 → `ShareError`(크기 초과)
     - 라우터: `#/s/abc` → share, `#/s/` → missing
  2. `npm --prefix web run build` → 타입 검사·빌드 통과
  3. 엔진·서버 테스트 → 기준선 그대로(엔진 64, 서버 40 + 1 건너뜀)
  4. 브라우저 확인(리뷰 담당이 직접): 예시 01 불러오기 → 링크 복사 → 새 탭에서 열기 → 같은 입력 → 판정 결과 같음 / 입력을 고친 뒤 게시판에 갔다 와도 고친 입력 유지 / 한 글자 바꾼 링크 → 오류 한 줄, 콘솔 오류 없음 / 375px에서 단추 확인
- **설계 검증 근거**: 설계 담당이 저장소 밖 스크립트로 같은 방식(deflate-raw + base64url)을 돌려 봄 — 예시 01·02·03 링크 본문 509·470·336자, 공백 10MB → 13,608자. Node 24(이 PC)에 `CompressionStream`이 있어 vitest에서 그대로 테스트 가능

## 완료한 내용
- P1 사례 URL 공유: UTF-8·deflate-raw·base64url 인코딩, 버전·입력 모양 검사, 스트리밍 압축 해제 중 64KB 제한.
- 링크 복사와 클립보드 실패 시 읽기 전용 링크 표시, aria-live 안내.
- 공유 경로를 기존 load 경로로 불러온 뒤 주소를 `#/`로 교체. 자동 판정 없음, 이전 판정 응답이 늦게 도착해도 불러온 결과를 덮지 않음.
- 최초 구현 테스트 25개: 처음 구성·예시 3개 왕복, 한글·특수문자, 오류, 10MB 압축 입력, 64KB 경계, 라우터.
- 작업 정의의 파일 목록만 수정. `decisions/ai-work-log.md`는 이번 변경 범위에 없어 수정하지 않음. 구현 도구: Codex (GPT-6 Astra).

- 리뷰 수정: 스트리밍 중단 회귀 테스트 1개 추가(웹 전체 34개), 변이 검출 확인, 빌드 로그 요약 및 모델 이름 정정. 선택 항목 4는 원본 오류 링크 보존을 위해 미반영.

## 변경된 주요 파일
- `web/src/share.ts`, `web/src/share.test.ts`: 공유 데이터 변환·검증과 테스트.
- `web/src/router.ts`, `web/src/router.test.ts`: 공유 경로 인식과 빈 경로 검사.
- `web/src/pages/JudgePage.tsx`, `web/src/App.tsx`: 공유 링크 생성·불러오기 연결.
- `HANDOFF.md`: 실제 실행 출력과 리뷰 인계.

## 테스트 결과
- 2026-09-30 리뷰 수정 후 직접 실행. 엔진·서버는 해당 폴더를 작업 디렉터리로 지정.
- 빌드 출력은 리뷰 2번에 따라 요약만 남김. 새 테스트의 ArrayBuffer 타입 오류를 수정한 뒤 최종 빌드 통과.

### `cd engine && ../.venv/Scripts/python -m pytest -q`
```text
................................................................         [100%]
64 passed in 1.67s
```

### `cd server && ../.venv/Scripts/python -m pytest -q`
```text
..................................s......                                [100%]
40 passed, 1 skipped in 7.04s
```

### `npm --prefix web test`
```text
> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/SKT aleph/netproof/web


 Test Files  4 passed (4)
      Tests  34 passed (34)
   Start at  15:55:38
   Duration  566ms (transform 39%, tests 29%, import 23%, worker 9%)
```

### `npm --prefix web run build`
```text
> tsc --noEmit && vite build
✓ 32 modules transformed.
✓ built in 400ms
```

### 리뷰 1 — 중간 크기 검사 회귀 테스트
명령: `npm --prefix web test -- src/share.test.ts -t '64KB를 넘긴 첫 조각'`
- 실제 DecompressionStream 출력에서 읽은 바이트 수를 관찰. 64KB + 가장 큰 한 조각 이하, EOF 도달 전 중단, cancel 호출을 확인.
- 정상 코드: `1 passed | 24 skipped (25)`.
- 변이: `share.ts`의 `if (size > MAX_BYTES)` 검사를 while 안에서 제거하고 `json += decoder.decode();` 뒤로 이동. 같은 명령 직접 실행:
```text
AssertionError: expected 10485760 to be less than or equal to 81920
Test Files  1 failed (1)
Tests  1 failed | 24 skipped (25)
Mutation test exit code: 1 (expected 1); original source restored
```
- finally에서 원본 복구 후 전체 34개 통과. `git diff --exit-code -- web/src/share.ts web/src/pages/JudgePage.tsx` → 출력 없음, exit 0.

### 리뷰 2·3 — 문서 및 모델 표기
- 빌드 글꼴 목록 제거. `Select-String -Path HANDOFF.md -Pattern '^dist/assets/Pretendard'` → 출력 없음.
- 현재 대화의 로컬 turn_context 두 건에서 모델 ID `gpt-6-astra` 확인(이전 구현·이번 수정 모두). 정확한 이름: Codex (GPT-6 Astra).
- PR 본문과 HANDOFF 표기를 정정하고 이번 커밋 끝에 정확한 모델 이름을 남김. 이미 푸시한 `8317a3e`의 부정확한 표기는 이 기록으로 정정하며, 공유 이력은 재작성하지 않음.

### 리뷰 4 — 선택 항목 미반영
- 실패한 링크는 원본을 복사·수정·재현할 수 있게 주소에 유지한다. 오류가 다시 표시되는 점은 수용한다. 성공 시에만 주소를 비우는 기존 설계를 유지.
- 이번 화면 변경 없음. `npm --prefix web test -- src/share.test.ts -t '오류'` → 아래 실제 결과. 입력 보존·오류 한 줄·콘솔 오류 없음은 기존 Claude 브라우저 확인 결과이며 이번에 재실행한 것으로 주장하지 않음.
```text
> netproof-web@0.1.0 test
> vitest run src/share.test.ts -t 오류


 RUN  v5.0.2 C:/SKT aleph/netproof/web


 Test Files  1 passed (1)
      Tests  15 passed | 10 skipped (25)
   Start at  15:56:37
   Duration  324ms (transform 47%, import 31%, tests 16%, worker 6%)
```

## 리뷰 기록 (리뷰 담당)
전문: PR #2 `[Claude]` 코멘트. 직접 실행: 엔진 64 · 서버 40+1 · 화면 33 · 빌드 통과. 브라우저 완료 조건 4 통과(클립보드 **성공** 경로만 미확인 — 사용자가 실제 Chrome에서).

| # | 파일:줄 | 문제 | 재현 방법 | 상태 |
|---|---|---|---|---|
| 1 | `web/src/share.test.ts` (코드 `share.ts:71`은 맞음) | [보통] 크기 검사를 다 푼 뒤로 옮겨도 테스트가 모두 통과 — "풀면서 멈춤"이 고정되지 않음 | `share.ts:71` 검사를 `:74` 뒤로 옮기고 `npm --prefix web test` → 33 passed | **확인 완료** — Claude가 같은 변형을 직접 넣어 새 테스트 실패 확인(`expected 10485760 to be less than or equal to 81920`), 되돌린 뒤 34 passed |
| 2 | `HANDOFF.md:116~` | [낮음] 빌드 전체 출력(글꼴 92줄) | 파일 보기 | **확인 완료** — `PretendardVariable` 0줄 |
| 3 | `HANDOFF.md:73`, PR 본문, 커밋 | [낮음] 모델 이름이 `Codex (GPT-6)` — 실제 고른 모델 이름으로 | 파일 보기 | **확인 완료** — HANDOFF·PR 본문·`e7cf028` 모두 `Codex (GPT-6 Astra)`. Claude도 Codex 로컬 기록에서 `gpt-6-astra` 확인. `8317a3e`의 표기는 강제 푸시 없이 PR 코멘트로 정정 |
| 4 | `web/src/pages/JudgePage.tsx:57` | [선택] 잘못된 링크면 주소가 `#/s/…`로 남아 새로고침·화면 이동 뒤 같은 오류가 다시 뜸(설계에서 빠진 부분) | 잘못된 링크 열기 → `#/cases` → 뒤로 | **미반영 수용** — 잘못된 원본 링크를 주소에 남겨 복사·재현할 수 있게 한다는 Codex 근거를 받아들임. 입력은 덮어쓰지 않음(1차 브라우저 확인) |

재리뷰(`e7cf028`) 직접 실행: 엔진 64 · 서버 40+1 · 화면 **34** · 빌드 통과. 화면 코드는 1차 리뷰 뒤 바뀌지 않아(`share.ts`·`JudgePage.tsx` diff 없음) 브라우저 확인은 다시 하지 않음.

## 수작업 필요 항목
- (없음) — 클립보드 성공 경로는 사용자가 실제 Chrome에서 확인함(09-30)

## 남은 작업 (우선순위, 2026-09-30 확정)
기준: ① 동기가 쓸 때 앱이 풍성해지는가 ② 테스트로 확인되는가 ③ 다른 답·결정에 막혀 있지 않은가 ④ 크기

**P0 — 시작 전 (사용자)**
- [x] 협업 파일 도입
- [ ] `plan.md` 목표 변경 기록: 5주차 "Should 1개" → 여러 개 (결정)
- [ ] 수업 ACL이 Cisco인지 pfSense인지 확인 — P2 IOS 붙여넣기의 전제

**P1 — 시범 (방식 한 바퀴)**
- [x] 사례 URL 공유(이슈 #1 · PR #2 병합 `177f1f0`) — 저장 없이 링크로 구성·흐름 전달. 화면만, 왕복 테스트로 확인
- [x] 개입·검증 기록 (P1 한 바퀴): 사람 개입 5번(지시문 붙여넣기 2 · 완료 알림 전달 2 · 수정 라운드 모델 선택 1). "통과라 했는데 실제 실패" **0번**(Codex 보고 테스트 수를 Claude가 두 번 모두 직접 재현). 리뷰가 잡은 실제 문제 1건(테스트가 64KB 스트리밍 제한을 고정하지 못함 — 변형으로 재현). 남은 수작업: 클립보드 성공 경로 확인

**P2 — 핵심 확장 (위 확인 뒤)**
- [ ] Cisco IOS 설정 붙여넣기 — PR 3개: ① `interface`/`ip address` ② `ip route` ③ `access-list`/`ip access-group`
- [ ] 경로 그림에 도달하지 못한 목적지 표시

**P3 — 여유가 있으면**
- [ ] 로그인 실패 → Graylog(GELF) — 배포(Vercel)에서는 닿지 않아 로컬 시연용
- [ ] Batfish 차등 테스트

**제외**: 앱 안 LLM 설명(ADR-002와 충돌 — 넣으려면 ADR부터). `established`는 이미 구현됨(`engine/src/netproof_engine/acl.py`).

**사람 트랙 (동시에, LLM에 넘기지 않음)**
- [ ] 동기 3명 인터뷰
- [ ] 사례 04 손계산
- [ ] 표어·plan 기록 결정
- [ ] 배포(Vercel·Supabase 가입, 비밀값) — 4주차 사용자 테스트 전
- [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

## 다음 LLM이 확인할 내용
- 시작 전 `git pull`, `git status`, `git log -3`, 위 테스트 3개를 직접 실행해 이 문서와 일치하는지 확인

## 주의사항 / 미해결 이슈
- 줄바꿈이 섞여 있음(CRLF 49, LF 17, 혼합 1). 관계없는 파일의 줄바꿈만 바뀐 diff를 만들지 않는다.
