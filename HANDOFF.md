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
- 작업: **홈·학습 2차 — 예상 먼저를 모든 실습으로** — 홈 critique 2회차(2026-10-04, 26/40)의 P1·P2 중 네 가지. 계산 범위를 그림으로 감싸고, 예상 퍼즐을 홈의 주 행동으로 세우고, 세 실습 모두에서 "예상 → 계산 → 비교"를 하게 하고, 판정기 진입 카드에서 예상을 고르거나 바꾸게 한다 (순환 고리 ①②).
- 근거: critique 기록(로컬, git 제외) `.impeccable/critique/2026-10-04T04-27-29Z__web-src-pages-homepage-tsx.md`. 필요한 내용은 아래 작업 정의에 옮겼다.
- 사용자 결정(2026-10-04): 다음 단계로 네 후보(계산 범위 띠, 퍼즐 주 행동, 학습 상세마다 예상 단추, 진입 카드에서 예상 바꾸기)를 설계한다.
- 브랜치: `codex/home-ux2`(origin/main `b8bb8e8` 기반), worktree `C:/gov/project/skt aleph/netproof-judge-ux`.
- 승인: **사용자 승인 완료 — 설계 `98cbf2b`(2026-10-04 구현 요청).**
- PR: **[#25 홈·학습 2차: 모든 실습의 예상 먼저 흐름](https://github.com/myeongjundev/netproof/pull/25)** — main 대상, 구현 `45b3948`, OPEN(미병합).
- 단계: **Claude 설계 → 사용자 승인 → Codex 구현·테스트 완료 → Claude 리뷰 → 사용자 병합 결정.**
- 다음 차례: **리뷰(Claude)** — 승인 설계 1)~7)·diff·독립 테스트·브라우저 흐름 확인 후 홈 critique를 26/40과 비교한다. 병합하지 않는다.
- **판정·엔진은 그대로다.** 화면 표시와 흐름만 바꾼다. 엔진·서버·API·저장 데이터·cases JSON·expect를 바꾸지 않는다. 정답·채점·완료 표시를 만들지 않는다.

## 작업 정의
- 목표:
  1. 그림만 봐도 "여기까지가 NetProof 계산, 그 밖은 실제 장비"가 보인다.
  2. 처음 온 학생의 눈과 손이 홈에서 가장 먼저 예상 퍼즐로 간다.
  3. 세 실습 모두 예상을 먼저 고르고 판정기로 갈 수 있다.
  4. 판정기 진입 카드에서 예상을 고르고, 바꾸고, 빼는 것이 한 자리에서 된다.

### 1) 계산 범위 띠 (P1)
- 현재: `PathStrip`의 `outside` 점선은 40px 짧은 선이 SRV 아래 오른쪽에 따로 떠 있어 네 번째 장비나 범례처럼 보인다.
- 바꿀 것: `outside`가 켜진 그림(홈 퍼즐, 학습 상세)은 **두 구역**으로 그린다.
  - **계산 범위 띠**: 장비 줄 전체를 옅은 바탕(`--gray-bg`)과 테두리(`--line`)로 감싸고, 띠 왼쪽 위에 작은 라벨 `NetProof 계산 범위`.
  - **띠 밖**: 마지막 장비에서 이어지는 선이 띠 경계를 넘어 **점선**으로 바뀌고, 띠 밖 같은 높이에 테두리 없는 자리 `실제 장비`를 둔다. 그 아래 한 줄 `결과는 장비에서 따로 확인`.
  - 기존 `실제 장비 · NetProof 밖` 문단은 없앤다(띠가 대신한다).
- 학습 카드용 `size="small"`은 띠 없이 지금처럼 둔다(작은 카드에 두 구역은 과하다). 학습 상세는 `outside`를 켠다.
- 색: PASS/DENY 색 금지. 띠 라벨·점선·`실제 장비`는 `--muted`. 휴대폰(375·320)에서 띠 밖 자리가 들어가지 않으면 띠 **아래**로 내려 세로로 잇는다. 가로 스크롤 금지.
- 접근성: figcaption 문장 끝을 `NetProof는 이 구성 안에서 계산하고, 실제 장비 결과는 따로 확인합니다.`로 바꾼다. 띠·점선 장식은 `aria-hidden`.
- 홈 퍼즐 캡션(`NetProof는 모델 안에서 계산합니다…`)은 띠가 같은 뜻을 보이므로 지운다. 앱 공통 푸터는 그대로.

### 2) 예상 퍼즐을 홈의 주 행동으로 (P2)
- 현재: 첫 얼굴 왼쪽에 밑줄 링크 두 개, 오른쪽 퍼즐은 히어로 카드 안의 테두리 카드이고 단추는 테두리 단추다. 375에서 `막힐 것 같다` 아래 끝이 765/812로 아슬아슬하고 캡션은 접힘선 밖이다.
- 바꿀 것(첫 얼굴만, 이어서 하기 얼굴은 그대로):
  - 퍼즐의 안쪽 테두리를 없애고(카드 안의 카드 제거), 퍼즐 영역 위에 accent 굵은 선(3px)을 둬 히어로 안에서 퍼즐이 주인공이 되게 한다.
  - 예상 단추 두 개를 **채운 단추**(`primary` 계열 같은 무게 두 개)로 바꾼다. 둘 다 같은 색·크기다. 어느 쪽도 기본 선택하지 않는다.
  - 왼쪽 링크는 `판정기 바로 열기 →` 하나만 남긴다. `학습실 전체 보기`는 바로 아래 주제 구역 머리에 이미 있으므로 히어로에서 뺀다. `판정기:` 한 줄 설명은 그대로 둔다.
  - 375 기준: 첫 화면(812px) 안에 퍼즐 질문과 **예상 단추 두 개가 모두 보여야 한다.** 필요하면 휴대폰에서 히어로 설명 문단(`내 예상이나 받은 답을…`)을 퍼즐 뒤로 보내지 말고 글자·여백을 줄이는 쪽으로 맞춘다. DOM 순서는 바꾸지 않는다(h1 → 설명 → 퍼즐).
- 홈 첫 카드(HTTPS와 입력 ACL)가 퍼즐과 같은 실습인 중복은 그대로 둔다. 카드는 "주제 목록", 퍼즐은 "바로 해 보기"라 역할이 다르다.

### 3) 학습 상세마다 예상 단추 (P2)
- 현재: 학습 상세의 주 단추는 `판정기에서 열기` 하나라, 예상 먼저가 홈의 synthetic-01에만 있다.
- 바꿀 것: 학습 상세의 그림 바로 아래를 **예상 블록**으로 바꾼다.
  - 작은 제목 `먼저 예상해 보세요`(h2), 예상 질문, 같은 무게의 단추 두 개 `통과할 것 같다` / `막힐 것 같다`.
  - 누르면 App이 그 실습의 예상을 기억하고 `#/practice/{caseId}`로 간다. 입력은 바꾸지 않는다(2절 진입 규칙 그대로).
  - 그 아래 보조 링크 `예상 없이 판정기에서 열기` → `#/practice/{caseId}`. 기존 안내 `이동만으로는 지금 입력이 바뀌지 않습니다.`는 유지.
- **예상 질문은 예/아니오로 답할 수 있어야 한다.** `learning.ts` lesson에 `guessPrompt`를 추가한다(화면 표시 전용, 정답 없음):
  - synthetic-01: `PC1에서 SRV의 HTTPS(TCP 443)에 접속할 수 있을까요?`
  - synthetic-02: `PC1에서 SRV2로 보낸 ping(ICMP)이 왕복할 수 있을까요?`
  - synthetic-03: `PC1에서 SRV의 SSH(TCP 22)에 접속할 수 있을까요?`
  - 기존 `PRACTICE.question`(특히 03의 "어떻게 적용되나요?")은 학습 질문으로 그대로 두고, 예상 블록만 `guessPrompt`를 쓴다. 홈 퍼즐도 `guessPrompt`를 쓴다.
  - `learning.test.ts`: 각 `guessPrompt`의 프로토콜·포트가 해당 cases JSON의 `flow`(proto, dst_port)와 맞는지 대조한다(테스트에서만 import).
- 홈 퍼즐과 학습 상세 예상 블록은 **같은 컴포넌트**를 쓴다(`GuessPuzzle`을 `HomePage.tsx` 밖 `web/src/components/GuessPuzzle.tsx`로 옮기고 `lesson`·`heading`·`onGuess`를 받는다).
- App의 `onGuess`를 `(caseId, expected) => { setGuess({ caseId, expected }); go(`/practice/${caseId}`) }`로 일반화한다.

### 4) 판정기 진입 카드에서 예상 고르기·바꾸기 (P1)
- 현재: 진입 카드는 `내 예상: 막힘` 문장만 보인다. 바꾸려면 홈으로 돌아가야 하고, 예상 없이 들어오면 고를 방법이 없다.
- 바꿀 것: 진입 카드의 그 자리를 **선택 묶음**으로 바꾼다.
  - `<fieldset>` + `<legend>내 예상</legend>` 안에 라디오 세 개: `통과할 것 같다` · `막힐 것 같다` · `예상 없이`. 들어온 예상이 있으면 그 값, 없으면 `예상 없이`가 선택된 상태로 시작한다.
  - 바꾸면 App의 guess가 바뀐다(`예상 없이`는 guess 삭제). 입력(Draft)은 바꾸지 않는다.
  - 한 줄 안내: `구성을 불러오면 고른 예상이 받은 답(내 예상)으로 들어갑니다.` — 불러오기 전 아래 받은 답 칸이 `비교 안 함`인 이유를 설명한다.
  - `구성 불러오기`는 지금처럼 그때의 guess로 `practiceDraft`를 만든다(guess 없으면 EMPTY_CLAIM).
  - 진입 카드의 `판정기로 이동` 링크는 이미 판정기 화면이라 뜻이 모호하므로 `실습 없이 계속하기`로 바꾼다(동작 동일: `#/`).
- 예상 단추·라디오 묶음 모두 질문과 묶어 읽히게 한다: 홈·학습 예상 블록은 `role="group"` + `aria-labelledby`(질문 문단 id), 진입 카드는 fieldset/legend.

### 5) 범위 밖 · 허용 파일
- 하지 않는 것: 채점·정답·진도·배지, 입력 자동 저장, 홈 카드 구성 변경, 헤더·표어, 사례 상세·게시판의 예시 제목, F5·F6, PR #20 수동 QA, 엔진·서버·API·DB·cases JSON·expect 변경, 새 의존성.
- 허용 파일:
  - 신규: `web/src/components/GuessPuzzle.tsx`, `GuessPuzzle.test.tsx`
  - 수정: `web/src/components/PathStrip.tsx`·test, `web/src/pages/{HomePage,LearningPage,JudgePage}.tsx`와 각 test, `web/src/learning.ts`·test, `web/src/App.tsx`(onGuess 일반화·guess 변경 콜백 연결만), `web/src/styles.css`(home·learning·practice-entry·path-strip·guess 국소 클래스만)
  - 기록: `HANDOFF.md`, `decisions/ai-work-log.md`
- 읽기만: `engine/`·`server/`, `types.ts`·`draft.ts`·`practice.ts`·`share.ts`·`validate.ts`·`verdictView.ts`, 결과·편집기 컴포넌트, `AppHeader.tsx`, `cases/*.json`(테스트 import만).
- 다음을 바꾸고 싶으면 **먼저 요청한다**: `guessPrompt` 세 문장, 띠 라벨 `NetProof 계산 범위`, 진입 카드 라디오 세 항목 문구, 예상을 받은 답(`kind: "self"`)으로 싣는 규칙.

### 6) 위험
- **예상 질문이 답을 흘림** → `guessPrompt`는 흐름(출발·도착·프로토콜·포트)만 말하고 ACL·경로 결론을 말하지 않는다. 테스트로 흐름 일치만 대조한다.
- **라디오가 입력을 바꿈** → 진입 카드 선택은 App guess만 바꾸고 Draft는 "구성 불러오기" 때만 바뀐다. setDraft 미호출 테스트.
- **예상이 다른 실습에 묻어감** → 기존 규칙 유지(caseId 일치 때만 전달, 불러오기·다른 주소에서 삭제).
- **채운 단추 두 개가 정답 힌트처럼 보임** → 같은 색·크기·순서 고정(통과 → 막힘), 기본 선택 없음.
- **휴대폰에서 띠 밖 자리가 넘침** → 375·320에서 세로 전환, scrollWidth 확인.

### 7) 완료 조건 · 테스트
- 자동 테스트:
  - `PathStrip.test.tsx`: `outside`일 때 `NetProof 계산 범위` 띠·`실제 장비` 자리·새 figcaption 문장, `small`일 때 띠 없음, PASS/DENY 문구·클래스 없음.
  - `GuessPuzzle.test.tsx`: 질문은 `guessPrompt`, 단추 두 개 같은 클래스·기본 선택 없음, `role="group"`과 `aria-labelledby`, 클릭 시 `onGuess(caseId, expected)`(순수 함수 분리 또는 이벤트 검증), heading 단계 prop.
  - `learning.test.ts`: 세 `guessPrompt`의 프로토콜·포트가 cases JSON `flow`와 일치. `learning.ts`가 cases JSON을 import하지 않음(기존 검사 유지).
  - `HomePage.test.tsx`: 첫 얼굴 히어로 링크는 `판정기 바로 열기` 하나, 퍼즐 캡션 문장 없음, 퍼즐 단추가 채운 단추 클래스. 이어서 하기 얼굴 회귀.
  - `LearningPage.test.tsx`: 상세 순서 h1 → 질문 → 그림(outside) → 예상 블록(h2) → `예상 없이 판정기에서 열기` → 개념….
  - `JudgePage.test.tsx`: 진입 카드 fieldset/legend `내 예상`, 들어온 예상 선택 상태, 없으면 `예상 없이` 선택, 라디오 변경이 setDraft를 부르지 않음, `실습 없이 계속하기` 문구. 기존 결론 문구 미노출 검사 유지.
- 네 명령의 실제 출력 전체를 이 문서에 붙인다:
  ```text
  cd engine && ../.venv/Scripts/python -m pytest -q
  cd server && ../.venv/Scripts/python -m pytest -q
  npm --prefix web test
  npm --prefix web run build
  ```
- 브라우저 확인(375×812·1280×800 × 라이트·다크, 320px, 임시 SQLite·합성 데이터만):
  - 홈 첫 얼굴 375: 퍼즐 질문과 예상 단추 두 개가 812px 안(아래 끝 y 기록). 띠와 `실제 장비` 자리가 넘치지 않음.
  - 학습 상세 03에서 `막힐 것 같다` → 진입 카드 라디오 `막힐 것 같다` 선택 → `통과할 것 같다`로 바꿈 → 구성 불러오기 → 받은 답 "된다"·내 예상 → 판정 → 배너가 엔진 비교대로.
  - `예상 없이 판정기에서 열기` → 진입 카드 `예상 없이` 선택 → 구성 불러오기 → 받은 답 `비교 안 함`.
  - 진입 카드에서 라디오를 바꿔도 아래 입력 칸(출발지 IP 등)이 그대로인지.
  - 판정기 화면 본문에 결론 문구(`ACL에 막힘`, `돌아오는 경로 없음`, `나가는 방향으로 붙임`)가 없음(회귀).
  - console error 0, 가로 넘침 없음.
- 리뷰 때 Claude가 홈 `/impeccable critique`를 다시 돌려 26/40과 비교한다.
- 작업 로그 한 줄, 다음 차례를 리뷰(Claude)로 바꿔 커밋·푸시하고 PR을 연다. 병합하지 않는다.

## 완료 내용 / 테스트 결과 (2026-10-04, Codex)

- 기존 `codex/home-ux2`에서 `git switch codex/home-ux2`·`git pull`(Already up to date) 후 AGENTS.md/HANDOFF 전체를 읽었다. 수정 전 HEAD `98cbf2b`, 사용자 승인 설계1)~7) 범위만 구현했다. PR #24는 MERGED·`b8bb8e8` 확인.
- 계산 범위: PathStrip의 outside(축소 제외)는 옅은 띠/라벨과 경계를 넘는 점선·실제 장비 자리로 나눈다. 휴대폰은 세로로 연결, figcaption에 계산 범위/실장비 별도 확인 문장을 넣고 장식은 aria-hidden. 축소 카드는 띠 없이 유지했다.
- 공유 GuessPuzzle: lesson/heading/onGuess와 표시 옵션을 받아 홈과 학습 상세가 같은 질문/단추를 쓴다. 세 승인 guessPrompt는 그대로이며 JSON 흐름과 프로토콜/포트를 테스트에서 대조한다. 질문 문단으로 group 이름을 연결, 통과→막힘 고정·동일 클래스·기본 선택 없음. 첫 얼굴은 카드 안 테두리 제거/3px accent 선/채운 단추, 이어서 하기는 테두리 단추 유지. 히어로 링크는 판정기 하나, 중복 퍼즐 캡션 제거.
- 학습 상세: 질문→계산 범위 그림→예상 블록(h2)→예상 없이 링크→설명. 기존 PRACTICE.question은 수정하지 않았다.
- App: onGuess를 caseId별로 일반화, 진입 카드의 별도 변경 콜백은 guess만 갱신/삭제한다. fieldset/legend 내 예상·라디오3개와 안내·실습 없이 계속하기를 표시했다. Draft 변경은 기존 구성 불러오기만, practiceDraft의 kind self/EMPTY_CLAIM·비교 배너/엔진 comparison·되돌리기·예상 소비/다른 주소에서 삭제 규칙은 그대로.
- 코드14파일(신규 GuessPuzzle/test 포함)·기록2파일만 변경. 엔진·서버·API·DB·cases JSON·expect·의존성·헤더·다른 화면 불변. 초기 대상 실행에서 새 대조 테스트가 JSON proto의 소문자를 고려하지 않아3실패했고 TS가 ICMP 무포트 union 접근을 거절했다. 테스트를 실제 데이터 형태에 맞게 대소문자 표기/포트 유무 대조로 바로잡았다(승인 질문·사례·엔진 불변). 수정 뒤 대상6파일46통과, 최종 웹11회귀 추가(279→290).
- 네 명령을 worktree에서 직접 실행했다. PowerShell에서 engine/server 작업 디렉터리를 각각 지정했고 PYTHONPATH는 이 worktree다. 서버는 NETPROOF_TEST_DATABASE_URL 제거 후 임시 SQLite 테스트만 사용했다. 아래는 전체 실제 출력, 모두 종료 코드0. 기존2 xfail/1 skip을 통과로 바꾸지 않았다.

### `cd engine && ../.venv/Scripts/python -m pytest -q`

```text
........................................................................ [ 21%]
........................................................................ [ 43%]
........................................................................ [ 65%]
........................................................................ [ 87%]
......................................xx                                 [100%]
326 passed, 2 xfailed in 4.81s
```

종료 코드: 0.

### `cd server && ../.venv/Scripts/python -m pytest -q`

```text
.......................................................................s [ 78%]
....................                                                     [100%]
91 passed, 1 skipped in 29.74s
```

종료 코드: 0.

### `npm --prefix web test`

```text
> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/gov/project/skt aleph/netproof-judge-ux/web


 Test Files  23 passed (23)
      Tests  290 passed (290)
   Start at  17:48:59
   Duration  688ms (transform 68%, import 19%, tests 8%, worker 4%)

  Transform  transforming modules took 3.97s · 68% of tracked time, re-done on every run
             persist transforms across runs with fsModuleCache: true
             learn more: https://vitest.dev/guide/improving-performance#caching-between-reruns
```

종료 코드: 0.

### `npm --prefix web run build`

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
dist/assets/index-DU94qPrt.css                            78.83 kB │ gzip:  22.17 kB
dist/assets/index-DgXsmTCe.js                            334.61 kB │ gzip: 100.97 kB

✓ built in 390ms
```

종료 코드: 0.

### 브라우저 확인 (computer-use)

- Codex in-app Chromium, 새 QA 탭·`127.0.0.1:5187`의 최종 production build, 새 임시 SQLite·합성 데이터만 사용. 기존 사용자 탭/서버/실제 DB는 사용하지 않았다. 화면은 실제 설정 라디오로 라이트/다크를 고르고 각각 확인했다.
- **375×812 라이트·다크**: 홈 첫 얼굴 scrollY0, 질문 y414.6875~461.1875, 두 예상 단추 y699.703125~769.296875(각143×69.59375). 두 단추 아래 끝769.30<812로 둘 다 첫 화면 안. scope/outside 있음, scrollWidth360≤375.
- **1280×800 라이트·다크**: 홈 질문 y165.890625~190.6875, 두 단추 y372.015625~416.8125(높이44.796875). 계산 범위 띠/실제 장비가 가로로 연결되며 scrollWidth1265≤1280. 네 조합 모두 홈/학습에 계산 결론이 없고 첫 선택은 비선택 상태다.
- **네 조합에서 동일 흐름을 실제 클릭**: 판정기에서 출발지IP를198.51.100.7로 편집→홈→학습 상세03→막힐 것 같다→진입 라디오 막힐 것 같다 선택. 아래 입력은 IP198.51.100.7·포트443·비교 안 함 그대로. 라디오를 통과할 것 같다로 바꿔도 세 값은 그대로였다. 진입 본문에 ACL에 막힘/돌아오는 경로 없음/나가는 방향으로 붙임 검색 결과0.
- 구성 불러오기 직접 클릭 뒤에만 주소#/·IP10.10.10.10·포트22, 받은 답 된다·kind self가 됐다. 판정하기 뒤 **✕ 내 예상이 NetProof 계산과 다릅니다**(기존 엔진 comparison 표시) 배너 확인. 학습 상세로 돌아가 예상 없이 링크로 진입하면 예상 없이 선택이며, 기존 받은 답 된다가 진입만으로 지워지지 않았다. 직접 구성 불러오기 뒤 비교 안 함·종류 입력 없음이 됐다. 이 차이가 입력 불변 원칙의 확인 근거다.
- 학습 상세03 네 조합: H1 출력 ACL→H2 먼저 예상해 보세요→H2 개념→H2 쉬운 비유→H2 확인할 것→H2 다른 주제. 계산 범위/밖 자리 있음, 가로 넘침 없음.
- **320×812 라이트·다크**: 홈과 네 장비 왕복 경로 상세의 scrollWidth305≤320, 띠 밖 자리 세로 연결·장비/단추 안 잘림. 홈 단추 아래 끝783.234375/836.03125(둘째는 접힘선 아래). 320에서 둘 다 첫 화면 안이라고 주장하지 않는다; 첫 화면 조건은 설계의375에서 충족했다. 왕복 상세 두 단추 아래 끝611.28125/664.078125.
- 320 다크에서 상세02 막힐 것 같다→주소#/practice/synthetic-02·진입DENY→직접 불러오기→ICMP(포트칸 없음)·받은 답 안 된다·kind self→판정 **✓ 내 예상이 NetProof 계산과 같습니다**도 확인했다.
- 수집 console error/warn0. 브라우저 캡처는 초기 비동기 이동 직후의 이전 화면 이미지가 섞여, 화면이 그려진 뒤 다시 캡처하고 이미지를 직접 확인했다. 최종 근거 캡처는 저장소 밖 `C:/Users/dora2/.codex/visualizations/home-ux-2026-10-04`의 `ux2-home-{light,dark}-{375,1280,320}.png`, `ux2-learning-light-{375,1280}.png`, `ux2-roundtrip-{light,dark}-320.png`.
- 원래 테마 기기 설정 따르기 복원·viewport reset·QA 탭 닫음·서버 종료/5187 listen 없음 확인. 정확한 임시qa.db와 빈 디렉터리 삭제(합성 데이터만 제거). 실제 DB/비밀값 미사용, 캡처 보존.
- 한계: 실제200% 확대·물리폰·실제 스크린리더·다른 브라우저·실장비·PG·사용자 인터뷰는 미검증. F5/F6·PR20 G2/실제 기본 확인창 삭제 취소는 별도 수동 확인 대기 그대로다. critique/새 점수는 작성하지 않았고 Claude 리뷰 때26/40과 비교한다.

다음 차례: **리뷰(Claude)**. 병합하지 않음.

Codex (GPT-6)

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
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
- [ ] **홈·학습 2차(계산 범위 띠·퍼즐 주 행동·실습마다 예상·진입 카드 예상 바꾸기)** — ①② **승인98cbf2b·구현/테스트 완료, Claude 리뷰 대기 — 브랜치 codex/home-ux2**
- [x] **사례 게시판 학습형 UI 1차(2026-10-03 추가)** — ①②④ PR #20 사용자 지시로 병합(`c2a998d`). **사용자 G2/삭제 취소 수동 QA는 별도 대기 유지.**

## 다음 LLM이 확인할 내용
- **Codex:** 승인98cbf2b의 1)~7) 구현·네 명령 직접 실행·브라우저 확인 완료. 아래 전체 출력과 확인 범위를 인계한다.
- **Claude(리뷰):** 공유 GuessPuzzle/흐름 질문, PathStrip 경계, App 예상 연결·진입 라디오 입력 불변, 비교는 엔진 comparison만 사용함을 독립 확인한다. 홈 critique를 재실행해26/40과 비교한다.
- 홈·학습은 정답·계산 결과·expect를 보이지 않는다. 예상은 학생이 직접 고른 받은 답(`kind: "self"`)이고 비교는 엔진 `comparison`이 한다. cases JSON은 테스트에서만 import한다.
- 진입·주소·진입 카드 라디오만으로 입력을 바꾸지 않는다. 입력 변경은 "구성 불러오기" 직접 클릭 때만이며 기존 되돌리기 규칙을 따른다.
- 다음 우선 확인은 아래 **사용자 수동 QA**다. 미확인을 PASS로 적지 않는다. 코드·배포·병합은 자동 진행하지 않는다.
- 판정기 규칙(배너 문장, 되돌리기 한 단계, 즉시 검사가 판정을 막지 않음, ACL 점검 펼침 조건)을 바꾸고 싶으면 먼저 요청한다. 화면이 판정·비교를 다시 계산하면 설계 위반이다.

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

현재 홈·학습 2차 설계: Claude (Claude Opus 5.5). 구현·테스트: Codex (GPT-6).
