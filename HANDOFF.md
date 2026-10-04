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
- 작업: **QA 로컬 서버 동시 연결 수정**. PR #27 병합 후 발견한 빈 연결에 의한 응답 멈춤을 처리한다.
- 근거: [PR #27 최신 Claude 코멘트](https://github.com/myeongjundev/netproof/pull/27#issuecomment-5979592996). 이전 순차 HTTP·test client 검사는 이 결함을 드러내지 못했다.
- 사용자 승인: 이번 지시의 threaded=True·동시 연결 회귀·실제 브라우저 로그인/목록/상세·종료 안내 보강.
- 브랜치: `codex/qa-threaded`, 최신 main `2ad04a0`(PR #27 merge)에서 새로 생성. worktree `C:/gov/project/skt aleph/netproof-judge-ux`.
- 단계: 수정·검증 → Claude 리뷰 PASS → 사용자 병합 결정. 다음 차례: **사용자 — PR #28 병합 결정**(Claude 리뷰 PASS, `7c75bc3`). 병합하지 않는다.
- 임시 SQLite·127.0.0.1 전용·DATABASE_URL 무시·비밀번호 콘솔만·배포물 미연결은 유지한다. 수동 QA A·B·C 결과는 사람이 기록한다.

## 작업 정의
### 1) 동시 요청 수정
- `scripts/qa_local.py`의 make_server 호출에 `threaded=True`만 추가한다. 엔진·서버 앱/API·QA 계정/사례 구성·배포·화면은 변경하지 않는다.

### 2) 회귀 테스트
- `server/tests/test_qa_local.py`: QA main이 넘긴 옵션 그대로 실제 loopback 서버를 연다(포트만 OS 할당).
- 빈 TCP 연결을 먼저 열고 요청 핸들러 수락을 Event로 확인한 뒤 첫 연결을 유지하면서 두 번째 GET이 제한 시간 안에 200으로 응답하는지 확인한다.
- finally에서 두 연결 닫기·서버 shutdown·스레드 join. 기존 CLI mock은 threaded=True도 검사한다. 비밀번호는 테스트 출력에 기록하지 않는다.

### 3) 브라우저·종료 안내
- 실제 QA CLI에 브라우저로 로그인·목록·상세가 열리는지 확인해 기록한다. 수동 QA A·B·C 완료로 대신 표시하지 않는다.
- `docs/qa-manual.md`에 강제 종료하면 임시 폴더가 남을 수 있으니 Ctrl+C로 끈다고 보강한다.

### 4) 범위·완료
- 허용: `scripts/qa_local.py`, `server/tests/test_qa_local.py`, `docs/qa-manual.md`, `HANDOFF.md`, `decisions/ai-work-log.md`만.
- 네 명령 전체 출력·브라우저/도구 확인, 작업 로그 한 줄, 다음 차례 리뷰(Claude), 커밋·푸시·PR. 병합하지 않는다.

## 완료 내용 / 테스트 결과 (2026-10-04 Codex)

- `make_server(..., threaded=True)` 한 줄 변경. 격리·호스트·시드·출력, 서버 앱·엔진·배포물·화면은 그대로다.
- 새 동시 연결 회귀는 수정 전 `TimeoutError: timed out`, `1 failed, 10 deselected in 4.21s`로 결함을 재현했다. 수정 뒤 QA 도구 전체 `11 passed in 4.34s`. 첫 연결의 서버 수락 Event 뒤에만 두 번째 GET을 보내며, 첫 빈 연결이 열린 채 200·JSON 응답을 확인한다. 테스트가 threaded를 강제하지 않고 실제 QA main이 넘긴 옵션만 사용한다.
- 강제 종료 시 임시 폴더 잔존 가능·Ctrl+C 종료 안내 보강. `git diff --check` 오류 없음.
- **사용자 수동 QA A·B·C는 대기 유지.** 아래는 도구 응답 확인이며 G2·실제 기본 확인창 취소·홈 흐름 QA 완료를 대신한 기록이 아니다. F5·F6·reduced-motion 실브라우저 미확인은 그대로다.

### 실제 CLI·브라우저 확인 (비밀번호 제외)

- 실제 명령: `.venv/Scripts/python scripts/qa_local.py --port 4862`. 가짜 PostgreSQL DATABASE_URL을 설정해도 새 임시 SQLite 사용.
- 저장소 밖 검증 하네스가 **실제 CLI를 변경 없이 실행**했다(별도 threaded 래퍼 앱이 아님). 빈 TCP 연결 하나를 유지한 채 GET / 200. 브라우저 확인이 끝날 때까지 이 연결을 계속 열어 뒀다.
- computer-use로 Codex in-app browser에서 실제 폼 로그인:
  - **1280×800 라이트 / qa_author:** 로그인 뒤 헤더 닉네임·일반 등급 → 사례 게시판 검색 결과4 → QA AI 답 · 합성 실제 결과 · 검토 확인 상세 `#/cases/1` 제목 표시 → 상세 새로고침 응답 → 로그아웃.
  - **375×812 라이트 / qa_reviewer:** 로그인 뒤 닉네임 → 목록4 → 같은 사례 상세 제목·주소 표시 → 로그아웃.
  - 필터·삭제·확인창 조작 없음. 사례/실제 결과 저장 없음.
- 비밀번호는 자식 콘솔에서 **메모리·일회성 로컬 IPC**로만 전달해 브라우저 폼에 입력했다. 값·쿠키·CSRF는 도구 출력/파일/저장소/캡처/PR에 기록하지 않았다. 입력 뒤 자격 증명 변수 제거.
- 검증 탭 닫음·viewport reset. 검증 프로세스와 4862 listen 없음 확인. 비대화형 하네스 종료에서는 이번 임시 폴더가 남아, 정확한 대상(이번 생성 `netproof-qa-kcfzkwt_`, 내부 `qa.db` 하나)을 확인한 뒤 DB와 빈 폴더를 각각 삭제했다. **정상 Ctrl+C 자동 정리 성공으로 주장하지 않는다.** 다른 임시 폴더는 건드리지 않았다. 합성 데이터는 도구 재실행으로 새로 준비할 수 있다.
- 캡처: 저장소 밖 `C:/Users/dora2/.codex/visualizations/qa-threaded-2026-10-04/`, author-cases/detail-1280.png·reviewer-cases/detail-375.png. 비밀번호 화면 캡처 없음.

```text
CLI GET / with idle first TCP connection held: 200
Fake DATABASE_URL ignored; temporary SQLite exists=True
READY: actual CLI on 127.0.0.1:4862; idle TCP connection remains open during browser checks.
Credentials are RAM/one-shot IPC only; never printed in verification records.
QA listen count after shutdown: 0
QA verification directory removed: True
```

### 네 명령의 실제 전체 출력

모든 exit code 0. 서버 테스트 전에 NETPROOF_TEST_DATABASE_URL을 프로세스 환경에서 제거하여 임시 SQLite만 사용했다. 기존 skip/xfail을 통과로 바꾸지 않았다.

### cd engine && ../.venv/Scripts/python -m pytest -q

```text
........................................................................ [ 21%]
........................................................................ [ 43%]
........................................................................ [ 65%]
........................................................................ [ 87%]
......................................xx                                 [100%]
326 passed, 2 xfailed in 5.72s
```

### cd server && ../.venv/Scripts/python -m pytest -q

```text
.......................................................................s [ 69%]
...............................                                          [100%]
102 passed, 1 skipped in 37.07s
```

### npm --prefix web test

```text

> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/gov/project/skt aleph/netproof-judge-ux/web


 Test Files  24 passed (24)
      Tests  316 passed (316)
   Start at  21:08:36
   Duration  781ms (transform 67%, import 20%, tests 8%, worker 4%)

  Transform  transforming modules took 4.67s · 67% of tracked time, re-done on every run
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

✓ built in 403ms
```

구현·테스트: Codex (GPT-5).



## 현재 과제 리뷰 기록
### PR #28 Claude 독립 리뷰 (2026-10-04, HEAD `7c75bc3`) — **PASS**
- diff: 코드는 `scripts/qa_local.py`의 `threaded=True` 한 줄과 `server/tests/test_qa_local.py`(동시 연결 회귀), `docs/qa-manual.md` 강제 종료 안내뿐이다. 엔진·서버 앱·배포물·화면 변경은 0이다.
- Claude 직접 실행: 엔진 `326 passed, 2 xfailed in 3.43s` · 서버 `102 passed, 1 skipped in 34.72s` · 웹 `24 files, 316 passed` · 빌드 `✓ built in 255ms`.
- 실제 도구 확인(Claude 스크립트, 비밀번호는 읽기만 하고 출력·기록하지 않음):
  - 가짜 `DATABASE_URL`을 설정한 채 `scripts/qa_local.py --port 4872`를 실행하고, **빈 TCP 연결 두 개를 열어 둔 상태에서** 진행했다.
  - `qa_author`(user)·`qa_reviewer`(reviewer)로 로그인되고, 사례 4건이 보이고, `/`는 200이다.
  - CTRL_BREAK로 종료하니 exit 0이고 임시 폴더가 삭제됐다. 수정 전에는 같은 상황에서 응답이 멈췄다(PR #27 코멘트).
- 회귀 테스트는 첫 연결이 서버에 **수락**된 것을 확인한 뒤(backlog 대기 거짓 양성 방지) 두 번째 요청을 보낸다. main이 넘긴 옵션을 그대로 쓰므로 `threaded`를 빼면 실패한다(Codex 기록: 수정 전 TimeoutError).
- 사용자 수동 QA A·B·C는 사람이 기록할 대기 상태 그대로다.

## 이전 과제 리뷰 기록 (PR #27)
### PR #27 Claude 독립 리뷰 (2026-10-04, HEAD `a585a1a`) — **PASS**
- 근거: `git diff origin/main...HEAD` 14파일. 엔진·서버 앱 코드 변경 0(`server/tests/test_qa_local.py`만 추가). 배포물(`api/`, `vercel.json`)은 그대로다. 승인 설계 6절 허용 목록 안.
- Claude 직접 실행: 엔진 `326 passed, 2 xfailed in 3.64s` · 서버 `101 passed, 1 skipped in 35.30s`(QA 도구 테스트 포함) · 웹 `24 files, 316 passed` · 빌드 `✓ built in 245ms`.
- QA 도구 실제 실행(Claude 스크립트, 비밀번호는 읽기만 하고 출력·기록하지 않음):
  - `DATABASE_URL=postgres://…`(가짜)를 설정한 채 `scripts/qa_local.py --port 4871`을 실행했다. 새 OS 임시 폴더의 SQLite로 열렸다.
  - `qa_author`(user)·`qa_reviewer`(reviewer)로 로그인되고, 각각 사례 4건이 보이고, `/`는 200이다.
  - CTRL_BREAK로 종료하니 exit 0이고 임시 폴더가 삭제됐다. 서버는 `127.0.0.1`에만 열린다(`make_server("127.0.0.1", …)`).
- 코드 대조:
  - F15: `startPractice` 뒤 `focusPractice`가 `#practice-title`로 포커스를 옮기고, revision이 바뀌면 버린다.
  - F16: `motion.ts` `scrollTo` 한 곳으로 세 스크롤을 모았다(reduced-motion이면 `auto`).
  - F17: 학습 상세 부제 `이 실습에서 볼 것: …`, 실습 안내 문구는 받은 답 유무에 따라 바뀐다.
  - 체크리스트 `docs/qa-manual.md`는 A(PR #20 G2)·B(실제 확인창 취소)·C(홈 흐름)·D(사람 기록)이며, AI가 완료로 바꾸지 않는다고 적었다.
- 브라우저 미확인: Claude 창이 가려져 requestAnimationFrame이 멈추는 환경이라 F15 포커스를 직접 재현하지 못했다. 이 도구에는 reduced-motion 에뮬레이션도 없다. 두 동작은 `focusPractice`·`scrollTo` 단위 테스트와 Codex 기록으로 확인했다. **사용자 수동 QA C에서 포커스 항목을 사람이 확인한다.**
- 남은 것: 사용자 수동 QA A·B·C(병합 뒤), F5·F6.

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
- **PR #27 F15~F17·QA 준비 도구 (병합 완료, `2ad04a0`)**: 독립 리뷰 PASS 뒤 병합. 순차 검사에서 놓친 단일 스레드 QA 서버의 빈 연결 응답 멈춤은 이번 codex/qa-threaded에서 수정한다. 사용자 수동 QA·reduced-motion 실브라우저 미확인은 별도다.
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
- [x] **후속 F15~F17 + 수동 QA 준비 도구·체크리스트** — ② **PR #27 병합 `2ad04a0`, 수동 QA는 별도 대기.**
- [ ] **QA 도구 동시 연결 결함 수정** — **codex/qa-threaded 구현·검증 후 리뷰(Claude) 대기.**
- [x] **사례 게시판 학습형 UI 1차(2026-10-03 추가)** — ①②④ PR #20 사용자 지시로 병합(`c2a998d`). **사용자 G2/삭제 취소 수동 QA는 별도 대기 유지.**

## 다음 LLM이 확인할 내용
- PR #28은 Claude 리뷰 PASS(`7c75bc3`). 다음은 사용자 병합 결정, 그 뒤 수동 QA는 사람이 `docs/qa-manual.md`로 기록한다.
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
