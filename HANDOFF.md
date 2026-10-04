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
- 작업: **휴대폰 구성 접기(F18·F4) + 실습 화면 후속(F19~F23)** — 휴대폰(900px 이하)에서는 네트워크 구성이 펼쳐진 채 비교 칸보다 위에 있어 내 예상·받은 답·판정이 멀다. 구성을 접어 두고 요약 줄을 보인다. 넓은 화면은 지금 그대로다.
  - F18: 실습 화면 375×812(synthetic-02, 안내 줄 닫음)에서 ② 구성이 2,433px라 ③ 내 예상이 y≈2930, ④ 판정이 y≈3101이다(Claude 실측).
  - F4: 사례 상세 375에서 h2가 네트워크 구성 448 → 받은 답 1153 → 판정 1402 → 실제 결과 2365다(PR #20 리뷰 실측).
- 사용자 결정(2026-10-05):
  - **F18과 F4를 묶는다.**
  - **휴대폰 실습 화면의 `확인할 것`은 접힌 구성 안에 둔다.** (설계 때 추정 ③ y≈597은 폭 375 기준이었다. 실측과 폭 360 대응은 R1에서 고쳤다.)
  - **작은 후속 F19~F23을 같이 한다.**
- 방식: 사례 게시판 필터(PR #20 F1)와 같은 CSS 접기다. Claude 스파이크(2026-10-05, Chromium)에서 확인했다.
  - 넓은 화면: 닫힌 `<details>`라도 내용이 보이고 입력·포커스가 된다.
  - 휴대폰: 닫혀 있으면 포커스가 안 되고, 연 뒤에는 포커스와 줄 선택이 된다.
- 브랜치: `codex/mobile-config`(origin/main `f034bff` 기반), worktree `C:/gov/project/skt aleph/netproof-judge-ux`.
- 단계: **사용자 승인(1a1d610) → Codex 구현·테스트 완료 → Claude 리뷰 R1 수정 요청([PR #30 코멘트](https://github.com/myeongjundev/netproof/pull/30#issuecomment-5982325956)) → Codex R1(`f5b7083`) → Claude 재리뷰 PASS([코멘트](https://github.com/myeongjundev/netproof/pull/30#issuecomment-5982491300)) → 사용자 병합 결정.**
- 다음 차례: **사용자 — 병합 결정.** 고친 목표(360×800·375×812, 실습 01·02·03의 ③ 제목·세 라디오·안내 문장이 고정 줄 위)를 Claude가 휴대폰 흉내로 재확인했다. 1280은 PR #29와 같다.
- **판정·엔진은 그대로다.** 엔진·서버·API·DB·cases JSON·expect를 바꾸지 않는다. 정답·채점 표시를 만들지 않는다.

## 작업 정의
- 목표:
  1. 휴대폰 실습 화면(R1 수정 목표): 안내 줄을 닫고 ②를 접으면 360×800·375×812 실습01·02·03의 ③ 제목·세 라디오·안내 문장이 고정 줄 위에 보인다. ③ 아래 테두리까지 보이는 기준은 360×812·375×812다.
  2. 휴대폰 사례 상세: `받은 답` 제목이 첫 화면(812px) 안에 들어온다.
  3. 넓은 화면(901px 이상): 두 화면 모두 지금과 똑같이 보인다(요약 줄 없음, 구성 펼침).
  4. 접힌 구성은 요약 줄로 무엇이 들었는지 알 수 있고, 한 번 눌러 펼친다.

### 1) 공용 접기 규칙 (CSS 한 벌)
- 새 클래스 `.mobile-fold`(`<details>`). 처음엔 닫혀 있다. **React가 `open`을 관리하지 않는다**(다시 그려도 사용자가 연 상태가 남는다).
- `styles.css`:
  - `.mobile-fold > summary`: 최소 높이 44px, 커서 pointer, 굵은 글씨, 키보드 포커스 표시.
  - 넓은 화면에서는 요약 줄을 숨기고 내용을 펼친다. 사례 게시판 필터와 같은 방식이다:
    ```css
    @media (min-width: 901px) {
      @supports selector(::details-content) {
        .mobile-fold > summary { display: none; }
        .mobile-fold::details-content { content-visibility: visible; }
      }
    }
    ```
  - `::details-content` 미지원 브라우저는 넓은 화면에서도 요약 줄이 보이고 접힌 채 시작한다(내용 접근은 된다). PR #20 필터와 같은 한계다.
- 판정기(JudgePage)의 구성은 접지 않는다. 작성 도구이고, 판정하면 결과로 포커스가 간다.

### 2) 실습 화면 ② (F18)
- ② 머리(`② 구성 살펴보기` + `처음 상태로`)는 그대로 보인다.
- 그 아래 `.mobile-fold` 하나에 `확인할 것`, `FlowForm`, `NetworkEditor`를 넣는다.
- 요약 줄(R1): `구성 펼쳐 보기 · 장비 {n}대 · ACL {m}개`. n·m은 `draftSummary`와 같은 셈(`toNetwork` 기준)이다. 확인할 것 개수는 요약에서만 빼고 내용은 접기 안에 둔다.
- `입력에서 보기`(showAcl)는 접기를 먼저 열고(`open = true`) 지금처럼 ACL 줄을 선택·스크롤한다. 넓은 화면에서는 보이는 변화가 없다.
- ③·판정하기·④의 순서와 넓은 화면 배치는 바꾸지 않는다.

### 3) 사례 상세 네트워크 구성 (F4)
- `CaseNetwork`의 h2 `네트워크 구성`, 안내 문장, `확인할 통신`과 흐름 줄은 그대로 보인다.
- 장비 카드와 `ACL 원문`을 `.mobile-fold` 하나에 넣는다. 요약 줄: `구성 펼쳐 보기 · 장비 {n}대 · ACL {m}개`.
- ACL별 기존 `<details>`는 그대로 둔다(접기 안의 접기).
- `CaseDetailPage`의 칸 순서와 내용은 바꾸지 않는다.

### 4) 실습 화면 후속 (F19~F22)
- **F19**: `알겠어요`로 안내 줄을 닫으면 포커스를 ② 제목(`#practice-config-title`, tabIndex -1, preventScroll)으로 옮긴다.
- **F20**: `처음 상태로`를 눌러도 바뀌는 것이 없으면 아무것도 하지 않는다. 결과를 `이전 결과`로 바꾸지 않고 알림도 띄우지 않는다.
- **F21**: 실습 화면의 `NetworkEditor`에 `onBeforeRemove`를 연결한다. 장비·인터페이스·경로·ACL을 지우면 판정기와 같은 한 단계 되돌리기 알림을 띄운다(판정기의 remember + removing 플래그 방식).
- **F22**: 홈 이어서 하기에서 실습 입력이 아직 없으면 요약을 `실습 구성을 아직 불러오지 않았습니다.`로 쓴다(지금은 `실습 입력을 준비하고 있습니다.`).

### 5) 문서 정리 (F23)
- `docs/home-learning-ui.md`의 옛 실습 흐름만 PR #29 이후 동작으로 고친다:
  - 129줄: 상세 순서 5(`판정기에서 실습 살펴보기`)
  - 136~147줄: `판정기에 들어왔을 때` 절
  - 214·216줄: 확인 흐름
- 이 문서의 다른 절은 건드리지 않는다.

### 6) 범위 밖 · 허용 파일
- 하지 않는 것: 판정기 구성 접기, NetworkEditor 안쪽의 장비별 접기, 고정 판정 줄에 예상 표시, ① 문제·안내 줄 높이 줄이기, 엔진·서버·API·DB·cases JSON·expect, 새 의존성, F5·F6.
- 허용 파일:
  - 수정: `web/src/pages/PracticePage.tsx`·`PracticePage.test.tsx`, `web/src/components/CaseNetwork.tsx`, `web/src/pages/HomePage.tsx`·`HomePage.test.tsx`, `web/src/styles.css`
  - 신규: `web/src/components/CaseNetwork.test.tsx`(SSR 요약 줄 테스트)
  - 기록: `HANDOFF.md`, `decisions/ai-work-log.md`, `docs/qa-manual.md`(A에 휴대폰 상세 접기, C에 휴대폰 실습 접기 항목), `docs/home-learning-ui.md`(5절의 줄만)
- 읽기만: `NetworkEditor`, `FlowForm`, `ResultPanel`, `CaseDetailPage`, `JudgePage`, `App.tsx`, `caseView.ts`, `draft.ts`, `engine/`·`server/`.
- 다음을 바꾸고 싶으면 **먼저 요청한다**: 접는 화면 범위, 요약 줄 문구, 넓은 화면 기준 901px, F19 포커스 위치.

### 7) 위험
- **넓은 화면에서 구성이 접혀 보임** → `::details-content`를 지원하는 브라우저에서 1280을 확인한다. 미지원 브라우저 한계는 PR #20 필터와 같다(내용 접근은 됨).
- **휴대폰에서 `입력에서 보기`가 닫힌 칸 안으로 포커스를 못 옮김** → 먼저 연다. 테스트와 브라우저로 확인한다.
- **다시 그릴 때 사용자가 연 접기가 닫힘** → `open`을 React 상태로 관리하지 않는다.
- **숨은 칸의 입력 오류를 못 봄** → 접힌 채로도 판정할 수 있고, 판정하면 ResultPanel이 지금처럼 `입력 오류`와 문제 목록을 보인다.

### 8) 완료 조건 · 테스트
- 자동 테스트:
  - `PracticePage.test.tsx`(SSR·기존 하네스 범위):
    - `.mobile-fold` 안에 확인할 것·FlowForm·NetworkEditor가 있고 ③ 내 예상은 밖에 있다.
    - 요약 줄 셈(synthetic-01: 장비 3대·ACL 1개), 확인할 것 개수는 표시하지 않음. ③ 안내는 `예상은 계산에 쓰지 않고 비교만 합니다.`.
    - showAcl이 접기를 연다.
    - F19: 알겠어요 → ② 제목 포커스.
    - F20: 바뀐 것 없는 처음 상태로 → stale 아님·알림 없음.
    - F21: 삭제 → 되돌리기 알림 → 복구.
  - `CaseNetwork.test.tsx`(SSR): 확인할 통신은 접기 밖, 장비·ACL 원문은 안, 요약 줄 셈.
  - `HomePage.test.tsx`: 실습 입력이 없을 때의 문구.
- 네 명령의 실제 출력 전체를 이 문서에 붙인다:
  ```text
  cd engine && ../.venv/Scripts/python -m pytest -q
  cd server && ../.venv/Scripts/python -m pytest -q
  npm --prefix web test
  npm --prefix web run build
  ```
- 브라우저 확인(실제 브라우저, `scripts/qa_local.py` 또는 임시 서버, 375×812·1280×800, 라이트·다크, 320 보조):
  - 실습 375(synthetic-01·02):
    - 접힌 ② 요약 줄이 보인다.
    - 안내 줄을 닫은 상태에서 ③ 칸의 위·아래 끝과 고정 줄 위 끝(746)을 기록하고, 안내 줄을 연 상태도 기록한다.
    - 펼치기 → 편집 → 다시 판정.
    - 접힌 채 판정 → ④의 `입력에서 보기` → ②가 열리고 ACL 줄이 선택된다.
  - 실습 1280: 요약 줄이 없고 구성이 펼쳐져 있다. 결과 제목·배너 위치가 PR #29 기록(안내 닫힘 548/652)과 같다.
  - 사례 상세 375: 접기 전/후 h2 위치(네트워크 구성·받은 답·판정·실제 결과)를 기록하고, 받은 답이 812 안에 든다. 1280은 변화가 없다.
  - F19는 키보드로: 알겠어요 다음 Tab이 ②부터 이어진다. F21은 삭제 → 되돌리기. F22는 실습 조회 실패 상황에서 문구를 본다. 실패 상황을 만들 수 없으면 단위 테스트로만 확인했다고 적는다.
  - 가로 넘침 0, console error 0.
- 작업 로그 한 줄, 다음 차례를 리뷰(Claude)로 바꿔 커밋·푸시하고 PR을 연다. 병합하지 않는다.

## Claude 리뷰 (2026-10-05 · R1 수정 요청)
- 근거: 직접 실행 엔진 `326 passed, 2 xfailed` · 서버 `102 passed, 1 skipped` · 웹 `27 files / 342 passed` · 빌드 성공, 번들 cases 0. 브라우저로 F19~F22·접기·입력에서 보기·1280 무변화·사례 상세(375 받은 답 654, 펼침 1128) 확인.
- Codex 실측(01 823.69·02 783.59)과의 차이는 데스크톱 스크롤바 15px 때문이다(375 창 = 실제 폭 360). 휴대폰 흉내 375에서는 02 ③ 604–740, 01 ③ 624–760.
- 사용자 결정(2026-10-05): **이 PR에서 폭 360까지 맞춘다.**

### R1 — 폭 360에서 ③ 맞추기 (Claude 스파이크로 수치 확인)
1. **② 요약 줄**: `구성 펼쳐 보기 · 장비 {n}대 · ACL {m}개`. 확인할 것 개수를 빼서 사례 상세와 같은 문구로 한다. 360에서 두 줄(71px)이 한 줄(47px)이 된다.
2. **③ 안내 문장(모든 폭)**: `예상은 계산에 쓰지 않고 비교만 합니다.` 360에서 두 줄이 한 줄이 된다.
3. **휴대폰(900px 이하) 실습 화면 간격만 조정**:
   - `.practice-page` gap 12px
   - `.practice-config` gap 8px
   - 실습 화면의 `.layout` gap 12px
   - `.practice-prediction` padding 10px 16px
   - `.practice-problem h1` margin 2px 0 4px
   - `.practice-problem .hint` margin-top 2px
   - 넓은 화면과 판정기는 그대로 둔다.
4. **고친 목표**: 안내 줄을 닫은 상태에서 **360×800·375×812, 실습 01·02·03 모두 ③의 제목·세 라디오·안내 문장이 고정 줄 위 끝보다 위**에 있다. ③ 칸 아래 테두리까지 다 들어오는 기준은 360×812·375×812다.
   - 스파이크 수치(360×800, 고정 줄 위 끝 734): 01 ③ 612–740·안내 문장 709–729, 02 ③ 572–700, 03 ③ 592–720.
5. **측정 방법**: 휴대폰 흉내(폭 = 화면 폭, 겹치는 스크롤바)로 잰다. 데스크톱 창을 줄여 재면 스크롤바만큼 좁아진다는 점을 기록에 적는다.
6. **나머지**: 테스트 기대값(요약 줄·안내 문장)을 갱신하고, `docs/qa-manual.md` C 줄을 고친 목표에 맞추고, 1280 결과 위치(548.344/651.938)가 그대로인지 확인한다.


## 완료 내용 / 테스트 결과 (2026-10-05 Codex · R1 반영)

- 사용자 결정과 Claude 리뷰 R1 1)~6)만 수정했다. ② 요약 줄에서 확인할 것 개수를 빼고 체크포인트 내용은 접기 안에 그대로 두었다. ③ 안내는 모든 폭에서 `예상은 계산에 쓰지 않고 비교만 합니다.`로 바꿨다.
- 기존 900px 이하 media 안에 승인된 실습 간격 여섯 값만 추가했다(gap 12/8/12, padding 10px 16px, h1 margin 2px 0 4px, hint margin-top 2px). 901px 이상 CSS·판정기·다른 화면을 수정하지 않았다. React open 제어, 입력·비교·판정·되돌리기 코드도 불변이다.
- PracticePage 테스트의 정확한 요약/안내 문구 기대값과 QA 문서 C의 목표만 갱신했다. 코드 3개와 기록 3개(총 6파일) 변경. 엔진·서버·API·DB·cases JSON·expect·의존성 불변.
- 초기 구현 `dbeffb8`의 데스크톱 스크롤바 포함 측정/첫 화면 미달은 PR 초기 설명·코멘트에 남아 있다. 현재 완료 근거는 아래 R1 재측정이다. 수동 QA A/B/C 체크박스는 여전히 사용자 대기이며 AI가 완료로 표시하지 않았다.

### 실제 브라우저 재측정 · 휴대폰 흉내

- Windows 실제 Chrome, 이번 빌드와 `scripts/qa_local.py`의 `seeded_qa()`, 임시 SQLite·127.0.0.1:4868만 사용. 비로그인, 첫 안내 닫힘, ② 접힘, scrollY=0으로 측정. 세 실습 × 360×800/375×812/360×812 × 라이트·다크 총 18조합을 확인했고 두 테마의 수치는 같았다.
- **방법을 구분한다:** Chrome viewport 크기만 바꾸면 360 창의 clientWidth는 345(일반 스크롤바 15px)다. 이를 휴대폰 측정으로 쓰지 않았다. 저장소 밖 임시 WSGI QA 응답에만 `@media(max-width:900px){html::-webkit-scrollbar{width:0;height:0}}`를 붙여 스크롤 가능한 상태에서 스크롤바 점유 폭을 0으로 흉내 냈다. 앱 소스·빌드 산출물은 바꾸지 않았다. 브라우저 DOM에서 innerWidth=clientWidth=360 또는 375, 가로 넘침0을 직접 확인했다. 이는 겹치는 스크롤바와 같은 **내용 폭 조건의 흉내**이지 실제 휴대폰·네이티브 장치 에뮬레이터 검증은 아니다. 1280에서는 QA CSS가 적용되지 않는다.
- 좌표는 `getBoundingClientRect()` CSS px, 표는 소수 셋째 자리 반올림이다. 세 라디오(통과할 것 같다/막힐 것 같다/예상 없이)는 각 input과 label을 모두 측정했으며 각각 같은 위~아래 값이었다.

| 휴대폰 크기 | 실습 | ③ 제목 위~아래 | 세 라디오 위~아래 | 안내 문장 위~아래 | ③ 칸 위~아래 | 고정 줄 위 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 360×800 | 01 | 622.813~649.156 | 655.156~699.156 | 709.156~729.297 | 611.813~740.297 | 734.203 |
| 360×800 | 02 | 582.719~609.063 | 615.063~659.063 | 669.063~689.203 | 571.719~700.203 | 734.203 |
| 360×800 | 03 | 602.672~629.016 | 635.016~679.016 | 689.016~709.156 | 591.672~720.156 | 734.203 |
| 375×812 | 01 | 602.672~629.016 | 635.016~679.016 | 689.016~709.156 | 591.672~720.156 | 746.203 |
| 375×812 | 02 | 582.719~609.063 | 615.063~659.063 | 669.063~689.203 | 571.719~700.203 | 746.203 |
| 375×812 | 03 | 602.672~629.016 | 635.016~679.016 | 689.016~709.156 | 591.672~720.156 | 746.203 |
| 360×812 | 01 | 622.813~649.156 | 655.156~699.156 | 709.156~729.297 | 611.813~740.297 | 746.203 |
| 360×812 | 02 | 582.719~609.063 | 615.063~659.063 | 669.063~689.203 | 571.719~700.203 | 746.203 |
| 360×812 | 03 | 602.672~629.016 | 635.016~679.016 | 689.016~709.156 | 591.672~720.156 | 746.203 |

- **고친 목표 충족:** 360×800·375×812의 세 실습 모두 제목·각 라디오·안내 아래가 고정 줄 위보다 작다. 가장 좁은 여유는 360×800 실습01의 안내 아래729.296875 < 고정 줄734.203125(4.90625px).
- 360×800 실습01의 칸 테두리 아래740.296875는 고정 줄734.203125보다 낮다. 이를 칸 전체가 보인다고 보고하지 않는다. R1에서 정한 **테두리까지 보이는 기준인 360×812·375×812에서는 세 칸 모두** 고정 줄746.203125보다 위다(360 실습01 여유5.90625px).
- 1280×800 실습01, 안내 닫힘·내 예상 막힘·엔진 DENY/AGREE: 라이트·다크 모두 결과 제목 **548.34375**(반올림548.344), 비교 배너 아래 **651.9375**(651.938), scrollY=0. 기존 승인 수치와 정확히 같음. clientWidth=1265(기존 데스크톱 스크롤바15px), summary display:none. 넓은 화면은 휴대폰 흉내 CSS를 적용하지 않음.
- 이번 검증 탭 console error0. 캡처 `C:/Users/dora2/.codex/visualizations/mobile-config-r1-375.png`는 저장소 밖 보관(비밀번호·쿠키·토큰 없음). computer-use 스킬로 실제 브라우저 UI와 DOM 위치를 확인했다.
- QA 서버4867/4868 정상 종료, 두 임시 폴더 removed=True·listen 수0 확인. 검증 탭 닫고 viewport reset했다. 실패했던 QA 응답 후처리 초기 시도도 임시 SQLite context 종료로 정리됐다. 기존 사용자 탭·DB는 변경하지 않았다.
- 실휴대폰·터치/스크린리더·::details-content 미지원 브라우저·PostgreSQL 실연결은 미검증이다. 320은 이번 R1 목표가 아니므로 재측정하지 않았다. 다른 화면의 이전 회귀 근거는 PR 기존 기록이며 이번에 재실행했다고 주장하지 않는다.

### 네 명령 실제 전체 출력

- 엔진326 passed/기존2 xfailed, 서버102 passed/1 skipped, 웹342 passed(27files), 빌드 성공. 서버 테스트 프로세스의 DATABASE_URL·NETPROOF_TEST_DATABASE_URL을 제거한 뒤 fixture 임시 SQLite만 사용했다. 비밀값은 출력하지 않았다.

### engine

```text
cd engine && ../.venv/Scripts/python -m pytest -q
........................................................................ [ 21%]
........................................................................ [ 43%]
........................................................................ [ 65%]
........................................................................ [ 87%]
......................................xx                                 [100%]
326 passed, 2 xfailed in 4.97s
```

### server

```text
cd server && ../.venv/Scripts/python -m pytest -q
.......................................................................s [ 69%]
...............................                                          [100%]
102 passed, 1 skipped in 35.44s
```

### web

```text
npm --prefix web test

> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/gov/project/skt aleph/netproof-judge-ux/web


 Test Files  27 passed (27)
      Tests  342 passed (342)
   Start at  02:03:23
   Duration  891ms (transform 70%, import 19%, tests 8%, worker 3%)

  Transform  transforming modules took 5.68s · 70% of tracked time, re-done on every run
             persist transforms across runs with fsModuleCache: true
             learn more: https://vitest.dev/guide/improving-performance#caching-between-reruns
```

### build

```text
npm --prefix web run build

> netproof-web@0.1.0 build
> tsc --noEmit && vite build

vite v8.3.1 building client environment for production...
transforming...
✓ 56 modules transformed.
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
dist/assets/index-DXu01Xp7.css                            80.45 kB │ gzip:  22.44 kB
dist/assets/index-tA25QX7S.js                            340.18 kB │ gzip: 102.56 kB

✓ built in 396ms
```

- (Codex 기록 당시 다음 차례는 재리뷰(Claude)였다. 재리뷰 PASS 뒤 다음 차례는 위 "현재 작업 상태"를 따른다.)

Codex (GPT-5)

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
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
- [x] **후속 F15~F17 + 수동 QA 준비 도구·체크리스트** — ② PR #27 `2ad04a0`, QA 서버 동시 연결 PR #28 `8268789`. 수동 QA는 사람 대기.
- [x] **실습 화면 + 라이트 기본(프로그래머스 벤치마크, 2차 설계)** — ①② PR #29 병합(`f034bff`).
- [ ] **휴대폰 구성 접기(F18·F4) + 실습 후속 F19~F23** — ①② **PR #30 Claude 재리뷰 PASS, 사용자 병합 결정 대기 — codex/mobile-config**
- [x] **사례 게시판 학습형 UI 1차(2026-10-03 추가)** — ①②④ PR #20 사용자 지시로 병합(`c2a998d`). **사용자 G2/삭제 취소 수동 QA는 별도 대기 유지.**

## 다음 LLM이 확인할 내용
- **사용자:** PR #30 병합 결정. 병합 뒤 수동 QA A(휴대폰 사례 상세 접기)·C(휴대폰 실습 접기)는 새 기준으로 사람이 확인한다.
- 접기는 CSS(`.mobile-fold`)로만 하고 React로 `open`을 관리하지 않는다. 넓은 화면은 지금과 같아야 한다. 판정기는 접지 않는다.
- 실습 입력은 `practiceDrafts`에만 두고 판정기 `draft`는 `판정기로 가져가기`(기존 되돌리기) 때만 바꾼다. 실습 화면은 verify만 부르고 비교를 다시 계산하지 않는다(ADR-001). 정답·채점·완료 표시를 만들지 않는다.
- 첫 방문 안내 줄과 테마의 localStorage는 try/catch. 떠 있는 투어는 만들지 않는다. cases JSON은 테스트에서만 import한다.
- 수동 QA 결과는 사람이 `docs/qa-manual.md`로 기록한다. AI가 대신 완료로 바꾸지 않는다.
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

현재 휴대폰 구성 접기 설계: Claude (Claude Opus 5.5).
