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
- 다음 차례: **Codex Luna 리뷰** — 이슈 #7 구현 PR에서 완료 조건과 회귀 테스트를 확인
- 브랜치 / 마지막 커밋: `codex/unicode-digit` / 이슈 #7 구현 커밋
- 진행 단계: 구현·테스트 완료 → 리뷰 대기
- 한 줄 요약: 이슈 #7 — `isdigit()` 뒤 `int()`로 생기는 `ValueError`·500 수정
- 직전 과제: ACL 규칙 줄 하이라이트 — PR #6 병합(이슈 #5 닫음). 과정·리뷰 기록은 PR #6과 `decisions/ai-work-log.md`

## 작업 정의 (설계 담당) — 이슈 #7 유니코드 숫자 `ValueError`
- **목표**: `verify()`는 어떤 입력에도 예외 대신 `PASS`·`DENY`·`UNSUPPORTED`·`INVALID` 중 하나를 돌려줘야 한다. 지금은 ACL 줄이나 흐름의 ICMP 종류에 `²`·`①` 같은 문자가 오면 `ValueError`가 그대로 올라와 `/api/verify`(로그인 없이 누구나 호출)가 500이 된다.
- **원인 (설계 담당이 확인)**: 파이썬 `str.isdigit()`는 **참이지만 `int()`로는 못 바꾸는** 문자(윗첨자 `²`, 원문자 `①` 등)가 있다. `int()`가 받는 것은 `str.isdecimal()`이 참인 문자뿐이다. 엔진은 `isdigit()`를 "`int()`로 바꿀 수 있다"는 뜻으로 쓰고 있어, 그 사이의 문자에서 변환이 터진다.
  ```
  '²'.isdigit() → True   int('²') → ValueError   '²'.isdecimal() → False
  ```
- **고칠 곳**: 검사와 변환이 짝인 네 군데 모두 `isdigit()` → `isdecimal()`. 하나라도 빠지면 그 경로에서 계속 500이 난다.
  | 파일:줄 | 무엇 | 고친 뒤 가는 길 |
  |---|---|---|
  | `engine/src/netproof_engine/acl.py:130` | `_port()` 포트 숫자 | 이미 있는 `raise Unsupported("알 수 없는 포트 이름…")` |
  | `engine/src/netproof_engine/acl.py:198` | `parse_rule()` 순번 | 순번으로 안 읽고 `동작`으로 읽어 `raise Unsupported("동작은 permit·deny만…")` |
  | `engine/src/netproof_engine/acl.py:221`·`222` | `parse_rule()` ICMP 종류 옵션(같은 검사가 두 번) | 이미 있는 `raise Unsupported("지원하지 않는 옵션…")` |
  | `engine/src/netproof_engine/verify.py:38` | 흐름의 `icmp` 값 | 이미 있는 `raise Invalid(["알 수 없는 ICMP 종류…"])` |
  - `acl.py:185`(`following.isdigit()`)는 `int()` 변환이 없어 크래시는 없지만, `²`에서 "포트를 여러 개" 라는 엉뚱한 이유가 나온다. **같이 `isdecimal()`로 바꾼다** — 엔진에 `isdigit(` 호출이 하나도 남지 않게 해서 같은 실수가 다시 들어오는지 grep 한 줄로 볼 수 있게 한다.
- **원칙**: 새 `try`/`except`나 새 `Unsupported`·`Invalid` 문구를 **만들지 않는다**. 네 곳 모두 "숫자가 아니다"일 때 가야 할 분기가 이미 있고, 잘못된 검사 때문에 거기까지 못 간 것뿐이다. 해석 못 하는 ACL 줄은 지금처럼 `UnreadLine` → 평가 때 `Unsupported` → `UNSUPPORTED` 판정으로 간다(`acl.py:96`, `verify.py:90`).
- **엔진 버전** `0.1.2` → `0.1.3`(`__init__.py`, `pyproject.toml`). 응답 형식은 그대로다. 로드맵의 "엔진 버전별 재판정"에서 이 수정 전후를 가릴 수 있게 올린다.
- **판정 의미**: `docs/semantics.md`는 고칠 것이 없다. "지원 범위 밖이면 추측하지 않고 `UNSUPPORTED`"(2·6절)가 이미 기준이고, 이번 수정은 **크래시를 그 기준으로 되돌리는** 것이다. ASCII 숫자만 쓰는 입력에서는 `isdigit()`와 `isdecimal()`이 똑같아 판정이 바뀔 수 없다.
- **변경 범위(만질 파일)**: `engine/src/netproof_engine/acl.py`(위 네 줄의 검사만), `engine/src/netproof_engine/verify.py`(38행만), `engine/src/netproof_engine/__init__.py`, `engine/pyproject.toml`, `engine/tests/test_unicode_digits.py`(새 파일), `server/tests/`(응답 테스트 1개), `HANDOFF.md`
- **건드리지 않을 것**: ACL 평가 순서·일치 규칙(`Acl.evaluate`, `Rule.matches`), `UnreadLine`·`Unsupported`·`Invalid`의 구조와 문구, 라우팅·추적 로직, `rule_seq`·`rule_line`의 뜻, `server/netproof_api/` 코드, `cases/`, `docs/semantics.md`, 웹 전체(`isAclRemark` 포함 — 엔진 remark 판별이 안 바뀌므로 맞춰 고칠 것이 없다), 새 의존성
- **예상 리스크** (리뷰 때 우선 확인)
  - 네 곳 중 하나를 빠뜨림 → 그 경로만 여전히 500. 완료 조건 1의 네 테스트가 경로별로 하나씩 있는 이유다
  - `isdecimal()`은 전각 숫자(`４４３`)·아랍-인디크 숫자를 통과시키고 `int()`도 이들을 받는다. 즉 **전에 크래시였던 일부 입력이 이제 정상 포트·순번으로 읽힌다**. 의도된 결과지만, 이것을 거부라고 기대하는 테스트가 생기지 않게 한다
  - 기존 테스트는 모두 ASCII 입력이라 **통과해도 이 변경을 검증하지 못한다**. 유니코드 숫자 전용 새 테스트가 반드시 필요하다
  - ASCII 경로 판정이 바뀜 → 리뷰에서 `main` 엔진과 흐름 대량 비교(Claude가 직접)
- **완료 조건 (실행 가능한 명령)**
  1. `cd engine && ../.venv/Scripts/python -m pytest -q` → 전부 통과(기준선 93 + 새 테스트). 새 테스트 최소 — 전부 **예외 없이 값이 돌아오는지**까지 본다:
     - 이슈 재현 그대로: `cases/synthetic-01-https-acl.json`의 `acls["101"]`을 `["² deny ip any any"]`로 바꿔 `verify` → `result == "UNSUPPORTED"`, `reason`에 줄 번호와 원문
     - 포트: ACL 줄 `"deny tcp any any eq ²"` → `UNSUPPORTED`
     - ICMP 옵션: ACL 줄 `"permit icmp any any ①"` → `UNSUPPORTED`
     - 흐름: `proto` `icmp`, `icmp` `"²"` → `INVALID`
     - 위 네 가지를 `²`(U+00B2)와 `①`(U+2460) 양쪽으로
     - ASCII 경로 불변: `"10 deny tcp any any eq 443"` → `rule_seq == 10` / `"permit tcp any any eq 8080"` → 포트 8080으로 동작 / `"permit icmp any any 8"` → `icmp_type == 8` / 흐름 `icmp` `"8"` → 예전과 같은 판정
     - 재발 방지: 엔진 소스에 `isdigit(`가 없음(`engine/src/netproof_engine/**/*.py`를 읽어 확인하는 테스트 1개)
  2. `cd server && ../.venv/Scripts/python -m pytest -q` → 기준선(42 + 1 건너뜀) + 1. 새 테스트: `/api/verify`에 `² deny ip any any`가 든 ACL을 보내 **상태 코드 200**과 `result == "UNSUPPORTED"`(500이 아님)
  3. `npm --prefix web test` → 기준선 65 그대로(웹은 손대지 않음)
  4. `npm --prefix web run build` → 통과
  5. `git diff main...HEAD` → 위 "변경 범위" 밖의 파일이 없음
  - 브라우저 확인은 필요 없다(화면 변경 없음). 리뷰에서 `main` 대비 판정 불변 대량 비교는 Claude가 한다
- **설계 검증 근거**: 설계 담당이 지금 `main`(`8c7ee35`)에서 직접 확인 — `'²'.isdigit()` 참 / `int('²')` `ValueError` / `'²'.isdecimal()` 거짓. `isdigit()` 호출 위치는 `acl.py` 130·185·198·221·222행과 `verify.py` 38행뿐이고(`grep`), 그중 같은 토큰을 `int()`로 바꾸는 곳이 185행을 뺀 전부다. `parse_acl`은 `Unsupported`만 잡아 `UnreadLine`으로 바꾸므로(`acl.py:233`) `ValueError`는 `verify()`의 `except`(`verify.py:88`·`90`)도 지나쳐 API까지 올라간다 — 이것이 500의 경로다.

## 완료한 내용
- ACL 순번·포트·ICMP 옵션과 흐름 ICMP의 숫자 검사 6곳을 `isdecimal()`로 바꿔, `int()`가 받지 못하는 `²`·`①`이 기존 `Unsupported`·`Invalid` 분기로 가게 했다. 추가 포트 검사도 같은 기준으로 바꿨다.
- 엔진 버전을 0.1.3으로 올렸다. 응답 형식과 ACL 평가 순서는 그대로다.
- `²`·`①`의 네 입력 경로, ASCII 순번·포트·ICMP 동작, 엔진 소스의 `isdigit(` 재발 방지, API의 200/UNSUPPORTED 응답을 테스트로 확인했다.
- 구현 도구: Codex (GPT-6).

## 변경된 주요 파일
- `engine/src/netproof_engine/acl.py`, `verify.py`: 숫자 검사 변경.
- `engine/src/netproof_engine/__init__.py`, `engine/pyproject.toml`: 0.1.3 버전.
- `engine/tests/test_unicode_digits.py`, `server/tests/test_unicode_digits.py`: 엔진·API 회귀 테스트.
- `HANDOFF.md`: 진행 상태와 직접 실행한 검증 결과.

## 테스트 결과
- 기준선(2026-10-01, `main` `8c7ee35`, 설계 담당이 직접 실행): 엔진 93 · 서버 42 + 1 건너뜀 · 화면 65 · 빌드 통과
- 이번 작업 결과(2026-10-01, `codex/unicode-digit`에서 직접 실행):

  `cd engine && ../.venv/Scripts/python -m pytest -q`
  ```text
  ........................................................................ [ 68%]
  .................................                                        [100%]
  105 passed in 2.49s
  ```

  `cd server && ../.venv/Scripts/python -m pytest -q`
  ```text
  ...................................s........                             [100%]
  43 passed, 1 skipped in 12.74s
  ```

  `npm --prefix web test`
  ```text
  Test Files  5 passed (5)
       Tests  65 passed (65)
  ```

  `npm --prefix web run build`
  ```text
  ✓ built in 2.76s
  ```

  `rg -n 'isdigit\(' engine/src/netproof_engine` → 일치 없음(종료 코드 1).
  `git diff --check` → 공백 오류 없음(CRLF 변환 예고만 출력).

## 리뷰 기록 (리뷰 담당)
| # | 파일:줄 | 문제 | 재현 방법 | 상태 |
|---|---|---|---|---|

## 수작업 필요 항목
- (없음 — 화면 변경이 없어 브라우저 확인이 필요하지 않다)

## 남은 작업 — 로드맵 (2026-09-30 확정, ADR-015)
**정체성**: 네트워크 설정에 대한 답(AI·사람)을 계산으로 검증하고, 왜 그런지 보여 주고, 실제 결과로 그 검증까지 검증하는 실습실.
**순환 고리**: ① 입력 → ② 판정·설명 → ③ 보안 점검 → ④ 실제 결과로 확인 → ⑤ 통계·학습 → ①. 모든 기능은 이 중 하나를 강화한다.
**근거**: 강사님 피드백 — 목록 필터·검색·최적화 / 오탐·미탐 감지 / 시각화·하이라이트·색. 사용자가 "전부 넣는다"로 결정.
**원칙**: 판정·점검·수정 후보는 모두 엔진 계산(ADR-001). 앱 안 LLM 설명은 계속 제외(ADR-002). 과제마다 설계 → 구현 → 리뷰 → 병합 한 바퀴. 같은 폴더에서 Codex 작업은 한 번에 하나(병행하려면 별도 worktree).

**끝난 것**
- [x] 협업 파일 도입 · [x] P1 사례 URL 공유(PR #2) · [x] 도달 못 한 목적지 표시(PR #4)
- [x] `plan.md` 목표 변경 기록(ADR-015)

**2주차 전반 (~10-04)**
- [x] ACL 규칙 줄 하이라이트(이슈 #5 · PR #6 병합) — ② 판정을 가른 줄 빨강, 통과시킨 줄 초록, 도달하지 않은 줄 회색
- [ ] 이슈 #7 유니코드 숫자 `ValueError`·500 수정(구현·테스트 완료 — 리뷰 대기) — 버그. `verify()`의 "예외 없이 네 값 중 하나" 약속 복구
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
