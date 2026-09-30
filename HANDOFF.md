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
- 다음 차례: **Codex** — PROMPTS.md 4번, PR #6 리뷰 1·2 수정
- 브랜치 / 마지막 커밋: `codex/acl-highlight` / Claude 리뷰 기록 커밋
- 진행 단계: 리뷰 완료(수정 요청 2건) → 수정 대기
- 한 줄 요약: 로드맵 2주차 전반 — ACL 규칙 줄 하이라이트(이슈 #5)
- 직전 과제: 도달 못 한 목적지 표시 — PR #4 병합. 과정·리뷰 기록은 PR #4와 `decisions/ai-work-log.md`

## 작업 정의 (설계 담당) — ACL 규칙 줄 하이라이트
- **목표**: 판정에 쓰인 ACL을 결과 화면에 줄 단위로 보여 주고, 판정을 가른 줄을 색으로 강조한다(강사님 피드백 ③ 시각화·하이라이트). 지금은 걸린 규칙 한 줄만 글자로 나온다.
- **원칙**: 어느 ACL의 몇째 줄이 걸렸는지는 **엔진이** 알려 준다. 화면은 규칙 문장을 다시 비교하거나 ACL을 다시 평가하지 않는다(ADR-001).
- **엔진** — 추가만, 판정은 그대로
  - ACL 단계(`acl_in`·`acl_out`) Hop에 두 필드 추가: `acl`(ACL 이름), `rule_line`(보낸 줄 목록에서 걸린 줄의 위치, 1부터. 빈 줄·remark도 위치에 센다. 암묵적 deny면 `null`)
  - 다른 단계의 Hop은 두 필드가 `null`
  - 왜 `rule_seq`로는 안 되나: `rule_seq`는 줄에 순번이 있으면(`10 permit …`) 그 숫자라서 줄 위치와 다르다
  - `parse_acl`이 이미 줄 위치(`index`)를 알고 있다. `Rule`에 위치를 담아 `_acl_step`이 Hop에 넣는다. 평가 순서·일치 규칙은 바꾸지 않는다
  - 엔진 버전 `0.1.1` → `0.1.2`
- **화면**
  - `types.ts` `Hop`에 `acl?: string | null`, `rule_line?: number | null`(옛 판정에는 없음)
  - 순수 함수 `aclEvidence(verdict, acls)` → ACL 블록 목록. 가는 길 → 돌아오는 길 순서로, ACL 단계 Hop마다 블록 하나(같은 ACL이 두 번 평가되면 두 블록)
    - 블록: 제목(예: `가는 길 · R1 g0/0 들어올 때 · ACL 101`), 줄 목록 `{ 번호, 문장, 상태 }`, 암묵적 deny 여부
    - 줄 상태 4가지: `걸림-차단`(빨강), `걸림-허용`(초록), `불일치`(검사했지만 안 맞음 — 기본색 + "불일치"), `도달 안 함`(걸린 줄 뒤 — 회색 + "도달 안 함")
    - 암묵적 deny: 모든 줄이 `불일치`이고 목록 끝에 빨간 줄 "암묵적 deny — 모든 줄이 맞지 않음"
    - `acl`·`rule_line`이 없는 Hop(옛 판정)은 블록을 만들지 않는다. 오류 없음
  - `ResultPanel`에 "ACL 근거" 영역. 줄 번호 + 색 + **글자 표시**(색만으로 구분하지 않음). 목록이라 화면 읽기 프로그램에도 읽힌다
  - ACL 줄은 **판정할 때 보낸 네트워크**에서 가져온다. 판정 뒤 입력을 고쳐도(stale) 근거가 바뀐 입력과 섞이지 않게, `JudgePage`는 판정 때 보낸 `network`를 결과와 함께 보관해 넘긴다. 사례 상세는 저장된 `network`를 넘긴다
  - 판정기에서만: 블록마다 "입력에서 보기" 단추 → 그 ACL 입력 칸으로 스크롤하고 해당 줄을 선택(`setSelectionRange`). 입력 칸은 빈 줄을 보내지 않으므로(`toNetwork`) 보낸 줄 위치 → 입력 칸 줄 위치 변환 함수가 필요. 판정 뒤 입력을 고쳤다면 단추를 끈다
- **변경 범위(만질 파일)**: `engine/src/netproof_engine/acl.py`(`Rule`에 위치), `engine/src/netproof_engine/trace.py`(`Hop` 필드·`_acl_step`만), `engine/src/netproof_engine/__init__.py`, `engine/pyproject.toml`, `engine/tests/`(새 테스트), `web/src/types.ts`, `web/src/components/ResultPanel.tsx`(또는 새 `AclEvidence.tsx`), `web/src/components/*.test.ts`, `web/src/pages/JudgePage.tsx`, `web/src/pages/CaseDetailPage.tsx`, `web/src/components/NetworkEditor.tsx`(줄 선택용 ref가 필요하면), `web/src/styles.css`, `HANDOFF.md`. 필요하면 `server/tests/`에 응답 필드 테스트 1개
- **건드리지 않을 것**: ACL 평가 순서·일치 규칙(`Acl.evaluate`, `Rule.matches`), 라우팅·추적 로직, `server/netproof_api/`, `cases/`, `docs/semantics.md`, 새 의존성
- **예상 리스크** (리뷰 때 우선 확인)
  - 판정이 바뀜 → `main` 엔진과 흐름 대량 비교(이번에도 Claude가 새 필드를 빼고 비교한다)
  - 줄 위치 어긋남: 빈 줄·remark·순번(`10 permit`)이 섞인 ACL에서 색이 다른 줄에 칠해짐
  - 같은 ACL이 가는 길·돌아오는 길에 두 번 평가될 때 한 블록으로 합쳐 정보가 사라짐
  - 판정 뒤 입력을 고쳤을 때 근거가 새 입력 기준으로 그려짐
  - 색만으로 구분 / 375px에서 긴 규칙 문장이 페이지를 가로로 넘김
- **완료 조건 (실행 가능한 명령)**
  1. 엔진 테스트 전부 통과(기준선 72 + 새 테스트). 새 테스트 최소:
     - 예시 01 → `acl == "101"`, `rule_line == 1`, `rule_seq == 1`
     - 예시 01 흐름을 포트 80으로 → 허용, `rule_line == 2`
     - `["remark x", "", "deny tcp any any eq 443"]` → `rule_line == 3`
     - 순번 있는 줄 `["10 deny tcp any any eq 443", "20 permit ip any any"]`에서 443 → `rule_seq == 10`, `rule_line == 1`
     - 암묵적 deny → `acl`은 이름, `rule_line`은 `None`
     - ACL이 아닌 단계 → 두 필드 `None`
  2. 서버 테스트 → 기준선 그대로(41 + 1 건너뜀, 새 테스트를 넣었다면 +1)
  3. 화면 테스트 전부 통과(기준선 42 + 새 테스트). `aclEvidence` 최소: 가운데 줄에서 차단(앞 불일치·뒤 도달 안 함) / 2번째 줄에서 허용 / 암묵적 deny / 같은 ACL 두 번 → 두 블록 / 필드 없는 옛 Hop → 블록 없음. 보낸 줄 → 입력 칸 줄 변환(빈 줄 포함) 테스트
  4. `npm --prefix web run build` → 통과
  5. 브라우저(리뷰 담당이 직접): 예시 01 → ACL 101 1번 줄 빨강·2번 줄 "도달 안 함" / 예시 01 포트 80 → 2번 줄 초록·1번 줄 "불일치" / 규칙을 지워 암묵적 deny → 빨간 끝줄 / "입력에서 보기" → 해당 줄 선택 / 판정 뒤 입력 수정 → 근거는 판정 때 기준, 단추 꺼짐 / 콘솔 오류 없음 / 375px 페이지 가로 넘침 없음
- **설계 검증 근거**: 설계 담당이 지금 엔진으로 확인 — 예시 01·03은 정방향 R1에서 1번 줄 차단(`rule_seq` 1), 예시 02는 ACL 없음 / 예시 01 포트 80 → PASS, 2번 줄 허용 / `["remark …", "", "deny … 443"]` → `rule_seq` 3(빈 줄·remark를 위치에 셈) / 암묵적 deny → `rule_seq` 없음. `Acl.evaluate`는 줄 순서대로 첫 일치(순번 숫자로 정렬하지 않음)

## 완료한 내용
- Rule에 보낸 목록의 줄 위치를 보관하고 ACL Hop에 acl·rule_line 추가. 다른 단계는 null. 엔진 버전 0.1.2.
- ACL 근거 블록을 정방향→복귀 순서로 표시. 줄 번호·상태 글자·색, 암묵적 deny 끝줄, 옛 Hop 호환.
- JudgePage가 API에 보낸 network를 복제해 결과와 함께 보관하고 ResultPanel에 전달. 사례 상세는 저장된 network 사용.
- 판정기에서 입력 칸으로 이동·줄 선택, stale이면 단추 비활성화. 빈 줄 제외 전후 문자 범위 변환 테스트.
- 엔진 9개·서버 1개·웹 8개 테스트 추가. ACL 평가·일치·라우팅 로직과 사례 기대값은 변경하지 않음.
- 구현 도구: Codex (GPT-6 Astra).

### 설계에 명시되지 않은 처리와 확인 방법
- 암묵적 deny에는 선택할 특정 줄이 없으므로 "입력에서 보기"가 ACL 전체를 선택한다. 이유: 사용자가 ACL 끝에 허용 규칙을 추가할 위치를 확인할 수 있게 함. aclSelection의 null·빈 입력 테스트로 범위 확인, 실제 스크롤·선택은 완료 조건 5에서 확인.
- ACL 이름이 중복되면 toNetwork가 마지막 항목을 보내므로 입력 이동도 findLastIndex로 마지막 칸을 선택한다. 확인: 동일 이름 ACL 두 개를 만든 뒤 마지막 칸의 규칙으로 판정하고 "입력에서 보기"를 누름(브라우저 리뷰 항목).
- 저장된 ACL이 없거나 엔진 줄 위치가 목록 범위 밖인 경우 근거 블록을 생략한다. 이유: 맞지 않는 규칙을 강조하지 않기 위해서. 옛 Hop·없는 ACL·잘못된 줄 위치 테스트로 확인.
- 변경 파일은 작업 정의의 허용 범위 안이며 새 의존성은 없음.

## 변경된 주요 파일
- `engine/src/netproof_engine/acl.py`, `trace.py`: 규칙 위치·ACL 근거 메타데이터.
- `engine/src/netproof_engine/__init__.py`, `engine/pyproject.toml`: 버전.
- `engine/tests/test_acl_evidence.py`, `server/tests/test_acl_evidence.py`: 위치·순번·방향·API 응답 검증.
- `web/src/components/AclEvidence.tsx`, `aclEvidence.test.ts`: 표시 변환·줄 선택 범위·화면 및 테스트.
- `web/src/types.ts`, `components/ResultPanel.tsx`, `components/NetworkEditor.tsx`, `pages/JudgePage.tsx`, `pages/CaseDetailPage.tsx`, `styles.css`: 필드·입력 참조·스냅샷·근거 표시 연결.
- `HANDOFF.md`: 실행 결과와 리뷰 인계.

## 테스트 결과
- 기준선(2026-09-30, `main` `7f3403f`): 엔진 72 · 서버 41 + 1 건너뜀 · 화면 42 · 빌드 통과
- 2026-09-30 직접 실행. PowerShell에서는 엔진·서버 폴더를 작업 디렉터리로 지정해 Python 명령 실행.
- 최초 빌드에서 map 콜백 안의 optional rule_line 타입 오류 발견. 검사 이후 지역 상수로 보관하도록 수정 후 웹 테스트·빌드 재실행 통과.

### `cd engine && ../.venv/Scripts/python -m pytest -q`

```text
........................................................................ [ 88%]
.........                                                                [100%]
81 passed in 1.38s
```

### `cd server && ../.venv/Scripts/python -m pytest -q`

```text
...................................s.......                              [100%]
42 passed, 1 skipped in 8.50s
```

### `npm --prefix web test`

```text
> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/SKT aleph/netproof/web


 Test Files  5 passed (5)
      Tests  50 passed (50)
   Start at  16:55:53
   Duration  565ms (transform 41%, import 26%, tests 23%, worker 9%, environment 1%)
```

### `npm --prefix web run build`

```text
✓ built in 465ms
```

- `git diff --check` 통과. 기존 사례 테스트 포함. 브라우저 확인과 main 대비 대량 흐름 비교는 설계대로 리뷰 담당에게 남김.

## 리뷰 기록 (리뷰 담당)
전문: PR #6 `[Claude]` 코멘트.
- 직접 실행(`bc64f1a`): 엔진 81 · 서버 42 + 1 건너뜀 · 화면 50 · 빌드 통과
- 판정 불변: `main` 엔진과 흐름 312개(remark·빈 줄·순번 섞인 ACL 변형 포함), `acl`·`rule_line` 빼고 **차이 0**. 걸린 규칙 78개 모두 `rule_line`이 실제 규칙 줄을 가리킴(78/78)
- 브라우저 완료 조건 5 통과(예시 01·포트 80·암묵적 deny·입력에서 보기·판정 뒤 수정·375px·콘솔 0). 설계에 없던 처리 3가지 수용

| # | 파일:줄 | 문제 | 재현 방법 | 상태 |
|---|---|---|---|---|
| 1 | `web/src/components/AclEvidence.tsx:31` | [보통] remark 줄을 "불일치"로 표시 — 엔진은 remark를 규칙으로 읽지 않음 | ACL `remark 설명` / 빈 줄 / `deny tcp any any eq 443` / `permit ip any any`, 443 판정 → `1번 줄 · 불일치 remark 설명` | 수정 요청 — (a) 엔진이 규칙 아닌 줄 위치 제공 또는 (b) 화면이 remark만 인식(엔진 조건과 테스트로 고정), 이유를 기록 |
| 2 | `web/src/components/AclEvidence.tsx:72` | [낮음] 번호가 보낸 줄(빈 줄 제외) 기준이라 입력 칸 줄과 다를 수 있음 | 위 재현에서 "2번 줄" = 입력 칸 셋째 줄 | 수정 요청 — 판정기는 입력 칸 기준 번호 또는 기준을 글로 밝히기 |

## 수작업 필요 항목
- Claude: 완료 조건 5번의 색·글자, 암묵적 deny, 줄 선택·스크롤, stale 근거·단추, 콘솔 오류, 375px 가로 넘침 확인. 동일 ACL 이름의 마지막 입력 칸 이동도 확인.

## 남은 작업 — 로드맵 (2026-09-30 확정, ADR-015)
**정체성**: 네트워크 설정에 대한 답(AI·사람)을 계산으로 검증하고, 왜 그런지 보여 주고, 실제 결과로 그 검증까지 검증하는 실습실.
**순환 고리**: ① 입력 → ② 판정·설명 → ③ 보안 점검 → ④ 실제 결과로 확인 → ⑤ 통계·학습 → ①. 모든 기능은 이 중 하나를 강화한다.
**근거**: 강사님 피드백 — 목록 필터·검색·최적화 / 오탐·미탐 감지 / 시각화·하이라이트·색. 사용자가 "전부 넣는다"로 결정.
**원칙**: 판정·점검·수정 후보는 모두 엔진 계산(ADR-001). 앱 안 LLM 설명은 계속 제외(ADR-002). 과제마다 설계 → 구현 → 리뷰 → 병합 한 바퀴. 같은 폴더에서 Codex 작업은 한 번에 하나(병행하려면 별도 worktree).

**끝난 것**
- [x] 협업 파일 도입 · [x] P1 사례 URL 공유(PR #2) · [x] 도달 못 한 목적지 표시(PR #4)
- [x] `plan.md` 목표 변경 기록(ADR-015)

**2주차 전반 (~10-04)**
- [ ] ACL 규칙 줄 하이라이트(이슈 #5 · PR #6, 리뷰 수정 2건 대기) — ② 판정을 가른 줄 빨강, 통과시킨 줄 초록, 도달하지 않은 줄 회색
- [ ] 사례 목록 검색·필터·페이지 — ⑤ 제목·작성자·IP 검색, 판정·일치·확인·출처 필터, 서버 페이지·인덱스

**2주차 (10-05~10-11)**
- [ ] 정책 검증 + 도달성 매트릭스 ★대표 — ③ "이 통신은 막혀야/열려야 한다" 의도 입력 → 모든 호스트 쌍 × 주요 포트 히트맵, "막혀야 하는데 열림"(노출) 최우선 강조. 기존 `verify` 반복 호출로 판정 의미 유지
- [ ] Cisco 설정 붙여넣기 ①`interface`/`ip address` ②`ip route` — ① (수업 ACL이 Cisco인지 확인 필요)
- [ ] 사례 복제·실습 과제 템플릿 — ①

**3주차 (10-12~10-18, 해커톤 1차 주말 — 가볍게)**
- [ ] 오탐·미탐 대시보드 — ⑤ AI 답·사람 예상·NetProof 판정을 각각 실제 결과와 2×2로, 칸을 누르면 목록 필터로. **양성 정의는 사용자가 정한다**
- [ ] 실제 결과 붙여넣기(ping·Nmap 출력 → PASS/DENY) — ④
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
- [ ] 로그인 실패 → Graylog(GELF, 로컬 시연용) — 운영 (설계 중이던 것)
- [ ] Batfish 차등 테스트 — ④

**6주차 (11-02~11-08)**: 버그 수정만, 2차 테스트, 발표·제출

**사람 트랙 (동시에, LLM에 넘기지 않음)**
- [ ] 동기 3명 인터뷰 · [ ] 실제 결과가 있는 사례 모으기(오탐·미탐 대시보드의 재료) · [ ] 사례 04 손계산
- [ ] 수업 ACL이 Cisco인지 pfSense인지 확인 · [ ] 오탐·미탐 양성 정의 · [ ] 표어 결정
- [ ] 배포(Vercel·Supabase 가입, 비밀값) · [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

**위험**: 4주차 전에 ①~⑤의 핵심(하이라이트·목록 필터·정책 검증·오탐/미탐·실제 결과 붙여넣기)이 끝나지 않으면 사용자 테스트가 흔들린다. 밀리면 4·5주차 항목부터 미룬다.

## 다음 LLM이 확인할 내용
- 시작 전 `git pull`, `git status`, `git log -3`, 위 테스트 3개를 직접 실행해 이 문서와 일치하는지 확인

## 주의사항 / 미해결 이슈
- 줄바꿈이 섞여 있음(CRLF 49, LF 17, 혼합 1). 관계없는 파일의 줄바꿈만 바뀐 diff를 만들지 않는다.
