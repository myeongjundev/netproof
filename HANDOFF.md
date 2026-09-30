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
- 다음 차례: **Claude** — 로드맵 첫 과제 "ACL 규칙 줄 하이라이트" 설계
- 브랜치 / 마지막 커밋: `main` / PR #4 병합 `8597540`
- 진행 단계: P2 도달 못 한 목적지 표시 완료(PR #4 병합, 이슈 #3 닫음)
- 한 줄 요약: P2 경로 그림에 도달하지 못한 목적지 표시(이슈 #3)
- 직전 과제: P1 사례 URL 공유 — PR #2 병합 `177f1f0`. 과정·리뷰 기록은 PR #2와 `decisions/ai-work-log.md`

## 작업 정의 (설계 담당) — P2 도달하지 못한 목적지 표시
- **목표**: 판정이 막히면 경로 그림이 막힌 장비에서 끝나 "어디로 가려다 못 갔는지"가 그림에 없다(09-29 결정 대기 5번). 도달하지 못한 목적지를 그림 끝에 흐린 칸으로 보여 준다.
- **원칙**: 목적지가 어느 장비의 어느 인터페이스인지는 **엔진이** 알려 준다. 화면은 받은 값만 그린다(ADR-001). 화면에서 IP 문자열을 비교해 주인 장비를 찾지 않는다.
- **엔진** (`engine/src/netproof_engine/verify.py`)
  - `verify()`가 돌려주는 `forward`·`return` 사전에 `target` 추가: `{"device": "SRV", "interface": "eth0", "ip": "10.20.20.5"}`
    - `forward.target` = 흐름 목적지(`flow.dst`)의 주인, `return.target` = 흐름 출발지(`flow.src`)의 주인. 기존 `Network.owner()`를 쓴다
  - 판정(`result`·`reason`·`problems`·`decisive`)과 `trace.py`의 추적 로직은 **바꾸지 않는다**. INVALID·UNSUPPORTED는 지금처럼 `forward`·`return`이 `null`
  - 엔진 버전 `0.1.0` → `0.1.1`(`__init__.py`, `pyproject.toml`). 저장된 사례의 `engine_version`으로 `target`이 있는 판정인지 구분할 수 있게
- **화면** (`web/src/components/ResultPanel.tsx`)
  - `types.ts`의 `Trace`에 `target?: { device: string; interface: string; ip: string }` — **선택 필드**(0.1.0으로 저장된 옛 사례에는 없다)
  - 순수 함수 `unreachedTarget(trace)` → 칸을 그릴 목적지 또는 `null`. 그리는 조건은 셋 다 만족할 때: `delivered === false`, `target`이 있음, 그림의 마지막 장비 ≠ `target.device`
  - 경로 그림(`Strip`) 끝에 흐린 칸: 속이 빈 회색 원, 장비 이름, `인터페이스 · 주소`, 글자 **"도달 못 함"**. 막힌 장비에서 이 칸으로 가는 연결선은 **회색 점선**(초록 실선 아님). 색만으로 구분하지 않는다(글자·모양도 다름)
  - 그림은 `aria-hidden`이라, 아래 단계 목록 끝에 같은 내용을 한 줄로: "목적지 SRV eth0(10.20.20.5)에는 도달하지 못했습니다"
  - 사례 상세 화면도 같은 `ResultPanel`이라 따로 고치지 않는다. `target`이 없는 옛 판정은 지금과 똑같이 보인다(오류 없음)
- **변경 범위(만질 파일)**: `engine/src/netproof_engine/verify.py`, `engine/src/netproof_engine/__init__.py`, `engine/pyproject.toml`, `engine/tests/test_verify.py`, `web/src/types.ts`, `web/src/components/ResultPanel.tsx`, `web/src/components/pathNodes.test.ts`, `web/src/styles.css`, `HANDOFF.md`. 필요하면 `server/tests/`에 `/api/verify` 응답에 `target`이 실리는지 테스트 1개
- **건드리지 않을 것**: `engine/src/netproof_engine/trace.py`·`acl.py`·`model.py`(추적·판정 로직), `server/netproof_api/`(코드), `cases/`(기대값), `docs/`, `web/src/share.ts`, 새 의존성
- **예상 리스크** (리뷰 때 우선 확인)
  - 판정이 조금이라도 바뀜 → `engine/tests/test_cases.py`(사례 파일 기대값)가 그대로 통과해야 한다
  - 옛 저장 사례(`target` 없음)에서 화면 오류
  - 목적지 장비에서 막힌 경우(예: 라우터 자신의 주소로 가다 그 라우터의 들어오는 ACL에서 막힘) 같은 장비가 두 번 그려짐 → 마지막 장비 = 목적지면 칸 없음
  - `return`이 `null`(one-way, 정방향 실패)일 때 복귀 그림에 칸이 생김
  - 375px: 그림은 가로 스크롤(`overflow-x: auto`)이 이미 있음. **페이지** 가로 넘침은 없어야 한다
- **완료 조건 (실행 가능한 명령)**
  1. `cd engine && ../.venv/Scripts/python -m pytest -q` → 전부 통과(기준선 64 + 새 테스트). 새 테스트 최소:
     - 예시 01·03형: `forward.target == {"device": "SRV", "interface": "eth0", "ip": "10.20.20.5"}`, `return`은 `None`
     - 예시 02형: `forward.target.device == "SRV2"`(도착), `return.target.device == "PC1"`
     - 목적지가 라우터 인터페이스인 흐름: `target.device`가 그 라우터
     - 세 사례 파일의 `result`·`reason`·`decisive`가 이 변경 전과 같음(`test_cases.py`로 충분하면 그대로)
  2. `cd server && ../.venv/Scripts/python -m pytest -q` → 기준선 그대로(40 + 1 건너뜀, 새 테스트를 넣었다면 +1)
  3. `npm --prefix web test` → 전부 통과(기준선 34 + 새 테스트). `unreachedTarget` 5가지: R1에서 막힘 → SRV / 복귀가 R2에서 막힘 → PC1 / 도착 → `null` / `target` 없음 → `null` / 목적지 장비에서 막힘 → `null`
  4. `npm --prefix web run build` → 통과
  5. 브라우저(리뷰 담당이 직접): 예시 01·03 → 정방향 그림 끝 SRV "도달 못 함"·점선 / 예시 02 → 복귀 그림 끝 PC1 / 통과하는 입력 → 칸 없음 / 콘솔 오류 없음 / 375px 페이지 가로 넘침 없음
- **설계 검증 근거**: 설계 담당이 지금 엔진으로 세 사례를 돌려 봄 — 01: 정방향 R1에서 막힘, 목적지 SRV eth0 / 02: 정방향 SRV2 도착, 복귀 R2에서 막힘, 목적지 PC1 eth0 / 03: 정방향 R1에서 막힘, 목적지 SRV eth0. `Network.owner()`가 돌려주는 인터페이스에 `.device`·`.name`이 있음

## 완료한 내용
- 기존 Network.owner()의 인터페이스 정보로 forward.target·return.target 추가. 엔진 버전 0.1.1.
- 도달하지 못한 목적지를 회색 빈 원·점선·"도달 못 함"으로 표시하고, 단계 목록에도 목적지 설명을 추가.
- 도착·target 없는 옛 판정·마지막 장비가 목적지인 경우는 추가 칸 없음. null 복귀 경로는 기존처럼 표시하지 않음.
- 엔진 테스트 8개, API 전달 테스트 1개, 화면 조건·정적 렌더링 테스트 8개 추가. 새 의존성 없음.
- 구현 도구: Codex (GPT-6 Astra). 변경 범위에 없는 AI 작업 기록 파일은 수정하지 않음.

## 변경된 주요 파일
- `engine/src/netproof_engine/verify.py`: 판정 응답에 target 추가.
- `engine/src/netproof_engine/__init__.py`, `engine/pyproject.toml`: 버전 0.1.1.
- `engine/tests/test_verify.py`, `server/tests/test_verify_target.py`: 목적지 정보 및 API 응답 검증.
- `web/src/types.ts`, `web/src/components/ResultPanel.tsx`, `web/src/components/pathNodes.test.ts`, `web/src/styles.css`: 선택 필드, 표시 조건·그림·접근성 문구·회귀 테스트.
- `HANDOFF.md`: 실제 실행 결과 및 리뷰 인계.

## 테스트 결과
- 기준선(2026-09-30, `main` `1095476`): 엔진 64 · 서버 40 + 1 건너뜀 · 화면 34 · 빌드 통과
- 2026-09-30 직접 실행. PowerShell에서는 엔진·서버 폴더를 작업 디렉터리로 지정해 Python 명령을 실행.

### `cd engine && ../.venv/Scripts/python -m pytest -q`

```text
........................................................................ [100%]
72 passed in 1.70s
```

### `cd server && ../.venv/Scripts/python -m pytest -q`

```text
..................................s.......                               [100%]
41 passed, 1 skipped in 7.89s
```

### `npm --prefix web test`

```text
> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/SKT aleph/netproof/web


 Test Files  4 passed (4)
      Tests  42 passed (42)
   Start at  16:21:31
   Duration  796ms (import 36%, transform 35%, tests 24%, worker 5%)
```

### `npm --prefix web run build`

```text
✓ built in 673ms
```

- 세 사례는 구현 전 응답을 저장한 뒤 구현 후 target만 제거하여 전체 사전 비교(assert)도 직접 실행. 판정·이유·문제·결정 단계·추적 모두 동일:
```text
3 case verdicts unchanged after removing target (result, reason, problems, decisive, traces)
```
- 기존 `test_cases.py`도 위 엔진 전체 테스트에 포함. 사례 기대값과 추적·판정 로직은 변경하지 않음.
- `git diff --check` 통과. 브라우저 확인은 실행하지 않았으며 완료 조건 5번은 Claude 담당.

## 리뷰 기록 (리뷰 담당)
- 직접 실행(`6561d9e`): 엔진 72 · 서버 41 + 1 건너뜀 · 화면 42 · 빌드 통과 — Codex 보고와 같음
- **판정 불변 확인(Claude 별도 실행)**: `main` 엔진(0.1.0)과 이 브랜치 엔진(0.1.1)으로 흐름 112개(사례 3개 + 사례마다 모든 인터페이스 쌍 × TCP 443·ICMP + 모델 밖 목적지)를 돌려 `target`을 뺀 응답 전체 비교 → **차이 0**
- 브라우저(완료 조건 5): 예시 01 → 가는 길 끝 `SRV eth0 · 10.20.20.5 도달 못 함` / 예시 02 → 가는 길 SRV2 도착(칸 없음), 돌아오는 길 끝 `PC1` / 예시 03 → `SRV` / 처음 구성(통과) → 칸 0 / 회색 점선·빈 원 확인 / 새 탭에서 네 입력 판정 후 콘솔 오류 0 / 375·1000·1280px 페이지 가로 넘침 없음
- 브라우저로 확인 못 한 것: `target`이 없는 **옛 저장 사례** 상세 화면(로그인 필요). 화면 테스트의 `target` 없음 → 칸 없음·정적 렌더링 테스트로 대신함

| # | 파일:줄 | 문제 | 재현 방법 | 상태 |
|---|---|---|---|---|
| 1 | `web/src/styles.css` `.output, .follow, .result, .path { min-width: 0; }` | [기록] 설계 범위 밖 전역 레이아웃 변경이고 이유가 적혀 있지 않았음. **측정해 보니 필요한 변경**: 이 줄을 빼면 13칸 경로에서 375px 페이지가 **991px로 가로 넘침**, 있으면 그림 안에서만 가로 스크롤(페이지 375px). 예시 길이(3~4칸)에서는 차이 없음 — 긴 경로에서 원래 있던 문제를 고친 것 | 브라우저에서 CSSOM `deleteRule`로 이 규칙만 빼고 그림에 칸 10개 추가 → `scrollWidth` 비교 | **수용** — 이유를 이 기록에 남김(코드 변경 불필요) |

리뷰 중 Claude의 실수 하나: 처음에는 `<style>`을 넣어 이 규칙을 빼려 했는데, 사이트 CSP(`style-src 'self'`)가 막아 적용되지 않은 채로 "차이 없음"이라고 잘못 판단했다. 콘솔의 CSP 오류 5개(넣은 횟수와 같음)로 알아채고 CSSOM으로 다시 재서 결론을 뒤집었다.

## 수작업 필요 항목
- Claude: 완료 조건 5번의 예시 01·03 정방향 SRV, 예시 02 복귀 PC1, 통과 시 칸 없음, 콘솔 오류·375px 페이지 가로 넘침 확인.

## 남은 작업 — 로드맵 (2026-09-30 확정, ADR-015)
**정체성**: 네트워크 설정에 대한 답(AI·사람)을 계산으로 검증하고, 왜 그런지 보여 주고, 실제 결과로 그 검증까지 검증하는 실습실.
**순환 고리**: ① 입력 → ② 판정·설명 → ③ 보안 점검 → ④ 실제 결과로 확인 → ⑤ 통계·학습 → ①. 모든 기능은 이 중 하나를 강화한다.
**근거**: 강사님 피드백 — 목록 필터·검색·최적화 / 오탐·미탐 감지 / 시각화·하이라이트·색. 사용자가 "전부 넣는다"로 결정.
**원칙**: 판정·점검·수정 후보는 모두 엔진 계산(ADR-001). 앱 안 LLM 설명은 계속 제외(ADR-002). 과제마다 설계 → 구현 → 리뷰 → 병합 한 바퀴. 같은 폴더에서 Codex 작업은 한 번에 하나(병행하려면 별도 worktree).

**끝난 것**
- [x] 협업 파일 도입 · [x] P1 사례 URL 공유(PR #2) · [x] 도달 못 한 목적지 표시(PR #4)
- [x] `plan.md` 목표 변경 기록(ADR-015)

**2주차 전반 (~10-04)**
- [ ] ACL 규칙 줄 하이라이트 — ② 판정을 가른 줄 빨강, 통과시킨 줄 초록, 도달하지 않은 줄 회색
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
