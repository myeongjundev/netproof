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
- 작업: **판정기 알림·조사 정리 (F5·F6)** — PR #21 리뷰의 비차단 후속 두 건이다.
  - **F5**: 판정기를 처음 연 상태(빈 템플릿 그대로)에서 예시를 불러와도 `예시 01을 불러왔습니다.` + `되돌리기` 알림이 뜬다. 되돌릴 사용자 입력이 없으므로 소음이다.
    - 원인: `JudgePage`의 `load()`가 장비·ACL·흐름 주소·받은 답 중 하나라도 있으면 입력이 있다고 본다. 빈 템플릿에도 장비 3대와 흐름 주소가 있다.
  - **F6**: `예시 02을`처럼 숫자·이름 뒤의 조사가 틀린다. 코드 전체를 찾아보니 같은 종류가 6곳 더 있어 함께 고친다(아래 2절 표).
- 사용자 결정(2026-10-05): F5·F6을 다음 과제로 한다.
- 브랜치: `codex/judge-notice`(origin/main `63515a6` 기반), worktree `C:/gov/project/skt aleph/netproof-judge-ux`.
- 단계: **Claude 설계 → 사용자 승인(9920378) → Codex 구현·테스트 완료(`1014071`) → Claude 리뷰 PASS([PR #31 코멘트](https://github.com/myeongjundev/netproof/pull/31#issuecomment-5982818619)) → 사용자 병합 결정.**
- 다음 차례: **사용자 — 병합 결정.** Claude가 네 명령과 실제 브라우저로 F5(빈 템플릿 알림 0, 편집 뒤 알림·복구)와 F6 일곱 문장을 다시 확인했다. 비차단 후속 F24(저장 제목)는 아래 "다음 LLM이 확인할 내용"에 있다.
- **판정·엔진은 그대로다.** 문장과 알림 조건만 바꾼다. 엔진·서버·API·DB·cases JSON·expect를 바꾸지 않는다.

## 작업 정의
- 목표:
  1. 손대지 않은 빈 템플릿에서 무엇을 불러와도 되돌리기 알림이 뜨지 않는다. 한 칸이라도 바꾼 뒤에는 지금처럼 뜬다.
  2. 화면 문장의 조사가 앞말에 맞는다. 조사를 자동으로 고르는 함수는 만들지 않고, **조사가 늘 같은 낱말 뒤에 오도록 문장을 바꾼다.**

### 1) F5 — 빈 템플릿에서는 되돌리기 알림을 띄우지 않는다
- `JudgePage`의 `load()` 안 `hasInput` 판단을 홈과 같은 기준인 `hasCurrentInput(current)`(`homeView.ts`, 빈 템플릿과 JSON 비교)로 바꾼다. 새 함수는 만들지 않는다.
- 결과: 손대지 않은 빈 템플릿에서 예시·처음 구성·JSON 붙여 넣기·`판정기로 가져가기`를 불러오면 알림이 없다. 받은 답 하나만 바꿨어도 입력이 있는 것이므로 알림이 뜬다.
- 되돌리기 규칙(한 단계, 직접 편집하면 닫힘, 같은 입력이면 알림 없음)은 그대로다.

### 2) F6 — 조사가 앞말에 맞도록 문장 고치기
| 곳 | 지금 | 바꿀 문장 |
| --- | --- | --- |
| `JudgePage` 예시 불러오기 알림 | `예시 02을 불러왔습니다` | `{학습 주제} 예시를 불러왔습니다`(예: `왕복 경로 예시를 불러왔습니다`). 학습 주제가 없는 예시는 `예시({번호})를 불러왔습니다` |
| `NetworkEditor` ACL 삭제 알림 | `ACL 102을 삭제했습니다` | `{이름} ACL을 삭제했습니다`. 이름이 비어 있으면 `ACL을 삭제했습니다` |
| `aclAudit.ts` 가려짐 | `이 줄의 permit는 적용되지 않습니다` | `이 줄의 동작({permit·deny})은 적용되지 않습니다` |
| `aclAudit.ts` 뒤쪽 중복 | `지워도 {줄·암묵적 deny}이(가) 같은 동작을 합니다` | `지워도 {줄·암묵적 deny}에서 같은 동작이 적용됩니다` |
| `App.tsx` 로그인 안내 | `{닉네임}으로 로그인돼 있습니다` | `{닉네임} 계정으로 로그인돼 있습니다` |
| `SettingsPage` 계정 삭제 | 개수를 모를 때 `내가 저장한 사례이 함께 지워지고` | 개수를 모르면 `사례가`, 알면 `사례 {n}건이` |
| `verdictView.ts` 비교 배너·상태 줄 | `내 예상(통과)와 NetProof 계산…` | `내 예상(통과)과 NetProof 계산…`(AI 답·받은 답, PASS·DENY 모두 `과`) |

- 비교 배너 근거: 괄호 뒤 조사는 괄호 앞말에 맞춘다(국립국어원 온라인가나다, 예: `식재료(고등어, 달걀 등)를`). 괄호 앞말은 `예상`·`답`이라 늘 `과`다. `NetProof 계산(막힘)이`는 `계산` 뒤라 지금도 맞다.
- 비교 배너는 판정기·실습 화면·사례 상세가 함께 쓴다(`ResultPanel`). 세 화면에 같이 반영된다.
- `aclAudit.ts`는 표시 문장만 바꾼다. 점검 결과(가려짐·중복 판단)는 엔진 계산 그대로다.

### 3) 범위 밖 · 허용 파일
- 하지 않는 것:
  - 엔진·서버 메시지(엔진의 `reason`·`problems`, 서버 오류 문구)
  - 조사 자동 판별 함수나 라이브러리
  - 그 밖의 문구 다듬기, 배너 톤·구조 변경
  - 엔진·서버·API·DB·cases JSON·expect, 새 의존성
- 허용 파일:
  - 수정: `web/src/pages/JudgePage.tsx`(`load` 입력 판단·예시 알림 문구)·test, `web/src/components/NetworkEditor.tsx`(ACL 삭제 문구 한 줄), `web/src/aclAudit.ts`·test, `web/src/App.tsx`(로그인 안내 한 줄), `web/src/pages/SettingsPage.tsx`(계정 삭제 문장 한 줄), `web/src/verdictView.ts`·test, 배너 문구를 기대하는 다른 테스트(`PracticePage.test.tsx` 등)
  - 기록: `HANDOFF.md`, `decisions/ai-work-log.md`
- 읽기만: `homeView.ts`(`hasCurrentInput` 재사용), `ResultPanel`, `engine/`·`server/`.
- 다음을 바꾸고 싶으면 **먼저 요청한다**: 2절 표의 문장.

### 4) 위험
- **배너 문구가 세 화면에 동시에 바뀐다** → verdictView 테스트와 브라우저로 판정기·실습·사례 상세를 확인한다.
- **F5 때문에 되돌리기가 필요한 경우까지 알림이 사라진다** → 포트 하나만 바꾼 경우, 받은 답만 바꾼 경우 알림이 뜨는지 테스트한다.
- **문장을 바꾸며 기존 테스트 문자열이 깨진다** → 테스트를 함께 고치고, 뜻이 같은지 확인한다.

### 5) 완료 조건 · 테스트
- 자동 테스트:
  - F5: 빈 템플릿 → 예시 불러오기 알림 없음, 흐름 포트 하나 바꿈 → 알림, 받은 답만 바꿈 → 알림, 같은 입력 → 알림 없음.
  - 예시 알림 문구: 세 학습 주제와 주제 없는 예시.
  - ACL 삭제 문구: 이름 있음, 빈 이름.
  - aclAudit: 가려짐 문장이 permit·deny 모두 `동작(…)은`, 뒤쪽 중복 문장에 `이(가)` 없음.
  - verdictView 배너·상태 줄: AI 답·내 예상·받은 답 × PASS·DENY 예상 모두 `과`.
  - 로그인 안내·계정 삭제 문장: SSR이나 문자열 테스트로 확인한다. 어려우면 브라우저 확인으로 기록한다.
- 네 명령의 실제 출력 전체를 이 문서에 붙인다:
  ```text
  cd engine && ../.venv/Scripts/python -m pytest -q
  cd server && ../.venv/Scripts/python -m pytest -q
  npm --prefix web test
  npm --prefix web run build
  ```
- 브라우저 확인(실제 브라우저, `scripts/qa_local.py` 또는 임시 서버, 375×812·1280×800, 라이트):
  - 새로고침 직후 판정기에서 예시를 불러오면 알림이 없다. 포트를 바꾼 뒤 예시를 불러오면 `{주제} 예시를 불러왔습니다.` + 되돌리기가 뜬다.
  - ACL 삭제 알림 문구.
  - ACL 점검의 가려짐·중복 문장(앞줄 deny, 뒷줄 permit처럼 가려지는 구성을 직접 만들어 확인).
  - 판정기·실습 화면·사례 상세의 배너 `내 예상(통과)과 …`.
  - 로그인한 채 `#/login`의 안내, 설정의 계정 삭제 문장(합성 계정).
  - console error 0.
- 작업 로그 한 줄, 다음 차례를 리뷰(Claude)로 바꿔 커밋·푸시하고 PR을 연다. 병합하지 않는다.

## 완료 내용 / 테스트 결과 (2026-10-05 Codex)

- 사용자 승인 `9920378`, 작업 정의 1)~5)만 구현했다. F5는 JudgePage load의 hasInput을 **기존 hasCurrentInput(current)**로 교체했다. 같은 입력 비교·한 단계 되돌리기·직접 편집 알림 닫기·요청 무효화 규칙은 그대로다.
- F6은 2절 표의 일곱 문장만 바꿨다: 예시 주제/번호 알림, 이름 있음/없음 ACL 삭제, 점검 가려짐/뒤쪽 중복, 로그인 안내, 계정 삭제, 비교 배너·상태 줄의 고정 `과`. 자동 조사 판별 함수·라이브러리는 만들지 않았다.
- 소스6파일·테스트3파일·기록2파일만 변경했다. 엔진·서버 메시지·API·DB 코드·cases JSON·expect·의존성·CSS·ResultPanel 및 다른 문구는 불변이다. 서버와 엔진은 읽기만 했다.
- 새 회귀22개(기존342 → 364): 빈 템플릿의 예시/처음 구성/JSON/실습 가져오기4, 포트/받은 답만 편집 및 되돌리기2, 같은 입력1, 세 주제/주제 없는 예시4, ACL 이름/빈 이름/공백3, Settings SSR 미확인/0/4건3, 점검 permit/deny/뒤쪽 줄/암묵적 deny/둘 다5. 기존 verdictView 전수 테스트는 고정 `과`와 statusLine 검사로 보강했다. 훅 하네스/SSR은 실제 DOM 통합 검증이 아니므로 아래 별도 브라우저 기록과 구분한다.
- 실행 중 최초 빌드는 새 테스트 fixture의 역할 `student`가 실제 User 타입 `user | reviewer`와 달라 TS2769로 실패했다. fixture를 `user`로 바로잡고 웹 테스트·빌드를 다시 직접 실행해 아래 성공 출력을 얻었다. 앱 동작을 테스트에 맞춰 바꾸지 않았다.

### 실제 브라우저 확인

- computer-use 스킬로 실제 Windows Chrome에서 앱의 이번 빌드를 검사했다. `scripts/qa_local.py`를 저장소 밖 RAM 전달 헬퍼로 실행, **임시 SQLite·127.0.0.1:4869/4870만** 사용했다. DATABASE_URL에 가짜 URL을 줬지만 QA 도구가 무시했다. 비밀번호는 subprocess pipe·일회성 로컬 IPC·브라우저 입력의 RAM에서만 사용하고 파일/콘솔/캡처/PR에 남기지 않았다.
- 뷰포트 375×812·1280×800, 라이트에서 확인했다. 375의 clientWidth=360, 1280의 clientWidth=1265(일반 데스크톱 스크롤바15px)다. 이번은 문구·동작 QA이며 휴대폰 첫 화면 배치 합격 주장이나 실제 기기 에뮬레이션이 아니다. 가로 넘침0.
- **새로고침 직후 예시:** 빈 템플릿에서 예시01 클릭 → `.undo-notice` 0개(1280 비로그인/로그인, 375 로그인). 예시 입력은 정상으로 불러와졌다.
- **편집 뒤 예시:** 목적지 포트8443 편집 → 예시02 → `왕복 경로 예시를 불러왔습니다.` + `되돌리기`(두 폭). 375 새로고침 후 받은 답만 `된다` → 예시03 → `출력 ACL 예시를 불러왔습니다.` + 되돌리기. 같은 예시03 재클릭 → 알림0. 예시01 주제 문구도 `HTTPS와 입력 ACL 예시를 불러왔습니다.`로 확인했다. 주제 없는 예시는 하네스 테스트만 확인(공개 예시는 세 개).
- **ACL 삭제:** 두 폭에서 `101 ACL을 삭제했습니다.` + 되돌리기. 복구 후 이름을 지우고 삭제 → `ACL을 삭제했습니다.` + 되돌리기. 이는 로컬 입력 편집이며 계정/사례 삭제는 하지 않았다.
- **ACL 점검:** 예시01의 ACL 입력을 아래처럼 직접 바꾸고 실제 verify/acl-audit 요청으로 재판정했다. 엔진 응답을 화면에서 재계산하거나 주입하지 않았다.

  ```text
  deny tcp any any eq 443
  permit tcp any any eq 443
  deny tcp any any eq 80
  deny tcp any any eq 80
  ```

  두 폭에서 `2번 줄 · 가려짐 — 1번 줄이 먼저 잡고, 그중 동작이 반대인 줄이 있어 이 줄의 동작(permit)은 적용되지 않습니다.` 및 `3번 줄 · 중복 — 지워도 4번 줄에서 같은 동작이 적용됩니다.`를 확인했다. 앞 두 줄의 permit/deny 순서를 바꾸면 `동작(deny)은 적용되지 않습니다.`다. 375에서 마지막 중복 deny를 뺀 입력도 판정하여 `3번 줄 · 중복 — 지워도 암묵적 deny에서 같은 동작이 적용됩니다.`를 확인했다. `이(가)`·`permit는` 문구 없음.
- **비교 배너:** 두 폭에서 판정기의 예시01 받은 답 종류를 `내 예상`으로 고르고 판정 → `≠ 내 예상(통과)과 NetProof 계산(막힘)이 다릅니다`. 전용 실습01에서도 통과 예상 선택·판정 후 같은 배너. 판정기 결과를 임시 사례 `QA F6 내 예상 통과 배너`(#5)로 저장해 상세에서도 같은 문구를 확인했다. 기존 합성 사례#1은 `≠ AI 답(통과)과 …`(두 폭), 종류 미선택은 `≠ 받은 답(통과)과 …`(375). 상태 줄도 공용 verdictView 테스트로 AI/내 예상/받은 답 × 통과/막힘 × 엔진 AGREE/DISAGREE 전수 확인했다.
- **로그인 안내:** 합성 qa_author로 실제 로그인 폼 제출. 두 폭에서 `#/login` → `qa_author 계정으로 로그인돼 있습니다`.
- **계정 삭제 안내:** 1280에서 `계정과 내가 저장한 사례 4건이 함께 지워지고 되돌릴 수 없습니다.`; 임시 사례를 한 건 추가한 후 375에서 `사례 5건이`를 확인했다. 실제 계정 삭제·비밀번호 변경은 실행하지 않았다. 개수 미확인 `사례가`와 0/4건은 SSR 테스트로만 검증했으며 브라우저 오류 주입 검증으로 주장하지 않는다.
- 검증 탭의 console error0. RAM 전달 헬퍼의 첫 연결 시도는 실패/timeout으로 중단돼 해당 임시 서버를 정상 종료한 뒤 새 환경에서 로그인 QA를 끝냈다(앱 오류가 아님).
- 저장소 밖 캡처: `C:/Users/dora2/.codex/visualizations/judge-notice-1280.png`, `judge-notice-375.png`(비밀값 없음). 탭 닫음·viewport reset·RAM 자격 참조 폐기. 두 서버 정상 종료·임시 폴더 removed=True·4869/4870 listen0 확인. 초기 브라우저 탭은 연결 복구 시 이미 닫혀 있었다. 기존 사용자 탭·DB는 변경하지 않았다.
- 실제 휴대폰·스크린리더·PostgreSQL 실연결·다크는 이번 범위에서 미검증. 사용자 수동 QA A/B/C는 완료로 표시하지 않고 대기를 유지한다.

### 네 명령 실제 전체 출력

- 서버 테스트 프로세스에서 DATABASE_URL·NETPROOF_TEST_DATABASE_URL을 제거하고 fixture의 임시 SQLite만 사용했다. 값은 출력하지 않았다.

### engine

```text
cd engine && ../.venv/Scripts/python -m pytest -q
........................................................................ [ 21%]
........................................................................ [ 43%]
........................................................................ [ 65%]
........................................................................ [ 87%]
......................................xx                                 [100%]
326 passed, 2 xfailed in 3.34s
```

### server

```text
cd server && ../.venv/Scripts/python -m pytest -q
.......................................................................s [ 69%]
...............................                                          [100%]
102 passed, 1 skipped in 20.96s
```

### web

```text
npm --prefix web test

> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/gov/project/skt aleph/netproof-judge-ux/web


 Test Files  27 passed (27)
      Tests  364 passed (364)
   Start at  02:35:36
   Duration  810ms (transform 67%, import 22%, tests 8%, worker 4%)

  Transform  transforming modules took 5.00s · 67% of tracked time, re-done on every run
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
dist/assets/index-DCgNaWia.js                            340.20 kB │ gzip: 102.55 kB

✓ built in 313ms
```

- (Codex 기록 당시 다음 차례는 리뷰(Claude)였다. 리뷰 PASS 뒤 다음 차례는 위 "현재 작업 상태"를 따른다.)

Codex (GPT-5)

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
- **PR #30 휴대폰 구성 접기 + 실습 후속 (병합 완료, `63515a6`)**: 900px 이하에서 실습 ②와 사례 상세 네트워크 구성을 CSS 접기(`.mobile-fold`, 넓은 화면은 요약 줄 숨김·펼침), `입력에서 보기`는 접기를 먼저 엶. F19 안내 뒤 ② 제목 포커스, F20 바뀐 것 없는 처음 상태로 무시, F21 실습 삭제 되돌리기, F22 홈 문구, F23 옛 문서 정리. R1(사용자 결정)으로 폭 360 대응: 요약 줄에서 확인할 것 개수 뺌, ③ 안내 `예상은 계산에 쓰지 않고 비교만 합니다.`, 휴대폰 실습 간격. Claude 재리뷰 PASS(360×800·375×812 실습 01·02·03의 ③ 제목·라디오·안내가 고정 줄 위, 1280 무변화).
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
- [ ] ~~Cisco 설정 붙여넣기 ①`interface`/`ip address` ②`ip route`~~ — **제외(2026-10-05 사용자 확인: 수업은 Cisco·pfSense를 쓰지 않음)**. 대체 기능은 사용자 결정 대기

**3주차 (10-12~10-18, 해커톤 1차 주말 — 가볍게)**
- [x] 실제 결과 붙여넣기(ping·Nmap 출력 → 실제 결과 입력 후보) — ④ (PR #16 병합 완료, `309238d`)
- [x] 오탐·미탐 대시보드 — ⑤ (PR #17 병합 완료, `6c7c9b1`)
- [x] ACL 점검(가려진 규칙·중복·열린 범위) — ③ (PR #18 병합 완료, `c19f554`)
- [x] 판정기 화면 개선(critique 23/40 우선 문제 5개) — ② **PR #21 병합 완료 `388a9cf`**, F5·F6 비차단 후속 유지
- [ ] ~~Cisco 설정 붙여넣기 ③`access-list`/`ip access-group`~~ — **제외**(위와 같은 이유)
- [ ] **배포**(사람 트랙과 함께) — 4주차 테스트 전에 공개 URL

**F5·F6 다음 기능 순서 (2026-10-05 사용자 합의 — 아래 4·5주차 목록의 순서를 대신한다)**
수업은 Cisco·pfSense를 쓰지 않고 Cloudflare·Graylog·Wazuh·n8n·Kali Linux를 쓴다. 기능마다 설계 → 승인 → 구현 → 리뷰 → 병합 한 바퀴. 11-01 기능 동결 원칙은 그대로다.
1. [ ] 변경 전/후 판정 비교 — ②
2. [ ] NetProof 로그인 실패·계정 잠금 기록을 Graylog·Wazuh로 보내기(로컬 시연) — 운영·④ **+ 학습실에 Graylog·Wazuh 공부 주제**(개념 설명·NetProof 로그가 어떻게 보이는지·공식 문서 출처) — 사용자 요청
3. [ ] n8n 연동 예시(AI 답 → `/api/verify` → 결과 알림 워크플로, 문서·예시 중심)
4. [ ] 원인 태그·통계("가장 많이 틀린 원인 Top 5") — ⑤, 배포 뒤
5. [ ] 불일치 사례 → 회귀 테스트 내보내기, 엔진 버전별 재판정 — ④
6. [ ] 구성도 그림 + 경로 재생 — ②
7. [ ] 연습 문제 모드 다시 정의("채점" 없이, AGENTS.md 원칙) — ⑤
8. [ ] Batfish 차등 테스트(엔진 검증용, 수업과 거리 있어 낮춤) — ④
- Kali: 기존 실제 결과 붙여넣기(PR #16, Nmap·ping)가 수업과 맞는다. Cloudflare 활용은 수업 용도를 확인한 뒤 정한다.

**4주차 (10-19~10-25) — 사용자 테스트 주간, 기능은 병행** (항목은 위 순서로 옮김)
- [x] 수정 후보 제안("무엇을 바꾸면 통하나") — ② **PR #19 병합 완료, 8be25a8**

**6주차 (11-02~11-08)**: 버그 수정만, 2차 테스트, 발표·제출

**사람 트랙 (동시에, LLM에 넘기지 않음)**
- [ ] 동기 3명 인터뷰 · [ ] 실제 결과가 있는 사례 모으기(붙여넣기 기능의 재료) · [ ] 사례 04 손계산
- [x] **수업 ACL이 Cisco인지 pfSense인지 확인** — 둘 다 아님(2026-10-05). 수업 도구는 Cloudflare·Graylog·Wazuh·n8n·Kali Linux 등 · [x] **오탐·미탐 양성 정의: 통신 차단(DENY)** · [ ] 표어 결정
- [ ] 배포(Vercel·Supabase 가입, 비밀값) · [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

**위험**: 4주차 전에 ①~⑤의 핵심(하이라이트·목록 필터·정책 검증·오탐/미탐·실제 결과 붙여넣기)이 끝나지 않으면 사용자 테스트가 흔들린다. 밀리면 4·5주차 항목부터 미룬다.

- [x] **홈·학습실·헤더 MVP(2026-10-04 추가)** — ①② PR #23 병합(`82975e6`).
- [x] **홈·학습실 개선(critique 27/40, 아이디어 A~D)** — ①② PR #24 병합(`b8bb8e8`).
- [x] **홈·학습 2차(계산 범위 띠·퍼즐 주 행동·실습마다 예상·진입 카드 예상 바꾸기)** — ①② PR #25 병합(`397ee0d`).
- [x] **비교 배너 톤·실습 흐름 다듬기** — ② PR #26 병합(`11c6ac2`).
- [x] **후속 F15~F17 + 수동 QA 준비 도구·체크리스트** — ② PR #27 `2ad04a0`, QA 서버 동시 연결 PR #28 `8268789`. 수동 QA는 사람 대기.
- [x] **실습 화면 + 라이트 기본(프로그래머스 벤치마크, 2차 설계)** — ①② PR #29 병합(`f034bff`).
- [x] **휴대폰 구성 접기(F18·F4) + 실습 후속 F19~F23** — ①② PR #30 병합(`63515a6`).
- [ ] **판정기 알림·조사 정리(F5·F6)** — ② **PR #31 Claude 리뷰 PASS, 사용자 병합 결정 대기 — codex/judge-notice**. 비차단 후속 F24(저장 제목 되돌리기)
- [x] **사례 게시판 학습형 UI 1차(2026-10-03 추가)** — ①②④ PR #20 사용자 지시로 병합(`c2a998d`). **사용자 G2/삭제 취소 수동 QA는 별도 대기 유지.**

## 다음 LLM이 확인할 내용
- **사용자:** PR #31 병합 결정. 병합 뒤 다음 과제는 위 "F5·F6 다음 기능 순서" 1번(변경 전/후 판정 비교) 설계다.
- **비차단 후속 F24(PR #31 리뷰, Claude 설계 누락):** 빈 템플릿을 고치지 않고 판정한 뒤 `사례로 저장` 제목을 적고 예시를 불러오면, 되돌리기 알림 없이 제목이 지워진다(이 PR 전에는 되돌리기로 복구됐다). `load()`는 늘 제목을 지우고, 되돌리기는 `{ draft, title }`을 저장한다. 고치는 방법은 `hasCurrentInput(current) || !!contextNow.current.title.trim()` 한 줄과 테스트 하나다. 같은 입력을 다시 불러올 때 제목이 지워지는 기존 동작과 묶어 작은 후속으로 다룬다.
- 접기는 CSS(`.mobile-fold`)로만 하고 React로 `open`을 관리하지 않는다. 넓은 화면은 지금과 같아야 한다. 판정기는 접지 않는다.
- 실습 입력은 `practiceDrafts`에만 두고 판정기 `draft`는 `판정기로 가져가기`(기존 되돌리기) 때만 바꾼다. 실습 화면은 verify만 부르고 비교를 다시 계산하지 않는다(ADR-001). 정답·채점·완료 표시를 만들지 않는다.
- 첫 방문 안내 줄과 테마의 localStorage는 try/catch. 떠 있는 투어는 만들지 않는다. cases JSON은 테스트에서만 import한다.
- 수동 QA 결과는 사람이 `docs/qa-manual.md`로 기록한다. AI가 대신 완료로 바꾸지 않는다.
- 판정기 규칙(배너 문장, 되돌리기 한 단계, 즉시 검사가 판정을 막지 않음, ACL 점검 펼침 조건)을 바꾸고 싶으면 먼저 요청한다.

## 사용자 수동 QA 대기 (PR #20 G2·삭제 취소 + 홈·실습 흐름)
- **A(PR #20 G2)·B(실제 기본 확인창 삭제 취소)·C(홈·실습 흐름): 사용자 수동 확인 대기.** 도구 실행 확인과 F15·F17 구현 검증은 수동 QA 통과가 아니다.
- 병합 뒤 [체크리스트](docs/qa-manual.md)와 `scripts/qa_local.py`로 사람이 직접 확인한다. 결과는 사람이 PR 코멘트나 이 절에 적는다. 비밀번호·쿠키·토큰은 기록하지 않는다.
- 원칙: 임시 DB·합성 계정/사례만 쓴다. 실제 기본 확인창을 대체·우회하지 않는다. 비밀번호·쿠키·토큰을 기록하지 않는다. 확인한 항목만 완료로 바꾼다.
- F5·F6(판정기 빈 템플릿 알림, 조사)은 이번 과제(codex/judge-notice)다.

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

현재 판정기 알림·조사 정리(F5·F6) 설계: Claude (Claude Opus 5.5).
