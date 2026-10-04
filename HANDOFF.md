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
- 작업: **비교 배너 톤과 실습 흐름 다듬기** — 홈 critique 3회차(2026-10-04, 26/40)의 지적 중 사용자가 고른 것. 불일치 배너가 채점처럼 보이지 않게 하고, 예상의 이름이 단계마다 이어지게 하고, 이어서 하기 화면에 맥락을 주고, 휴대폰 단추·판정 뒤 포커스를 고친다 (순환 고리 ②).
- 근거: critique 기록(로컬, git 제외) `.impeccable/critique/2026-10-04T09-12-25Z__web-src-pages-homepage-tsx.md`.
- 사용자 결정(2026-10-04):
  - **불일치 배너: 중립 톤 + 근거 안내.** PR #21에서 승인한 `✕ …계산과 다릅니다`(빨간 채움)를 바꾼다. `틀렸습니다/맞았습니다`처럼 단정하지 않는다는 PR #21 원칙은 그대로다.
  - **이어서 하기: 실습 이름 + 다음 실습.** 판정 여부·결과는 보이지 않는다(기존 약속 유지).
  - 함께 넣을 것: **예상 이름 잇기(F13 포함), 퍼즐 질문 강조, 후속 F12·F14.**
- 브랜치: `codex/home-ux3`(origin/main `397ee0d` 기반), worktree `C:/gov/project/skt aleph/netproof-judge-ux`.
- 설계 승인: 사용자 승인 완료(`37e66cf`).
- 단계: **Codex 구현·테스트 완료 → Claude 리뷰 → 사용자 병합 결정.**
- 다음 차례: **리뷰(Claude).** 병합하지 않는다.
- **판정·엔진은 그대로다.** 배너는 엔진의 `comparison`·`result`만 읽는다. 엔진·서버·API·저장 데이터·cases JSON·expect를 바꾸지 않는다.

## 작업 정의
- 목표:
  1. 예상이 계산과 달라도 "틀렸다"가 아니라 "다르다, 이유를 보자"로 읽힌다. 빨강·초록은 계산 결과(통과/막힘)에만 쓴다.
  2. 학생이 고른 "막힐 것 같다"가 판정기에서 "안 된다(내 예상)"로, 배너에서 "내 예상(막힘)"으로 이어져 같은 것임을 안다.
  3. 작성 중인 학생이 홈에서 어느 실습을 하던 중인지 알고, 다음 실습을 권받는다.
  4. 휴대폰에서 예상 단추가 한 줄·같은 높이로 첫 화면 안에 있고, 판정 뒤 키보드 포커스가 결과로 간다.

### 1) 비교 배너: 중립 톤 + 근거 안내 (사용자 결정)
- 현재: `verdictView.ts` `comparisonBanner`가 `✓ {누구}이 NetProof 계산과 같습니다` / `✕ {누구}이 NetProof 계산과 다릅니다`를 만들고, `.comparison-banner.disagree`는 `--deny` 빨강 채움, `.agree`는 `--pass` 초록이다. 판정기·사례 상세·정책 검증(`ResultPanel` 사용처)에 모두 나온다.
- 바꿀 것(문장은 `comparisonBanner` 한 곳에서만 만든다):
  - 이름: `kind`가 `ai`면 `AI 답`, `self`면 `내 예상`, 그 밖은 `받은 답`.
  - 값: 받은 답 `expected`와 엔진 `result`를 `통과`/`막힘`으로 적는다.
  - 다를 때(`DISAGREE`): `≠ {이름}({받은 값}){와/과} NetProof 계산({계산 값})이 다릅니다`
    - 조사는 괄호 안 값의 받침으로 고른다: `통과` → `와`, `막힘` → `과`. 예: `≠ 내 예상(막힘)과 NetProof 계산(통과)이 다릅니다`, `≠ AI 답(통과)와 NetProof 계산(막힘)이 다릅니다`.
    - 둘째 줄(작게): `아래 경로와 ACL 근거에서 이유를 확인해 보세요.`
  - 같을 때(`AGREE`): `= {이름}({값}){와/과} NetProof 계산이 같습니다`. 둘째 줄 없음.
  - `NO_CLAIM`·`NOT_COMPARABLE`·`INVALID`·`UNSUPPORTED`는 지금처럼 배너 없음.
  - 반환값에 `hint?: string`을 더해 둘째 줄을 함께 넘기고, `ResultPanel`은 그대로 그리기만 한다. `statusLine`은 첫 줄만 쓴다.
- 모양(`styles.css`):
  - 두 경우 모두 바탕 `--surface`, 글자 `--ink`, 테두리 `1px solid var(--line)`. 왼쪽 굵은 선 4px로만 구분: 같음은 `--accent`, 다름은 `--warn`.
  - `✓`·`✕`를 쓰지 않는다. `=`·`≠`는 글자로 둔다(색 아님).
  - `--pass`·`--deny`(초록·빨강)는 배너에 쓰지 않는다. 계산 결과 표시(`.calculated.pass/.deny`, 판정 상자)에는 그대로 남는다.
  - 다크 모드에서 대비 4.5:1 이상.
- 기존 대결 머리(`받은 답 · 안 된다 ≠ NetProof 계산 · 통과`)와 `verdict-line`은 그대로 둔다.

### 2) 예상 이름 잇기 (F13 포함)
- 진입 카드 질문: `entryLesson.task.question` 대신 `entryLesson.guessPrompt`를 보인다. 홈·학습의 예상 질문과 같은 문장이 된다. 불러온 뒤의 실습 안내(`task.question`)는 그대로다.
- 진입 카드 안내 한 줄을 고른 값에 따라 바꾼다(기존 `구성을 불러오면 고른 예상이…` 대체):
  - `통과할 것 같다`: `구성을 불러오면 받은 답이 "된다(내 예상)"로 들어갑니다.`
  - `막힐 것 같다`: `구성을 불러오면 받은 답이 "안 된다(내 예상)"로 들어갑니다.`
  - `예상 없이`: `예상 없이 불러오면 받은 답은 "비교 안 함"입니다.`
- 배너는 1절대로 `내 예상(막힘)`을 쓴다. 판정기 받은 답 라디오(`된다/안 된다`)는 AI 답에도 쓰는 공용이라 바꾸지 않는다.

### 3) 이어서 하기: 실습 이름 + 다음 실습
- App에 `practiceCaseId: string | null` 상태를 둔다. **JudgePage가 명시적으로 알릴 때만** 바뀐다(마운트 effect로 바꾸지 않는다):
  - `startPractice` → 그 caseId (`onPracticeLoaded(caseId)`로 넘긴다. 기존 guess 삭제도 여기서).
  - 실습이 아닌 `load()`(예시·처음 구성·JSON 가져오기·공유 링크) → `null`.
  - 되돌리기 `restore` → `undo.task?.case_id ?? null`.
  - App의 사례 상세 "판정기에서 열기"(`onOpenInJudge`) → `null`.
  - 입력을 직접 고치는 것은 바꾸지 않는다(실습 구성을 고치는 것도 실습의 일부다).
- 홈 이어서 하기 얼굴:
  - `practiceCaseId`가 있으면 h1 위 작은 라벨을 `{주제 이름} 실습에서 시작한 입력`으로 바꾼다(예 `HTTPS와 입력 ACL 실습에서 시작한 입력`). 없으면 지금 라벨 그대로.
  - 요약 줄은 그대로 둔다. 판정 여부·결과는 보이지 않는다.
  - 아래 `새 실습 시작하기` 퍼즐은 **다음 실습**을 쓴다: `practiceCaseId`의 다음 lesson(01 → 02 → 03 → 01). 없으면 01. 제목은 `다음 실습: {주제 이름}`(h2).
  - 퍼즐의 그림도 그 lesson의 경로로 바뀐다.
- 알려진 한계(이번 범위 밖): 홈에 갔다가 판정기로 돌아오면 판정기 안의 실습 안내 패널(`task`)은 지금처럼 사라진다. 따로 설계한다.

### 4) 퍼즐 질문 강조
- `GuessPuzzle`:
  - `먼저 예상해 보세요`는 태그(h2/h3)는 유지하고 모양만 작은 라벨로(13px, `--accent`, 600).
  - 질문(`.home-puzzle-question`)을 주인공으로: 1280에서 20px/600, 720px 이하 17px/600.
  - 단추 아래 작은 한 줄: `고르면 판정기에서 이 구성을 불러와 계산할 수 있습니다.` — 예상 뒤 무슨 일이 일어나는지 알린다.
- 홈 첫 얼굴 히어로 왼쪽: `판정기:` 설명 줄을 지운다. 왼쪽은 라벨·h1·설명 한 줄·`판정기 바로 열기 →`만 남는다.

### 5) 후속 F12·F14
- F12 휴대폰 예상 단추:
  - `.home-guess-actions button`에 `white-space: nowrap`, 좌우 padding 축소(예 `10px 12px`), 두 단추 `flex: 1 1 0; min-width: 0`으로 같은 폭.
  - 완료 기준: 375·320 폭 모두에서 홈·학습 상세의 두 단추가 **한 줄, 같은 높이(44~48px), 나란히**이고, 홈 첫 얼굴에서는 375×812·320×812 모두 두 단추 아래 끝이 812 안.
- F14 판정 뒤 포커스:
  - `judge()`가 끝나면(결과·오류 모두) `#result-title`에 `tabIndex=-1`을 주고 포커스를 옮긴다. 900px 이하에서는 지금의 부드러운 스크롤과 함께, 넓은 화면에서는 `focus({ preventScroll: true })`.
  - 늦게 도착해 버려진 응답(revision 불일치)에서는 옮기지 않는다.

### 6) 범위 밖 · 허용 파일
- 하지 않는 것: 판정 결과 복원·저장, 판정기 실습 안내 패널 유지, 받은 답 라디오 문구 변경, 헤더·표어, 사례 상세·게시판 예시 제목, F5·F6, PR #20 수동 QA, 엔진·서버·API·DB·cases JSON·expect, 새 의존성.
- 허용 파일:
  - 수정: `web/src/verdictView.ts`·`verdictView.test.ts`, `web/src/components/ResultPanel.tsx`(배너 둘째 줄 그리기만), `web/src/components/GuessPuzzle.tsx`·test, `web/src/pages/{HomePage,JudgePage}.tsx`와 각 test, `web/src/App.tsx`(practiceCaseId 상태·콜백 연결만), `web/src/learning.ts`·test(다음 lesson 함수가 필요하면), `web/src/styles.css`(배너·home·guess·practice-entry 국소 규칙만)
  - 기록: `HANDOFF.md`, `decisions/ai-work-log.md`
- 읽기만: `engine/`·`server/`, `types.ts`·`draft.ts`·`practice.ts`·`share.ts`, `FlowForm.tsx`, 사례·매트릭스 페이지(배너 변경이 그대로 나타나는지 브라우저로만 확인), `cases/*.json`(테스트 import만).
- 다음을 바꾸고 싶으면 **먼저 요청한다**: 배너 두 문장과 둘째 줄, `=`/`≠` 표기, 왼쪽 선 색, 진입 카드 안내 세 문장, 이어서 하기 라벨 문장, 퍼즐 단추 아래 한 줄.

### 7) 위험
- **배너가 판정을 다시 계산함** → `comparisonBanner`는 엔진 `comparison`이 AGREE/DISAGREE일 때만 문장을 만들고, 값은 `claim.expected`와 엔진 `result`를 그대로 옮긴다. 비교 연산을 새로 하지 않는다. 테스트로 `comparison`과 문장이 어긋나는 입력(예: expected=PASS, result=PASS, comparison=DISAGREE)에서도 엔진 값을 따름을 고정한다.
- **조사 틀림** → `통과`/`막힘` 두 값뿐이라 표로 고정하고 네 조합을 테스트한다.
- **사례 상세·정책 검증 배너 회귀** → 두 화면을 브라우저로 확인한다(문장·색).
- **실습 맥락이 엉뚱하게 남음** → 알림 지점 네 곳을 명시하고, 예시 불러오기·사례 열기 뒤 홈 라벨이 기본으로 돌아오는지 확인한다.
- **포커스 이동이 넓은 화면에서 화면을 튀게 함** → `preventScroll`.

### 8) 완료 조건 · 테스트
- 자동 테스트:
  - `verdictView.test.ts`: DISAGREE/AGREE × kind(ai/self/없음) × 값(통과/막힘) 문장과 조사, `hint`는 DISAGREE만, `✓`·`✕` 없음, NO_CLAIM·NOT_COMPARABLE·INVALID·UNSUPPORTED 배너 없음, 엔진 comparison을 따르는지(위 위험 항목), `statusLine`은 첫 줄만.
  - `GuessPuzzle.test.tsx`: 단추 아래 안내 한 줄, 질문 클래스, 기존 group·heading 검사 유지.
  - `HomePage.test.tsx`: 첫 얼굴에 `판정기:` 줄 없음. 이어서 하기 얼굴에서 `practiceCaseId` 있음 → 라벨 `… 실습에서 시작한 입력`·퍼즐 `다음 실습: …`(01→02, 03→01), 없음 → 기본 라벨·01.
  - `JudgePage.test.tsx`: 진입 카드 질문이 `guessPrompt`, 안내 문장 세 가지가 선택값에 따라 바뀜(순수 함수로 분리해 검사 가능), 기존 결론 문구 미노출·라디오 입력 불변 유지.
- 네 명령의 실제 출력 전체를 이 문서에 붙인다:
  ```text
  cd engine && ../.venv/Scripts/python -m pytest -q
  cd server && ../.venv/Scripts/python -m pytest -q
  npm --prefix web test
  npm --prefix web run build
  ```
- 브라우저 확인(375×812·1280×800 × 라이트·다크, 320×812, 임시 SQLite·합성 데이터만):
  - 학습 01 `통과할 것 같다` → 진입 카드 안내 `"된다(내 예상)"` → 불러오기 → 판정 → 배너 `≠ 내 예상(통과)와 NetProof 계산(막힘)이 다릅니다`(엔진 결과에 따라 문장 확인) + 둘째 줄, 빨강 채움 없음.
  - 같은 경우(AGREE)도 한 번: `= …같습니다`, 초록 채움 없음.
  - 사례 상세(AI 답 사례)와 정책 검증 화면에서 배너 문장·모양 회귀 확인.
  - 실습 02 불러오기 후 홈 → 라벨 `왕복 경로 실습에서 시작한 입력`, 퍼즐 `다음 실습: 출력 ACL`. 그 뒤 판정기에서 예시 불러오기 → 홈 라벨 기본, 퍼즐 01.
  - 375·320 홈·학습 상세 예상 단추 한 줄·같은 높이·아래 끝 위치 기록.
  - 판정하기(단추·Ctrl+Enter) 뒤 `document.activeElement`가 `#result-title`인지, 1280에서 화면이 튀지 않는지.
  - 대비 4.5:1(배너 라이트·다크), console error 0, 가로 넘침 없음.
- 리뷰 때 Claude가 홈 `/impeccable critique`를 다시 돌려 26/40과 비교한다.
- 작업 로그 한 줄, 다음 차례를 리뷰(Claude)로 바꿔 커밋·푸시하고 PR을 연다. 병합하지 않는다.

## 완료 내용 / 테스트 결과 (2026-10-04 Codex)
- 사용자 승인 `37e66cf` 기준 "작업 정의" 1)~8)만 구현했다. 허용 코드 13파일 + 기록 2파일. 엔진·서버·API·cases JSON·expect·의존성·FlowForm·사례/매트릭스 페이지는 변경하지 않았다.
- 배너: 엔진 `comparison`만 AGREE/DISAGREE 표시를 정하고, `claim.expected`·엔진 `result`를 통과/막힘으로 옮겼다. `=`/`≠`·조사·둘째 줄을 한 빌더에서 제공하며 statusLine은 첫 줄만 읽는다. 바탕/글자는 surface/ink, 왼쪽 선만 accent/warn이다. 비교를 다시 계산하거나 맞음/틀림을 선언하지 않는다.
- 진입: 세 실습의 guessPrompt와 선택값별 승인 문장 사용. 예상은 직접 불러올 때만 `kind: "self"` 받은 답에 들어간다. 홈/학습/주소 진입·라디오만으로 Draft를 고치지 않는다.
- 이어서 하기: App practiceCaseId는 실습 불러오기, 일반 load, 되돌리기, 사례→판정기 콜백에서만 갱신한다. 직접 편집/화면 왕복에는 유지하며 다음 주제를 01→02→03→01로 연결한다. 결과/판정 상태는 복원·표시하지 않는다. 기존 판정기 과제 안내 패널의 화면 왕복 소실은 범위 밖으로 유지했다.
- 질문 20px(휴대폰 17px)/600, 퍼즐 제목 13px accent/600, 단추 아래 승인 안내. 예상 단추는 nowrap·같은 높이·나란히 배치. 로그인 320 첫 화면에서 하단818.48px로 넘는 것을 발견해 허용된 홈 hero 간격만 18→8px로 줄였다(최종808.48px).
- 판정 완료/오류 finally 공용 경로에서 결과 제목을 tabIndex=-1로 focus(preventScroll). 휴대폰 smooth scroll 병행, 넓은 화면은 focus만. revision 불일치/예약 뒤 불러오기/언마운트에는 이동하지 않는다.
- 웹 테스트 16개 추가(290→306): 비교×종류×값/엔진과 일부러 어긋난 조합, hint/statusLine, 질문/안내, 맥락/순환, 포커스·예약 취소·제목 없음. 기존 입력 불변/정답 미노출/그룹·제목 단계 검사를 유지했다.
- 아래 네 명령을 최종 코드에서 직접 실행했다. 모두 exit 0. engine의 기존 strict xfail 2건, server의 PostgreSQL 실연결 skip 1건은 유지한다. 서버 테스트는 NETPROOF_TEST_DATABASE_URL을 제거해 임시 SQLite만 사용했다.

### cd engine && ../.venv/Scripts/python -m pytest -q
```text
........................................................................ [ 21%]
........................................................................ [ 43%]
........................................................................ [ 65%]
........................................................................ [ 87%]
......................................xx                                 [100%]
326 passed, 2 xfailed in 4.39s
```

### cd server && ../.venv/Scripts/python -m pytest -q
```text
.......................................................................s [ 78%]
....................                                                     [100%]
91 passed, 1 skipped in 30.94s
```

### npm --prefix web test
```text

> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/gov/project/skt aleph/netproof-judge-ux/web


 Test Files  23 passed (23)
      Tests  306 passed (306)
   Start at  18:48:38
   Duration  634ms (transform 66%, import 21%, tests 9%, worker 4%)

  Transform  transforming modules took 3.41s · 66% of tracked time, re-done on every run
             persist transforms across runs with fsModuleCache: true
             learn more: https://vitest.dev/guide/improving-performance#caching-between-reruns
```

### npm --prefix web run build
```text

> netproof-web@0.1.0 build
> tsc --noEmit && vite build

vite v8.3.1 building client environment for production...
transforming...
✓ 54 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                            0.62 kB │ gzip:   0.45 kB
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
dist/assets/index-CThyBs7X.css                            78.95 kB │ gzip:  22.20 kB
dist/assets/index-B1q0oKJb.js                            335.34 kB │ gzip: 101.23 kB

✓ built in 363ms
```

### 브라우저 확인 — 임시 SQLite · 합성 데이터만
- 환경: Codex in-app Chromium, 프로덕션 web/dist, localhost:5187의 별도 임시 SQLite. 합성 계정·합성 AI 답 사례 1건을 기존 UI/API로 만들었고 실제 DB/계정/네트워크는 사용하지 않았다. computer-use 스킬에 따라 실제 UI 조작·DOM 측정·스크린샷으로 확인했다.
- 375×812·1280×800 × 라이트/다크: 공개 홈, 학습 01→예상→진입→직접 불러오기→판정 흐름 확인. 320×812도 라이트/다크 확인. 세 학습 상세는 세 크기 × 두 테마 총18조합에서 예상 단추가 한 줄/같은 높이, 가로 넘침 없음.
- 01 통과 예상: 같은 HTTPS(TCP443) 질문→`구성을 불러오면 받은 답이 "된다(내 예상)"로 들어갑니다.`→불러오기→엔진 DENY/DISAGREE→`≠ 내 예상(통과)와 NetProof 계산(막힘)이 다릅니다` + 승인 둘째 줄. surface 바탕/warn 왼쪽 선, 빨강 채움 없음.
- 01 막힘 예상: 안내 `"안 된다(내 예상)"`→엔진 DENY/AGREE→`= 내 예상(막힘)과 NetProof 계산이 같습니다`, 둘째 줄 없음. 두 테마 모두 surface 바탕/accent 왼쪽 선, 초록 채움 없음. 예상 없이 안내도 승인된 `"비교 안 함"` 문장 확인.
- 기존 목적지 포트8443에서 학습→예상→라디오 변경 뒤에도8443, 직접 구성 불러오기 클릭 후443이 되었다. self 종류도 확인. 첫 진입은 기존 장비/ACL/받은 답을 유지했고 계산 요청/결과를 만들지 않았다.
- 실습02 불러오기 후 홈: `왕복 경로 실습에서 시작한 입력`·ICMP 요약·`다음 실습: 출력 ACL`. 예시01 불러오기 후 홈: 기본 라벨·`다음 실습: HTTPS와 입력 ACL`. 실습03→예시01→되돌리기→홈: `출력 ACL 실습에서 시작한 입력`·TCP22·내 예상 막힘·다음01. 사례의 판정기에서 열기 뒤에도 기본 라벨/01.
- 사례 상세 AI 답: `≠ AI 답(통과)와 NetProof 계산(막힘)이 다릅니다` + 둘째 줄. 정책 검증 TCP443 의도PASS/엔진DENY: `≠ 받은 답(통과)와 NetProof 계산(막힘)이 다릅니다` + 둘째 줄. **두 화면 모두375/1280 × 라이트/다크 네 조합**에서 문장·중립 바탕·왼쪽 warn 선·페이지 넘침 없음. 매트릭스의 원래 내부 가로 스크롤은 유지한다. QA 의도는 UI의 의도 없음으로 되돌렸다.
- 최종 홈 단추 측정(두 테마 동일, 두 단추 모두 높이44.796875px/같은 y):
  - 비로그인375: y641.859375·하단686.65625·폭143px.
  - 비로그인320: y680.59375·하단725.390625·폭115.5px.
  - 로그인375: y671.109375·하단715.90625·폭143px.
  - 로그인320(합성 긴 닉네임): y763.6875·하단808.484375·폭115.5px. 계정 조회 완료 뒤 측정했다.
  - 1280: y370.46875·하단415.265625, 질문20px.
- 학습 상세(로그인, 두 테마 동일):375 하단01=632.578125/02=635.875/03=655.828125px,320 하단01=782.71875/02=716.0625/03=726.71875px. 모두 나란히/44.796875px, 각 화면 높이812px 안이다. 비로그인01 하단375=603.328125/320=699.625px도 확인했다.
- 포커스:375 단추 및 Ctrl+Enter 뒤 activeElement.id=`result-title`.1280 Ctrl+Enter 뒤 동일, 최종 scrollY334→334(화면 튐 없음). 오류/폐기 응답 예약 분기는 공용 finally/순수 포커스 테스트로 확인했고 실제 통신 오류를 브라우저에 주입하지는 않았다.
- 배너 글자/바탕 측정: 라이트 rgb(29,34,32)/rgb(255,255,255)=**16.13:1**, 다크 rgb(230,235,232)/rgb(28,33,31)=**13.53:1**(WCAG 상대 휘도 식). 둘째 줄도 같은 ink를 쓴다.
- 콘솔 error0, 확인한 화면 조합 모두 documentElement.scrollWidth≤innerWidth. 실제 장비·물리폰·실제 스크린리더·200% 확대·PostgreSQL 실연결·지연 응답 브라우저 주입은 미검증이며 PASS로 적지 않는다.
- 캡처(로컬, git 제외): `C:/Users/dora2/.codex/visualizations/home-ux-2026-10-04/ux3-final-home-375-light.png`, `ux3-final-home-320-account-light.png`, `ux3-final-banner-375-light.png`, `ux3-case-{375,1280}-{light,dark}.png`, `ux3-matrix-{375,1280}-{light,dark}.png`.
- 정리: 임시 서버5187 listen 없음 확인, 테스트 DB `netproof-home-ux-pcl_h34m/qa.db`와 빈 임시 폴더만 삭제(합성 데이터 복구용 백업 없음). 생성한 QA 탭 닫기, viewport reset, 테마 기기 설정으로 복원했다. 캡처/명령 출력은 DB와 별도로 보존했다.
- 다음 차례 **리뷰(Claude)**: 승인37e66cf·작업 정의1)~8)/diff/출력을 독립 확인하고 홈 critique26/40과 비교한다. F5·F6 및 PR20 사용자 G2·실제 삭제 취소 수동 확인 대기는 그대로다. 병합하지 않았다.

Codex (GPT-5)

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
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
- [ ] Cisco 설정 붙여넣기 ①`interface`/`ip address` ②`ip route` — ① **보류: 수업 ACL이 Cisco인지 확인(사람 트랙) 뒤 착수**

**3주차 (10-12~10-18, 해커톤 1차 주말 — 가볍게)**
- [x] 실제 결과 붙여넣기(ping·Nmap 출력 → 실제 결과 입력 후보) — ④ (PR #16 병합 완료, `309238d`)
- [x] 오탐·미탐 대시보드 — ⑤ (PR #17 병합 완료, `6c7c9b1`)
- [x] ACL 점검(가려진 규칙·중복·열린 범위) — ③ (PR #18 병합 완료, `c19f554`)
- [x] 판정기 화면 개선(critique 23/40 우선 문제 5개) — ② **PR #21 병합 완료 `388a9cf`**, F5·F6 비차단 후속 유지
- [ ] Cisco 설정 붙여넣기 ③`access-list`/`ip access-group`
- [ ] **배포**(사람 트랙과 함께) — 4주차 테스트 전에 공개 URL

**4주차 (10-19~10-25) — 사용자 테스트 주간, 기능은 병행**
- [x] 수정 후보 제안("무엇을 바꾸면 통하나") — ② **PR #19 병합 완료, 8be25a8**
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

- [x] **홈·학습실·헤더 MVP(2026-10-04 추가)** — ①② PR #23 병합(`82975e6`).
- [x] **홈·학습실 개선(critique 27/40, 아이디어 A~D)** — ①② PR #24 병합(`b8bb8e8`).
- [x] **홈·학습 2차(계산 범위 띠·퍼즐 주 행동·실습마다 예상·진입 카드 예상 바꾸기)** — ①② PR #25 병합(`397ee0d`).
- [ ] **비교 배너 톤·실습 흐름 다듬기(중립 배너, 예상 이름 잇기, 이어서 하기 맥락, F12·F14)** — ② **구현·테스트 완료, 리뷰(Claude) 대기 — 브랜치 codex/home-ux3**
- [x] **사례 게시판 학습형 UI 1차(2026-10-03 추가)** — ①②④ PR #20 사용자 지시로 병합(`c2a998d`). **사용자 G2/삭제 취소 수동 QA는 별도 대기 유지.**

## 다음 LLM이 확인할 내용
- **Claude(리뷰):** `codex/home-ux3`에서 `git pull`, `AGENTS.md`와 이 문서를 읽고 승인37e66cf・"작업 정의"1)~8)・PR diff・네 명령 출력을 독립 확인한다. 홈 critique26/40과 다시 비교한다.
- 배너는 엔진 `comparison`·`result`만 옮겨 적는다. 화면이 비교를 다시 계산하면 설계 위반이다(ADR-001). `틀렸습니다/맞았습니다` 같은 단정은 쓰지 않는다.
- 예상은 학생이 고른 받은 답(`kind: "self"`)이다. 진입·주소·라디오만으로 입력을 바꾸지 않는다. cases JSON은 테스트에서만 import한다.
- 다음 우선 확인은 아래 **사용자 수동 QA**다. 미확인을 PASS로 적지 않는다. 코드·배포·병합은 자동 진행하지 않는다.
- 판정기 규칙(되돌리기 한 단계, 즉시 검사가 판정을 막지 않음, ACL 점검 펼침 조건)을 바꾸고 싶으면 먼저 요청한다. 배너 문장은 이번 1절이 새 기준이다.

## 사용자 수동 QA 대기 (PR #20 G2·삭제 취소)
- **환경:** 병합된 main 빌드, 새 임시 SQLite·합성 계정/사례만 사용한다. 기존/운영 DB의 실제 사례를 삭제 시험에 쓰지 않는다. 실제 기본 확인창을 대체하거나 우회하지 않는다.
- **G2 화면 확인:** 375×812·1280×800에서 라이트/다크로 목록의 필터 접기·적용 조건·검색/초기화, 사례 상세의 구성 원문·받은 답·NetProof 계산 구분을 사람이 확인한다. 초기 코드 QA와 별도의 사용자 확인이다.
- **삭제 취소:** 합성 사례 상세에서 삭제를 누르고 실제 브라우저 확인창의 **취소**를 클릭한다. 같은 상세 URL에 머물고 새로고침 후 사례가 남는지 확인한다. 가능하면 Network에서 DELETE 요청이 없었는지도 기록한다. confirm=false 대체 검사 결과를 이 확인으로 쓰지 않는다.
- **기록:** 실행 날짜·브라우저/버전·확인한 화면 조합·취소 후 URL/사례 존재·문제 재현 순서. 계정 비밀번호·쿠키·토큰은 문서/캡처에 포함하지 않는다. 확인한 항목만 완료로 바꾼다.
- **F5·F6:** 이번에는 코드 그대로. 빈 템플릿 알림과 조사 표기는 후속 설계/수정 승인 시 별도 처리한다.

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
- **표시 ≠ 판정.** 판정기 개선은 엔진이 준 `result`·`comparison`·`problems`를 보여 주는 방식만 바꾼다.
- [HOME_HANDOFF.md](HOME_HANDOFF.md)는 2026-10-02 집 인계 시점 기록이다. 현재 상태는 이 문서가 기준이다.

현재 비교 배너·실습 흐름 설계: Claude (Claude Opus 5.5).
