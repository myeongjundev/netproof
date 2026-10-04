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
- 작업: **후속 정리와 수동 QA 준비** — PR #26 리뷰의 후속 F15~F17을 고치고, 오래 대기 중인 PR #20 사용자 수동 QA(G2 화면 확인·삭제 취소)를 사람이 명령 하나로 바로 할 수 있게 QA 준비 도구와 체크리스트를 만든다.
- 사용자 결정(2026-10-04):
  - **수동 QA: QA 준비 도구 + 체크리스트.** 클릭과 판단은 사람이 한다. 도구는 임시 DB·합성 계정·합성 사례·로컬 서버만 준비한다. PR #20 항목에 최근 홈·실습 흐름을 더한다.
  - **F17: 학습 상세의 개념 질문은 부제로.** 질문 문장은 예상 질문 하나만 남긴다.
- 브랜치: `codex/followup-qa`(origin/main `11c6ac2` 기반), worktree `C:/gov/project/skt aleph/netproof-judge-ux`.
- 설계 승인: **사용자 승인 완료(`231b943`).**
- 단계: **Codex 구현·자동 테스트 및 도구 실행 확인 → Claude 리뷰 → 사용자 병합 → 사용자 수동 QA.** reduced-motion 브라우저 에뮬레이션은 도구 지원 부재로 미확인(아래 기록).
- 다음 차례: **리뷰(Claude).** 수동 QA A·B·C는 사람이 확인하기 전까지 대기다.
- **판정·엔진은 그대로다.** 엔진·서버 API·저장 데이터·cases JSON·expect를 바꾸지 않는다. QA 도구는 로컬 전용 개발 도구이며 배포물(`api/`, `vercel.json`, 서버 앱)에 연결하지 않는다.

## 작업 정의
### 1) F15 — 구성 불러오기 뒤 포커스
- 현재: 진입 카드의 `구성 불러오기`를 누르면 카드가 사라지면서 포커스가 `body`로 떨어진다.
- 바꿀 것: `startPractice`가 끝난 뒤(진입 카드에서 눌렀을 때와 페이지 안 `실습 · … · 시작` 단추 모두) 실습 안내 패널 제목 `#practice-title`에 `tabIndex=-1`을 주고 포커스를 옮긴다. 휴대폰(900px 이하)은 그 제목이 보이게 스크롤한다(3절 규칙 적용), 넓은 화면은 `preventScroll`.
- 늦게 바뀐 화면(이미 다른 입력을 불러옴)에서는 옮기지 않는다. 기존 `focusJudgeResult`와 같은 방식(현재 여부 확인 함수)으로 만든다.

### 2) F17 — 학습 상세 질문 하나로, 실습 안내 문구
- 학습 상세(`LearningPage`):
  - 지금 h1 아래 `learning-question`(`task.question`)을 질문이 아닌 **부제 한 줄**로 바꾼다: `이 실습에서 볼 것: {focus}`.
  - `learning.ts` lesson에 `focus`(화면 표시 전용, 정답 없음)를 더한다:
    - synthetic-01: `입력 ACL이 HTTPS 통신에 어떻게 적용되는지`
    - synthetic-02: `가는 길과 돌아오는 길이 모두 있는지`
    - synthetic-03: `출력 ACL이 나가는 패킷에 어떻게 적용되는지`
  - 질문 문장은 예상 블록의 `guessPrompt` 하나만 남는다. `PRACTICE.question`·판정기 실습 안내 패널은 그대로다.
- 판정기 실습 안내 패널의 `정답은 들어 있지 않습니다. 직접 판정하고, 받은 답이나 내 예상을 적어 비교하세요.`를 상태에 맞춘다:
  - 받은 답이 있으면: `정답은 들어 있지 않습니다. 판정하면 받은 답과 NetProof 계산을 비교합니다.`
  - 없으면: 지금 문장 그대로.

### 3) F16 — 움직임 줄이기
- `scrollIntoView({ behavior: "smooth" })` 세 곳(`JudgePage.tsx` 결과·ACL 줄 보기, `PolicyMatrixPage.tsx` 상세)을 공용 함수 하나로 바꾼다: `prefers-reduced-motion: reduce`면 `behavior: "auto"`, 아니면 `"smooth"`.
- 위치: 새 파일 `web/src/motion.ts`(함수 하나, 테스트 `motion.test.ts`).

### 4) QA 준비 도구 (사용자 결정)
- 새 파일 `scripts/qa_local.py`. 실행: `.venv/Scripts/python scripts/qa_local.py` (저장소 루트에서).
- 하는 일:
  1. `web/dist/index.html`이 없으면 `npm --prefix web run build`를 먼저 하라고 알리고 끝낸다(직접 빌드하지 않는다).
  2. 운영체제 임시 폴더에 새 폴더를 만들고 그 안의 새 SQLite 파일로 `create_app(overrides={"SQLALCHEMY_DATABASE_URI": ...})`을 만든다. **환경 변수 `DATABASE_URL`은 무시한다**(실제 DB에 닿지 않게). `NETPROOF_SECURE_COOKIES`는 끈다.
  3. 앱의 test client로 합성 계정 두 개(`qa_author`, `qa_reviewer`)를 가입시키고 `qa_reviewer`를 검토자로 바꾼다(기존 `make-reviewer`와 같은 모델 변경). 비밀번호는 `secrets.token_urlsafe`로 매번 새로 만든다.
  4. 합성 사례 4건을 `qa_author`로 만든다(예시 구성 사용): AI 답 있음+실제 결과+검토 확인 1건, 받은 답 없음 1건, 내 예상+실제 결과 1건, 아주 긴 제목 1건. 제목 앞에 `QA`를 붙인다.
  5. `127.0.0.1`에서만 서버를 연다(기본 포트 4860, `--port`로 바꿀 수 있음). 외부 주소로 열지 않는다.
  6. 콘솔에 접속 주소, 두 계정 닉네임·비밀번호, 체크리스트 경로를 출력한다. **비밀번호는 콘솔에만** 출력하고 파일·저장소·로그에 쓰지 않는다.
  7. 종료(Ctrl+C) 때 임시 폴더를 지운다.
- 저장소에 DB·비밀번호·캡처를 남기지 않는다. `.gitignore` 변경이 필요 없게 임시 폴더만 쓴다.
- 테스트 `server/tests/test_qa_local.py`: 시드 함수가 새 임시 DB에만 쓰고(`DATABASE_URL`을 가짜 값으로 설정해도 무시), 계정 2·검토자 1·사례 4가 생기고, 서버 실행 없이 함수만 검사한다. 스크립트는 `importlib`로 경로를 지정해 불러온다.

### 5) 수동 QA 체크리스트 (사용자 결정)
- 새 파일 `docs/qa-manual.md` 한 장. 사람이 위에서부터 따라 하며 칸에 표시하는 형식이다.
  - 준비: 빌드 → `scripts/qa_local.py` 실행 → 브라우저 주소. 화면 크기 375×812·1280×800, 라이트·다크.
  - **A. PR #20 G2 화면 확인**: 사례 게시판 목록(필터 접기·적용 조건·검색·초기화), 사례 상세(구성 원문·받은 답·NetProof 계산 구분).
  - **B. 삭제 취소(실제 기본 확인창)**: 합성 사례 상세 → 삭제 → 브라우저 확인창 **취소** → 같은 주소에 머무는지, 새로고침 뒤 사례가 남는지, 가능하면 개발자 도구 Network에 DELETE가 없는지. confirm 대체 검사로 대신하지 않는다.
  - **C. 홈·실습 흐름(PR #23~#26)**: 첫 진입 홈 → 예상 고르기 → 진입 카드 라디오 → 구성 불러오기(포커스 위치) → 판정 → 배너 문장 → 홈 이어서 하기 라벨·다음 실습 → 학습 상세 부제.
  - **D. 기록 칸**: 날짜, 브라우저와 버전, 확인한 조합, 통과/문제, 문제 재현 순서. 비밀번호·쿠키·토큰을 적지 않는다.
  - 마지막에 "결과는 PR 코멘트나 HANDOFF '사용자 수동 QA' 절에 사람이 적는다. AI가 대신 완료로 바꾸지 않는다."
- HANDOFF의 `사용자 수동 QA 대기` 절은 이 체크리스트를 가리키게 줄인다.

### 6) 범위 밖 · 허용 파일
- 하지 않는 것: QA를 자동으로 통과 처리, 브라우저 자동 클릭, 확인창 대체·우회, F5·F6, 배너 아래 대결 머리 정리, 진입 카드 그림·예상 칩, 엔진·서버 API·DB 스키마·cases JSON·expect, 배포 설정, 새 의존성.
- 허용 파일:
  - 신규: `scripts/qa_local.py`, `server/tests/test_qa_local.py`, `docs/qa-manual.md`, `web/src/motion.ts`, `web/src/motion.test.ts`
  - 수정: `web/src/pages/{JudgePage,LearningPage,PolicyMatrixPage}.tsx`와 JudgePage·LearningPage test, `web/src/learning.ts`·test, `web/src/styles.css`(학습 부제 한 줄만 필요하면)
  - 기록: `HANDOFF.md`, `decisions/ai-work-log.md`
- 읽기만: `engine/`, `server/netproof_api/`(QA 도구는 `create_app`·모델을 불러 쓰기만), `api/`, `vercel.json`, 결과·편집기 컴포넌트, `cases/*.json`.
- 다음을 바꾸고 싶으면 **먼저 요청한다**: `focus` 세 문장, 실습 안내 문구, QA 도구가 만드는 계정·사례 구성, 체크리스트 항목.

### 7) 위험
- **QA 도구가 실제 DB를 건드림** → `DATABASE_URL` 무시·임시 폴더 강제, 테스트로 고정.
- **QA 도구가 외부에 열림** → `127.0.0.1` 고정.
- **비밀번호가 남음** → 콘솔 출력만, 파일·저장소 기록 금지, 종료 때 임시 폴더 삭제.
- **사람 확인을 AI가 대신 완료 처리** → 체크리스트와 HANDOFF에 "사람이 적는다"를 명시. Codex·Claude는 QA 결과를 만들지 않는다.
- **포커스 이동이 넓은 화면을 튀게 함** → `preventScroll`.

### 8) 완료 조건 · 테스트
- 자동 테스트: `motion.test.ts`(reduce면 auto), JudgePage(불러오기 뒤 포커스 함수, 실습 안내 문구 두 경우), LearningPage(부제 `이 실습에서 볼 것:`·질문은 guessPrompt 하나), `learning.test.ts`(`focus` 세 개), `test_qa_local.py`(위 4절).
- 네 명령의 실제 출력 전체를 이 문서에 붙인다:
  ```text
  cd engine && ../.venv/Scripts/python -m pytest -q
  cd server && ../.venv/Scripts/python -m pytest -q
  npm --prefix web test
  npm --prefix web run build
  ```
- QA 도구 실제 실행 확인: 실행 → 주소 접속 → 두 계정 로그인 가능 → 사례 4건 보임 → 종료 뒤 임시 폴더 없음. **비밀번호는 기록하지 않는다.** 이 확인은 도구 동작 확인이며 사용자 수동 QA(A·B)를 대신하지 않는다.
- 브라우저 확인(375·1280): 구성 불러오기 뒤 `activeElement`가 `#practice-title`, 학습 상세 부제, reduced-motion 에뮬레이션에서 스크롤이 즉시 이동.
- 작업 로그 한 줄, 다음 차례를 리뷰(Claude)로 바꿔 커밋·푸시하고 PR을 연다. 병합하지 않는다.

## 완료 내용 / 테스트 결과 (2026-10-04 Codex)

- 승인 `231b943`의 작업 정의 1)~8)만 구현. F15 진입 카드·내부 실습 시작 후 실습 제목 포커스(늦은 예약 폐기), F16 공용 reduced-motion 스크롤, F17 부제 세 문장·받은 답 상태별 안내 문구.
- QA 준비: 항상 새 OS 임시 SQLite, DATABASE_URL·PostgreSQL engine options 무시, SECURE_COOKIES=False, 127.0.0.1 고정, debug/reloader 없음. 두 계정·합성 사례 4건은 기존 API로 생성하고 판정은 기존 엔진에 맡김. 배포 앱·설정과 연결하지 않음.
- 자동 회귀: 웹 10건·QA 도구 10건 추가. 원래 테스트/엔진/서버 앱/cases JSON/expect/의존성 불변. `git diff --check` 오류 없음.
- **사용자 수동 QA A·B·C는 대기 유지.** AI는 목록 필터 G2·삭제 기본 확인창 취소를 수행하거나 통과로 표시하지 않았음. computer-use는 아래 F15/F17 구현 화면 확인에만 사용.

### QA 도구 실제 실행 (비밀번호 제외)

- 명령: `.venv/Scripts/python scripts/qa_local.py --port 4860`.
- 저장소 밖 검증 프로세스가 자식 콘솔의 비밀번호를 메모리에서만 받아 두 계정의 loopback 로그인에 사용. 비밀번호 줄·쿠키·CSRF·응답 본문은 출력·파일·저장소·캡처에 남기지 않음. 아래에는 비밀값 없는 상태 출력만 기록.
- 가짜 PostgreSQL DATABASE_URL을 설정한 상태에서 실행. HTTP 접속·두 계정 로그인·사례 네 건 조회만 확인(수동 QA 아님). 실제 CLI 정상 종료·임시 폴더 삭제·포트 listen 없음 확인. Windows Ctrl+Break와 Ctrl+C는 같은 정리 경로이며, 단위 테스트에서 KeyboardInterrupt 정리도 확인.

```text
GET /: 200
qa_author: login 200, role=user
qa_author: cases=4, QA prefix=True
qa_reviewer: login 200, role=reviewer
qa_reviewer: cases=4, QA prefix=True
DATABASE_URL fake PostgreSQL ignored; temporary SQLite exists=True
Credentials: console pipe/RAM only; omitted from this verification output.
READY FOR UI CHECKS; manual A/B remain pending.
Exit code=0; temporary directory removed=True
QA listen count after shutdown: 0
```

### 브라우저 확인 — 구현 변경만 (375×812·1280×800)

- Codex in-app browser, `http://127.0.0.1:4860/`, 라이트. A·B 체크리스트 미실행, 기본 확인창 대체/우회 없음.
- 375: 학습01 부제 `이 실습에서 볼 것: 입력 ACL이 HTTPS 통신에 어떻게 적용되는지` 표시, 예상 질문 하나. 예상 선택→진입 카드→구성 불러오기 후 `document.activeElement.id=practice-title`. 제목으로 스크롤하여 보임. 페이지 내부 `실습 · 왕복 경로 · 시작`도 activeElement=practice-title.
- 1280: 동일 부제·질문 하나. 예상 없이 진입→직접 불러오기 후 activeElement=practice-title, scrollY 불러오기 전후 0→0(넓은 화면 preventScroll). 페이지 내부 `실습 · 출력 ACL · 시작`도 activeElement=practice-title, scrollY=0. 받은 답 있음/없음 두 안내 문구 확인.
- **reduced-motion 에뮬레이션 브라우저 검증 미확인:** 현재 브라우저가 제공하는 capability는 visibility·viewport뿐이며 탭도 pageAssets·webmcp만 제공. 미디어 에뮬레이션 API 없음. 실제 matchMedia(reduce)=false를 확인했으므로 즉시 스크롤 PASS로 주장하지 않음. 단위 테스트는 reduce=true→auto, false→smooth 및 ACL center 보존을 확인. Claude 리뷰에서 지원되는 브라우저로 에뮬레이션 재확인이 필요함.
- 캡처는 저장소 밖 `C:/Users/dora2/.codex/visualizations/followup-qa-2026-10-04/`의 learning-375/1280·practice-focus-375/1280.png. 비밀번호 화면 캡처 없음. 검증 탭 닫음·viewport reset, QA 서버 종료·임시 DB 삭제(재실행하면 새 합성 데이터가 생김).

### 네 명령의 실제 전체 출력

서버 명령은 실행 전 `NETPROOF_TEST_DATABASE_URL`을 프로세스 환경에서 제거해 기존 PostgreSQL 테스트 DB를 건드리지 않음. 모든 exit code 0. skip/xfail은 기존 항목이며 이번에 통과로 바꾸지 않음.

### cd engine && ../.venv/Scripts/python -m pytest -q

```text
........................................................................ [ 21%]
........................................................................ [ 43%]
........................................................................ [ 65%]
........................................................................ [ 87%]
......................................xx                                 [100%]
326 passed, 2 xfailed in 6.00s
```

### cd server && ../.venv/Scripts/python -m pytest -q

```text
.......................................................................s [ 70%]
..............................                                           [100%]
101 passed, 1 skipped in 19.19s
```

### npm --prefix web test

```text

> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/gov/project/skt aleph/netproof-judge-ux/web


 Test Files  24 passed (24)
      Tests  316 passed (316)
   Start at  19:52:15
   Duration  1.12s (transform 53%, import 28%, worker 13%, tests 6%)

  Transform  transforming modules took 4.54s · 53% of tracked time, re-done on every run
             persist transforms across runs with fsModuleCache: true
             learn more: https://vitest.dev/guide/improving-performance#caching-between-reruns
```

### npm --prefix web run build

```text

> netproof-web@0.1.0 build
> tsc --noEmit && vite build

vite v8.3.1 building client environment for production...
transforming...
✓ 55 modules transformed.
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
dist/assets/index-Ycfs375n.js                            335.98 kB │ gzip: 101.41 kB

✓ built in 925ms
```

구현·테스트: Codex (GPT-5).


## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
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
- [x] **비교 배너 톤·실습 흐름 다듬기** — ② PR #26 병합(`11c6ac2`).
- [ ] **후속 F15~F17 + 수동 QA 준비 도구·체크리스트** — ② **승인231b943 구현·테스트, 리뷰(Claude) 대기 — 브랜치 codex/followup-qa**
- [x] **사례 게시판 학습형 UI 1차(2026-10-03 추가)** — ①②④ PR #20 사용자 지시로 병합(`c2a998d`). **사용자 G2/삭제 취소 수동 QA는 별도 대기 유지.**

## 다음 LLM이 확인할 내용
- **Claude:** `codex/followup-qa`의 작업 정의 1)~8)와 diff·실제 테스트 출력을 독립 리뷰한다. reduced-motion 브라우저 에뮬레이션 미확인 항목도 확인한다. 병합 결정은 사용자다.
- QA 도구는 임시 SQLite·`127.0.0.1`만 쓴다. `DATABASE_URL`을 무시하고, 비밀번호는 콘솔에만 출력한다. 배포물에 연결하지 않는다.
- 수동 QA(A·B)의 결과는 사람이 적는다. AI는 QA를 대신 통과·완료로 표시하지 않고, 확인창을 대체·우회하지 않는다.
- 배너는 엔진 `comparison`·`result`만 옮겨 적는다(ADR-001). 진입·주소·라디오만으로 입력을 바꾸지 않는다. cases JSON은 테스트에서만 import한다.
- 판정기 규칙(배너 문장, 되돌리기 한 단계, 즉시 검사가 판정을 막지 않음, ACL 점검 펼침 조건)을 바꾸고 싶으면 먼저 요청한다.

## 사용자 수동 QA 대기 (PR #20 G2·삭제 취소 + 홈·실습 흐름)
- **A(PR #20 G2)·B(실제 기본 확인창 삭제 취소)·C(홈·실습 흐름): 사용자 수동 확인 대기.** 도구 실행 확인과 F15·F17 구현 검증은 수동 QA 통과가 아니다.
- 병합 뒤 [체크리스트](docs/qa-manual.md)와 `scripts/qa_local.py`로 사람이 직접 확인한다. 결과는 사람이 PR 코멘트나 이 절에 적는다. 비밀번호·쿠키·토큰은 기록하지 않는다.
- 원칙: 임시 DB·합성 계정/사례만 쓴다. 실제 기본 확인창을 대체·우회하지 않는다. 비밀번호·쿠키·토큰을 기록하지 않는다. 확인한 항목만 완료로 바꾼다.
- F5·F6(판정기 빈 템플릿 알림, 조사)은 별도 후속이다.

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

현재 후속·수동 QA 준비 설계: Claude (Claude Opus 5.5). 구현·테스트: Codex (GPT-5).
