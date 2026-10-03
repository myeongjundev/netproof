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
- 작업: **사례 게시판 학습형 UI 1차** — 기존 기능의 배치·여백·정보 위계를 정리한다.
- 사용자 요청(2026-10-03): 백준/정처기 학습 사이트의 좋은 화면 구성 패턴을 NetProof에 적용. 시작 안내·사례 목록·사례 상세 개선 제안에 “진행해”.
- 기반: origin/main `c19f554`(PR #18 병합 완료). PR #19는 OPEN/Claude 독립 리뷰 대기로, 변경하지 않는다.
- 브랜치: `codex/case-learning-ui`. 별도 managed worktree에서 진행하며 원래 폴더는 `codex/acl-suggest` 그대로 유지한다.
- PR: https://github.com/myeongjundev/netproof/pull/20 (Draft, main 대상). 설계 기록 183aaa2/78e6648. 사용자 G0 승인(2026-10-03 “진행하자”) 후 허용 파일에 구현했다. 병합 승인 없음.
- 단계: **G0 사용자 승인 완료 → G1 구현·네 명령·12캡처 완료, 브라우저 전수 QA는 미완료 → G2 사용자 화면 확인 및 남은 QA → G3 Claude 리뷰 → G4 사용자 병합 결정.**
- 다음 차례: **사용자 화면 확인(G2) 및 삭제 취소 수동 확인**. 모두 확인하기 전 Draft 유지, Claude 리뷰/병합으로 자동 진행하지 않는다.
- 설계 전문: [docs/case-learning-ui.md](docs/case-learning-ui.md). 계약의 모든 표·수치·문구·금지 항목을 기준으로 한다.
- self=“사람 예상”도 승인된 설계 문구로 적용했다. ResultPanel의 기존 “내 예상”은 그대로 유지했다.

## 작업 정의

### 1) 목표와 화면
- 판정기 기존 `page-head`에 3단계 시작 안내. 기존 예시 불러오기·처음 구성·실습 과제 유지. 새 라우트 없음.
- 게시판은 4열 의미 표를 유지하고, 모바일 640px 이하에서는 행을 카드형 그리드로 표시. 제목·#id·작성자·날짜·NetProof 계산·받은 답 비교·실제 결과/확인 상태를 구분한다.
- 기존 검색·7필터·초기화·페이지·주소→조건 동기화·늦은 조회 취소 유지. 모든 적용 필터의 사실 문구만 보완한다.
- 상세: 기존 머리/동작 → 읽기 전용 네트워크 구성 → 받은 답/기존 ResultPanel과 실제 결과의 분리. 저장된 객체를 표시할 뿐 규칙·경로·판정을 다시 계산하지 않는다.
- 세 출처 구분: claim.source=받은 답 출처 / actual.source+note=실제 결과 출처 / 외부 사이트=디자인 참고(문서에만, 사례 증거 아님).
- CaseSummary에는 flow가 없다. 목록에 통신 주소/목적을 만들어 넣거나 상세 N+1 요청을 하지 않는다.

### 2) 허용 파일 (G0 승인 완료)
- 신규: `web/src/caseView.ts`, `web/src/caseView.test.ts`, `web/src/components/CaseNetwork.tsx`.
- `web/src/pages/JudgePage.tsx`: page-head 블록만.
- `web/src/pages/CasesPage.tsx`: 표 머리/셀 표시, 적용 조건 문구만.
- `web/src/pages/CaseDetailPage.tsx`: 설계 3-3절 배치/받은 답 영역/CaseNetwork/비소유자 출처 dt/오류 목록 링크만. 기존 상태·핸들러·props 유지.
- `web/src/styles.css`: 끝의 사례 학습형 UI 블록과 기존 board 640px 규칙만.
- 문서: `docs/case-learning-ui.md`, `HANDOFF.md`, `decisions/ai-work-log.md`.

### 3) 금지
- engine/**·server/**·cases/**·expect·semantics·types/api/router/App·ResultPanel/Badges·기존 테스트·새 의존성 변경 없음.
- 기존 판정·ACL 점검·저장/관측·권한/로그인 의미 불변. 새 요청·상태·API·DB 변경 없음.
- 정답·난이도·점수·랭킹·진도·태그·회원 기능·LLM·자동 적용·배포·병합 없음.
- 외부 문제/문구/브랜드/색상 복사, 가짜 사례/통계/출처 없음.

### 4) 검증 (구현 단계)
- 표시용 순수 함수 5개·입력 불변·빈값/누락·ACL 공유/줄 번호·필터 문구를 신규 테스트에 고정한다(설계 6절).
- 네 명령을 직접 실행하고 전체 출력을 기록한다. 구현 전 main 기준은 294+2 xfail / 88+1 skip / web114 / build 성공이었다. 아래 완료 절은 구현 후 실제 결과다.
- 임시 SQLite만 사용, 3화면×1280/375×812×라이트/다크 캡처. 출처 구분·검색/빈 결과/오류/이전 결과·권한/관측/복제·주소/로그인 복귀·요청 수·키보드·넘침·콘솔을 확인한다(설계 9절).
- UI 시험 데이터는 합성이며 실제 장비 결과를 증명하지 않는다. 예상 오류 재현 시의 console/network error는 정상 흐름 오류와 구분해 기록한다.

### 5) PR #19 분리
- 현재 UI 작업에서 PR #19 commit을 cherry-pick/병합하지 않는다.
- 겹치는 파일은 JudgePage.tsx·styles.css·HANDOFF.md·작업로그. UI는 소개 블록만, PR #19는 결과 후보 블록이므로 변경 영역을 나눈다.
- 병합 순서는 사용자가 정한다. 뒤 작업은 origin/main을 merge하고 충돌 정리 뒤 네 명령과 판정기 동작을 다시 확인한다. force/rebase/main 직접 push 금지.
- #19의 현재 완료 내용·리뷰 인계는 그 브랜치 HANDOFF와 PR 코멘트에 보존되어 있다.

## 완료 내용 / 테스트 결과
- 승인된 시작 안내·4열 게시판/모바일 카드·읽기 전용 네트워크 구성·받은 답 출처 영역을 구현했다. 순수 표시 함수 5개와 신규 테스트 27개. 기존 상태/핸들러/ResultPanel props/배지/검색/저장 의미는 유지했다.
- 변경: 허용된 UI 7파일(신규 3개 포함)과 문서 3개만. 엔진/서버/기준 사례/expect/기존 테스트/의존성/금지 파일 diff 없음. 새 API·상태·N+1 없음. git diff --check 성공.
- PR19 겹침 직접 확인: JudgePage.tsx, styles.css, HANDOFF.md, decisions/ai-work-log.md. #19를 병합/cherry-pick하지 않았다. 판정기 page-head와 CSS 별도 블록만 수정.
- 아래 네 명령은 최종 코드에서 직접 실행했다(2026-10-03). 기준 294+2 xfail / 88+1 skip / 웹114 → 이번 294+2 xfail / 88+1 skip / 웹141. Python에는 worktree engine/src·server PYTHONPATH를 지정했으며 기존 ignored .venv/node_modules junction을 사용했다. 설치/운영 DB 변경 없음.

### `cd engine && ../.venv/Scripts/python -m pytest -q`

```text
........................................................................ [ 24%]
........................................................................ [ 48%]
........................................................................ [ 72%]
........................................................................ [ 97%]
......xx                                                                 [100%]
294 passed, 2 xfailed in 4.79s
```

### `cd server && ../.venv/Scripts/python -m pytest -q`

```text
.......................................................................s [ 80%]
.................                                                        [100%]
88 passed, 1 skipped in 29.27s
```

### `npm --prefix web test`

```text
> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/Users/dora2/.codex/worktrees/case-learning-ui/netproof/web


 Test Files  12 passed (12)
      Tests  141 passed (141)
   Start at  21:06:49
   Duration  600ms (transform 63%, import 21%, tests 11%, worker 5%)
```

### `npm --prefix web run build`

```text
> netproof-web@0.1.0 build
> tsc --noEmit && vite build

vite v8.3.1 building client environment for production...
transforming...
✓ 43 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                            0.62 kB │ gzip:  0.45 kB
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
dist/assets/index-DsVCKh9a.css                            68.17 kB │ gzip: 20.07 kB
dist/assets/index-Bf2zEbrK.js                            307.57 kB │ gzip: 93.24 kB

✓ built in 324ms
```


### 임시 DB 브라우저 확인 (2026-10-03)
- localhost:5183, 무작위 netproof-case-ui-…/qa.db만 사용. UI로 작성자 A·검토자 B 가입, init-db/make-reviewer는 같은 임시 DB에만 실행. UI에서 QA1(예시01/AI DENY/QA 도구), QA2(예시02/답 없음), QA3(예시03/사람 PASS)를 저장했다. 실제 장비 실험이 아닌 합성 UI 시험 데이터다.
- 3화면 × 1280×900/375×812 × 라이트/다크 = PNG 12개 저장·화면 확인. 파일명은 judge|cases|detail-1280|375-light|dark.png. 캡처는 로컬 산출물이며 저장소/운영 DB에는 넣지 않았다.
- 배치: 데스크톱 안내 3열/게시판 4열/상세 구성 후 2열; 모바일 안내 1열/게시판 카드/상세 구성→받은 답→판정→실제 결과. 양쪽 폭·테마에서 body.scrollWidth=화면 폭(1280/375), 가로 넘침 없음. 모바일 판정 단추 fixed 유지.
- 기능 흐름은 주로 1280 라이트에서 확인했고 모바일/다크에서는 판정·ACL Enter/Space·배치 스모크 검사를 했다. 모든 기능을 네 조합 각각에서 전수 재실행한 것은 아니다.
- 예시 01~03/처음 구성/판정, 링크 복사→새 탭 #/s/… 복원, 저장 구성→판정기 ACL 2줄 원문 일치, 복제 제목 “복제 · …”/답 비우기를 확인했다.
- 목록 제목/#id/작성자/날짜, AI 답과 계산/사람 예상과 계산/받은 답 없음, 일곱 필터+내 사례 조건 문구, 검색/초기화/직접 comparison=DISAGREE 주소/0건/1페이지와 이전·다음 비활성을 확인했다.
- 받은 답 출처와 실제 결과 입력을 분리했다. QA3 실제 결과는 PASS·ping 선택/합성 메모로 저장. TCP22와 맞지 않는 ping/TCP443 출력 거절, 맞는 합성 Nmap TCP22 출력 후보→적용→저장 확인. ping 출처 선택은 표시 QA용이며 실험 증거가 아님을 메모에 명시했다.
- B 확인→기준 사례 JSON 읽기 전용 생성→확인 거두기→다시 확인. B 대시보드 표시/A 미표시. 로그아웃 후 #/cases/3 로그인 요구→A 로그인→같은 상세 주소 복귀. QA1은 아래 삭제 검사 복구 후 없어 로그인 복귀 검사는 살아 있는 QA3에서 했다.
- #/cases/9999 오류와 “사례 게시판으로” 링크 확인. 서버 실제 중단 후 조건 변경→Failed to fetch/다시 시도/이전 조회 결과→같은 DB 서버 재시작→다시 시도 성공.
- ACL summary Enter로 열림/Space로 닫힘, Tab이 다음 출력 붙여넣기 summary로 이동, :focus-visible solid 테두리 확인. 정상 흐름 console error 0(수집 로그 []); 오류 재현은 별도 테스트로 기록.
- 요청 수는 브라우저 Network UI 대신 Flask 접근 로그로 확인(도구는 console 로그만 제공). 판정기 examples 1회, 목록 기존 2회, 상세 1회. 목록 표시 중 상세 N+1/새 엔드포인트 없음:
```text
21:03:39 GET /api/examples 200
21:04:11 GET /api/cases?page=1&per_page=20 200
21:04:11 GET /api/cases?page=1&per_page=20 200
21:04:48 GET /api/cases/3 200
```
- **미확인: 삭제 확인창에서 취소.** 기존 삭제 버튼 클릭 후 브라우저 입력/상태 조회가 timeout, getJsDialog는 undefined, 탭 종료도 중단되었다. 안전 복구 후 QA1이 목록에서 없어졌으나 정확한 원인은 확인하지 못했다. 취소/미삭제를 PASS로 적지 않는다. 변경하지 않은 기존 window.confirm 핸들러를 사용자 G2에서 수동 확인해야 한다. 기존 서버/DB에는 영향 없음.
- 정리: 검사 탭 종료/뷰포트 reset/테마 기기 설정 복원. 검사 서버가 더 이상 5183에서 듣지 않음을 확인했다. 검증한 절대 경로의 임시 폴더와 QA DB(계정·시험 사례)를 삭제, Test-Path=False. 캡처 12개는 화면 확인용으로 보존.

## 현재 과제 리뷰 기록
- G0 승인 후 구현/직접 테스트/12캡처 완료. 독립 코드 리뷰는 아직 없음. 삭제 취소 QA와 사용자 G2 화면 확인 대기, PR20 Draft 유지.

## 이전 과제 기록 (요약)
- PR #19 수정 후보: 별도 codex/acl-suggest, b65a28b, OPEN/Claude 리뷰 대기. 구현 326+2 xfail/91+1 skip/web128/build 성공, 현재 작업에 포함하지 않음.
- PR #18 ACL 점검: 사용자 병합 완료 c19f554. 294+2 xfail/88+1 skip/web114/build 성공.
- 그 이전 과제 상세/비차단 후속은 main의 이전 HANDOFF와 decisions/ai-work-log.md에 유지되어 있다. 이번 UI 범위에 포함하지 않는다.

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
- [x] ACL 점검(가려진 규칙·중복·열린 범위) — ③ **PR #18 병합 완료, c19f554**
- [ ] Cisco 설정 붙여넣기 ③`access-list`/`ip access-group`
- [ ] **배포**(사람 트랙과 함께) — 4주차 테스트 전에 공개 URL

**4주차 (10-19~10-25) — 사용자 테스트 주간, 기능은 병행**
- [ ] 수정 후보 제안("무엇을 바꾸면 통하나") — ② **PR #19 구현 완료, 독립 리뷰 대기(별도 브랜치)**
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

- [ ] **사례 게시판 학습형 UI 1차(2026-10-03 추가)** — ①②④ 기존 기능 화면 정리, 구현·테스트·12캡처 완료 → 사용자 화면 확인/삭제 취소 QA.

## 다음 LLM이 확인할 내용
- UI 작업은 `codex/case-learning-ui` worktree에서 git pull 후 이 문서와 docs/case-learning-ui.md를 읽는다. 원래 폴더의 PR #19 인계를 덮어쓰지 않는다.
- 사용자 G0 승인 완료. self=“사람 예상”을 적용했고 ResultPanel의 “내 예상”은 그대로다.
- 다음은 사용자 G2 화면 확인 및 미확인 삭제 취소 QA. 임시 DB는 정리했으므로 수동 재현 시 새 임시 DB/합성 사례로 한다. G2 완료 후에만 Claude 독립 리뷰를 요청한다. 배포·병합 자동 진행 없음.

설계: Claude (Claude Opus 5.5), 구현·테스트·기록: Codex (GPT-6)
