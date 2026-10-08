# NetProof 작업 정리 (2026-10-08, 학습 흐름 강화)

작성: Claude (Claude Opus 5.5), 2026-10-08
앞 작업은 [10-06 작업 정리](work-summary-2026-10-06.md)에 있다. 이 문서는 **학습 → 실습 → 기록·복습 흐름 강화** 과제를 요구사항부터 재리뷰 PASS까지 하루에 진행한 기록이다.
근거: `git log`, PR #45·#46·#47 코멘트, 직접 실행한 테스트 출력, 로컬 QA 서버에서 확인한 실브라우저 결과.

## 한눈에 보기

| 항목 | 내용 |
| --- | --- |
| 병합한 PR | 2개 — [#45](https://github.com/myeongjundev/netproof/pull/45) pfSense 1단계 종료 문서(`fab3f5b`), [#46](https://github.com/myeongjundev/netproof/pull/46) 요구사항+설계(`57a9f4d`) |
| 열린 PR | [#47](https://github.com/myeongjundev/netproof/pull/47) 학습·실습·기록·복습 흐름 연결 — **Claude 재리뷰 PASS, 사용자 병합 결정 대기** |
| 흐름 | Codex 요구사항 → Claude 설계(사용자 결정 D1~D3) → Codex 구현 → Claude 리뷰(R1) → Codex 수정 → Claude 재리뷰 PASS |
| 테스트 | 엔진 **478**(+2 xfail, 변화 없음), 서버 149 → **157**(+1 skip), 웹 440 → **485** |
| 바뀌지 않은 것 | `engine/`, `cases/*.json`, DB 표·열(`models.py`), 배포 설정, 판정기 저장 흐름 |

## 1. 사용자가 정한 것

| 번호 | 결정 |
| --- | --- |
| 방향 | 참고 사이트처럼 화면을 재구성하지 않고 **학습 → 실습 → 기록·복습 연결 강화**를 고름 |
| D1 | **실습 화면에서 바로 사례 저장**. 기존 `POST /api/cases`를 그대로 쓰고 「판정기로 가져가기」는 유지 |
| D2 | **사례 ↔ 학습 주제는 저장된 원인 태그로 연결**. DB 변경 없이 옛 사례에도 적용, DENY만 연결 |
| D3 | **「계산 ≠ 실제 결과」 서버 필터를 이번에 추가** |

## 2. 만든 것 (PR #47)

- **실습 ⑤ 기록하기** (`PracticePage.tsx`): 판정 뒤 입력을 바꾸지 않았을 때만 보인다.
  - 로그인함: 기본 제목 `{주제} 실습 · 내 예상 통과|막힘|없음` → 저장 → 사례 상세로 이동. 서버가 판정을 다시 계산해 저장한다.
  - 로그인 안 함: 로그인 링크와 「로그인하러 다녀와도 구성과 예상은 남지만 판정은 다시 해야 하고, 새로고침하면 입력이 사라진다」 안내.
  - 저장 중 두 번 클릭은 요청 1번. 저장 중 재판정·편집 뒤 늦게 성공하면 이동하지 않고 「사례 #N으로 저장했습니다…」와 링크를 보인다(R1 수정).
- **사례 상세 「다시 살펴보기」** (`CaseDetailPage.tsx`, 새 `reviewView.ts`):
  - `relatedLesson`이 저장된 `result`·`cause`·`decisive.step`만 읽어 주제를 고른다. 복귀 방향·경로 문제 → 왕복 경로, ACL + `acl_in` → 입력 ACL, ACL + `acl_out` → 출력 ACL, 그 밖 → 학습실 전체.
  - 「받은 답과 계산」과 「계산과 실제 결과」를 따로 보인다. 실제 결과가 없으면 작성자에게 기록 안내.
- **서버 필터** `GET /api/cases?actual_mismatch=1`: 계산과 실제 결과가 둘 다 PASS/DENY이면서 다른 사례. `confirmed=1`과 함께 쓰면 대시보드 `mismatches_total`과 건수가 같다(테스트로 고정). `docs/semantics.md` §10에 정의 추가.
- **사례 게시판**: 필터 「계산과 실제 결과」와 바로가기 3개 — 내 예상과 계산이 달랐던 내 사례 / 계산과 실제 결과가 다른 내 사례 / 실제 결과를 아직 안 적은 내 사례.

## 3. 리뷰에서 나온 것

| 항목 | 내용 | 상태 |
| --- | --- | --- |
| R1 | 저장 중 재판정하면 사례가 조용히 저장되고, 다시 누르면 중복(#6·#7) — 설계에서 저장 사실 안내를 빠뜨린 Claude 설계 누락 | Codex 수정(`64a2460`) → 재리뷰 PASS |
| N1 | 상세의 「계산과 실제 결과」가 검토 전 불일치를 `확인 전 · PASS`로만 보여 「다름」이 안 드러남 | 비차단, 후속 후보 |
| N2 | 안내 `사례 #N으로`의 조사가 번호에 따라 틀림(#42는 `로`). `사례 #N에 저장했습니다`로 바꾸면 한 줄 | 비차단, 후속 후보 |

## 4. 검증 방법 (오늘 실제로 한 것)

- 리뷰·재리뷰마다 Claude가 엔진·서버·웹 테스트와 빌드를 직접 실행해 Codex 기록과 비교했다(결과 같음, 번들 이름까지 같음).
- `git diff --stat main... -- engine cases server/netproof_api/models.py vercel.json`이 비어 있음을 확인했다.
- `scripts/qa_local.py`(임시 SQLite, 127.0.0.1)로 375×812·1280×900 실브라우저 시나리오를 확인했다. 실제 결과는 **합성 값**이며 실제 장비 관측이 아니다.
- 알게 된 점: 브라우저 도구의 `navigate`는 새로고침처럼 메모리 입력을 지우므로, 로그인 왕복은 화면 안 링크로만 확인해야 한다. QA 서버를 작업 중지로 끄면 임시 폴더 정리가 돌지 않아 직접 지웠다.

## 5. 집에서 이어서 할 일

### 먼저 할 것 — PR #47 병합 결정
1. N2(조사)를 이번 PR에서 고칠지, 그대로 병합하고 후속으로 미룰지 정한다. 고친다면 Codex에게 [PROMPTS.md](../PROMPTS.md) 「4. 수정」으로 N2만 요청하고 Claude 재리뷰.
2. 병합 전 체크(PROMPTS 「5. 최종 확인」): 브랜치를 받아 테스트를 직접 실행, diff에 비밀값 없음.
3. 병합하면 **Vercel이 `main`을 Production(https://netproof-vert.vercel.app)으로 자동 배포**한다. 병합 뒤 공개 주소에서 실습 → 판정 → ⑤ 로그인 안내가 보이는지 확인한다(저장까지 보려면 운영 계정이 필요 — 아래 배포 6단계).

### 사람만 할 수 있는 일 (이전부터 대기)
- 배포 6단계: 운영 사이트 가입 → 사례 저장 → 게시판 확인 → 로그아웃. 닉네임을 알려 주면 Claude가 `make-reviewer`(7단계) 실행. **이번에 만든 실습 저장도 이때 운영에서 처음 확인할 수 있다.**
- D5(pfSense 실습 사실 5가지) — 주면 pfSense 2단계(실습 연동) 설계.
- 수동 QA A~E.

### 후속 후보
- N1 상세 문구, N2 조사.
- pfSense 화면 입력, 방화벽 원인 태그(지금은 `분류 못 함`).
- 로드맵 「F5·F6 다음 기능 순서」 5~8번.

## 6. 집 PC에서 시작하는 명령

```powershell
cd <집의 netproof 폴더>
git fetch origin
git switch main
git pull --ff-only
```

PR #47을 직접 확인하려면:

```powershell
git switch codex/learning-flow
git pull --ff-only
cd engine; ..\.venv\Scripts\python -m pytest -q; cd ..
cd server; ..\.venv\Scripts\python -m pytest -q; cd ..
npm --prefix web test
npm --prefix web run build
```

기대값: 엔진 478 passed·2 xfailed, 서버 157 passed·1 skipped, 웹 485 passed, 빌드 성공.
Claude에게는 「git pull 후 CLAUDE.md, HANDOFF.md, docs/work-summary-2026-10-08.md를 읽고 PR #47 병합 이후를 이어서 하자」라고 시작하면 된다.

참고: 학원 PC 작업 폴더에는 커밋하지 않은 사용자 이미지 2개(`네트워크 2.png`, `호스트 기반으로 작업할 네트워크.png`)가 그대로 있다. 집에서 필요하면 따로 옮겨야 한다.
