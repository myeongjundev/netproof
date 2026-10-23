# HANDOFF

Claude ↔ Codex가 GitHub를 채널로 주고받는 **현재 상태 문서**입니다. 이력은 쌓지 않고 덮어씁니다.
과제별 이력은 `decisions/ai-work-log.md`, 사람과 AI의 판단이 갈린 순간은 `decisions/disagreement-log.md`(사용자가 채움)에 둡니다.
2026-10-23에 지난 작업 정의·테스트 원문·리뷰 기록을 접었습니다. 접기 전 전문(1,189줄)은 `git show 9e0b6e8:HANDOFF.md` 또는 [고정 링크](https://github.com/myeongjundev/netproof/blob/9e0b6e8e1efd3f548207447ec2aed7bc6bb137b8/HANDOFF.md)에서 봅니다.

## 운영 방식
- 흐름: Claude Opus 설계 → Codex Sol 구현·테스트 → Codex Luna 리뷰 → Codex Sol 수정·재테스트 → 사용자 최종 확인·병합. 필요하면 Astra를 사용한다.
- 역할: 설계는 Claude Opus, 구현·테스트·리뷰 반영은 Codex Sol, 리뷰는 Codex Luna, 병합과 최종 판단은 사용자.
- 채널: 설계는 `main`의 이 문서, 구현 중 상태는 작업 브랜치의 이 문서(차례인 쪽만 수정), 리뷰 지적은 PR 코멘트.
- 같은 GitHub 계정을 쓰므로 커밋 끝 Co-Author 줄과 코멘트 첫 줄 `[Claude]`/`[Codex]`로 구분합니다.
- 단계별 지시문: [PROMPTS.md](PROMPTS.md).
- **사람만 하는 일**: 사례 정답(손계산), 동기 인터뷰, 배포 가입·비밀값 입력, 제품 방향 결정. 어느 LLM에도 넘기지 않습니다.
- 과제가 병합되면 그 과제의 작업 정의·테스트 원문·리뷰 기록은 [지난 과제](#지난-과제) 표 한 줄로 접는다. 원문은 Git 이력과 PR에 남는다.

## 검증 원칙
- "두 LLM이 동의했다/통과라고 했다"는 검증이 아닙니다. 근거는 테스트 출력, `git diff`, 실제 실행 결과뿐입니다.
- 리뷰 지적에는 파일:줄과 재현 명령을 붙입니다. 의견이 갈리면 가릴 수 있는 테스트부터 만듭니다.
- 금지: 비밀값 커밋, `--force` 푸시, 승인 없는 `main` 직접 푸시. 이 저장소는 공개입니다.

## 현재 작업 상태
- 작업(2026-10-24): **침해 가정 실습 구현 완료** — `claude/breach-practice`(PR #66, 설계+구현). 아래 "설계 — 침해 가정 실습"·작업 정의·테스트 결과가 기준이다. PR 순서는 #64 → #65 → #66이다.
- 다음 차례(침해 가정): **사용자(병합 순서대로 결정, 화면 직접 확인).** 후속 후보: 2차 확산("닿은 장비도 뚫렸다고 가정"), 정책 검증 화면의 "이 장비가 뚫리면" 보기.
- 직전 작업: **방화벽(상태 추적) 화면 입력**(아래 작업 정의, PR #65). 사용자 방향(2026-10-23): 보안 네트워크 학생에게 교육적으로 도움이 되고 쓰기 쉬운 사이트. 유료 서비스(결제)는 다음으로 미룸. pfSense 2단계 중 팀 실습망 대조(D5)는 질문 답이 필요해 이번 범위에서 뺐다.
- 브랜치: `claude/firewall-input`, `claude/handoff-fold`(PR #64, HANDOFF 접기)에서 분기. **PR #64를 먼저 병합해야 한다.**
- 제품 상태: main은 PR #62까지 반영, 엔진 0.2.0. 공개 배포는 2026-10-11에 JS `index-COoJnoGM.js`·CSS `index-BXlnygLT.css`가 리뷰한 빌드와 SHA256까지 같음을 확인했다(로그인·저장·수동 QA 완료를 뜻하지 않음).
- 다음 차례: **사용자(PR #64 → 이 PR 순서로 병합 결정, 화면 직접 확인, pfSense 2단계 질문 답변).** 구현·테스트·실브라우저 확인은 끝났다(아래 테스트 결과). 실습망의 주소·규칙을 공개 저장소에 그대로 실을지는 팀 동의 뒤에 정한다.
- **운영 방식 예외(2026-10-23 사용자 지시: "이번 작업은 클로드로만")**: pfSense 2단계는 Claude가 설계·구현·테스트·자체 점검을 모두 맡고 Codex에 넘기지 않는다. 브랜치는 `claude/<작업명>`. 같은 모델의 점검은 독립 리뷰로 기록하지 않으며, 근거는 직접 실행한 테스트 출력·`git diff`·실제 관측 대조뿐이다. 사례 기대값(손계산)·병합·제품 방향 결정은 그대로 사용자가 한다.

## 설계 — 침해 가정 실습 (2026-10-24 사용자 "설계해 줘 · 너가 판단해줘")

- 설계 문서: [docs/breach-practice-design.md](docs/breach-practice-design.md). 브랜치 `claude/breach-practice`는 `claude/firewall-input`(PR #65) 위에서 분기했다. 승인 뒤 구현했다(아래 테스트 결과).
- 요지:
  - 학습실의 새 실습 `#/breach/breach-01` "학교 홈페이지가 뚫렸다면". 학생은 ① 상황 → ② 장비별 예상 → ③ 피해 범위 지도(구성도 표시 + 장비별 서비스 목록, 처음 구성에 대한 예상과 계산 비교) → ④ 방화벽 규칙 고치기 → ⑤ 전/후 피해 범위·지켜야 할 서비스 3개·바뀐 통신 순서로 간다.
  - 새 엔진·서버 API는 없다. `policy-matrix`·`change-impact`·`verify`만 쓴다.
  - 처음 구성은 `web/src/breach.json`에 두고, 참고 구성은 서버 시험에만 둔다.
- 엔진 0.2.0으로 미리 계산해 확인했다(저장소 밖 임시 스크립트): 처음 구성은 WEB에서 3곳·15서비스, 지켜야 할 서비스 3개 통과 / em1을 WEB→DB 3306 하나로 줄이면 1개, 서비스 3개 통과 / em1을 모두 막으면 0개, 하지만 `WEB → DB` MySQL이 막힘.
- 사용자 승인(2026-10-24 "설계 승인. 이대로 구현 시작해 줘"). Claude가 같은 브랜치에서 구현한다(Claude 단독 예외 유지).

### 작업 정의 — 침해 가정 실습 구현 (계획)
기준은 설계 문서다. 아래는 파일과 이름만 정한 계획이다.

1. **실습망 데이터와 서버 시험**: 새 `web/src/breach.json`(설계 §3·§6), 새 `server/tests/test_breach_scenarios.py`(엔진 `policy_matrix` 직접 호출).
   - 형식: 키, 주소, 서비스.
   - 처음 구성: 지켜야 할 서비스 모두 `AGREE`, 뚫린 장비에서 닿는 장비 3곳 이상.
   - 참고 구성(시험 파일에만 둠): 지켜야 할 서비스 모두 `AGREE`, 닿는 곳 `{(10.0.20.10, tcp/3306)}`.
   - em1 규칙 삭제: `WEB → DB` MySQL만 `BLOCKED`.
2. **계산 도우미** `web/src/breach.ts`·테스트:
   - `BREACHES`, `breachById(id)`, `breachSpec(s): MatrixSpec`, `breachDraft(s): Draft`, `layoutFlow(draft, breached): Flow`
   - `reach(matrix, breached): { found; targets: { device, cells }[]; undecided: MatrixCell[]; count }` — 엔진 `endpoints`로 장비를 묶고, PASS만 닿음
   - `guessText(guess, reached)`, `keepText(cell)`, `splitChanges(impact, breached)`, `reachMarks(scenario, result)`
3. **구성도 표시**: `NetworkDiagram`에 선택 속성 `marks?: Record<string, { tone: "breached" | "reach" | "safe"; text: string }>`. 재생 단계가 없을 때만 칸에 글과 `mark-<tone>` class를 붙인다. CSS·정적 렌더 시험.
4. **화면과 연결**:
   - 새 `pages/BreachPage.tsx`: 고치기 과제와 같은 revision·이전 결과·늦은 응답 규칙. 확인하기 한 번에 지금 구성 매트릭스 + `change-impact`를 요청하고, 처음 구성 매트릭스는 한 번만 요청해 둔다.
   - `router.ts`의 `#/breach/:id`, `App.tsx`의 `breachDrafts`·제목 포커스·판정기로 가져가기, `LearningPage`의 "침해 가정 실습" 구역, 시험.
5. **확인**: 기존 엔진 489+2xfail·서버 227+1skip·웹 753 유지 + 신규, 빌드, 금지 경로(`engine/`·`server/netproof_api/`·`scripts/`·`cases/`·`api/`·의존성·`vercel.json`) diff 0, 실브라우저(설계 §9-4), 문서·작업 로그·PR #66 갱신.

### 테스트 결과 — 침해 가정 실습 (Claude 직접 실행, 2026-10-24)

자식 프로세스의 DATABASE_URL·NETPROOF_TEST_DATABASE_URL·NETPROOF_SECURITY_LOG·NETPROOF_SYSLOG를 비웠다. 진행 점·폰트 자산 목록·Vitest 성능 안내만 생략했다.

```text
cd engine && ../.venv/Scripts/python -m pytest -q
489 passed, 2 xfailed in 5.27s

cd server && ../.venv/Scripts/python -m pytest -q
231 passed, 1 skipped in 56.56s

npm --prefix web test
RUN v5.0.2 C:/gov/project/skt aleph/netproof/web
Test Files 52 passed (52)
Tests 785 passed (785)

npm --prefix web run build
dist/assets/index-BMXKaoYR.css 90.93 kB │ gzip: 24.42 kB
dist/assets/index-CF8k2fco.js 420.04 kB │ gzip: 124.11 kB
✓ built in 233ms

git diff --check
(출력 없음, 종료0)

git diff --numstat claude/firewall-input -- engine/ server/netproof_api/ scripts/ 'cases/*.json' api/ requirements.txt 'web/package*.json' vercel.json AGENTS.md CLAUDE.md PROMPTS.md
(출력 없음, 종료0)
```

- **신규 시험**: 서버 4건, 웹 32건.
  - 서버 `test_breach_scenarios.py`: 데이터 형식, 처음 구성(지켜야 할 서비스 AGREE·3곳 이상), 참고 구성(지켜야 할 서비스 AGREE·DB MySQL 하나), em1 전부 차단(WEB→DB MySQL만 BLOCKED).
  - 웹, 엔진 응답 fixture 사용: 피해 범위 고르기·묶기, 판정 불가 분리, 뚫린 장비 없음, 예상 문구, 지켜야 할 서비스 문구, 바뀐 통신 나누기.
  - 웹, 구성도: 표시 class, 첫 층 배치, 경로 재생과의 분리.
  - 웹, `BreachPage`(훅 대역 드라이버): 확인 전 요청 0, 첫 확인의 요청 본문, 처음 구성 재요청 없음, 전/후·지켜야 할 서비스·변화 14건, 근거 흐름, 뚫린 장비 삭제, 늦은 응답 폐기, 가져가기 복사본.
  - 웹, 주소·탐색·학습실.
- **실브라우저**(`scripts/qa_local.py` 127.0.0.1:4870·임시 SQLite, 빌드 `index-CF8k2fco.js`):
  1. 학습실 "침해 가정 실습" 카드 → 화면 진입 시 제목에 포커스.
  2. 예상(OUTSIDE 안 닿음·DB 닿음·ADMIN 안 닿음) → 확인: `처음 구성 3곳 · 서비스 15개 → 지금 3곳 · 서비스 15개`. 예상 비교는 다름·같음·다름. 구성도는 WEB 뚫림, 나머지 셋 닿음 · 서비스 5개. 지켜야 할 서비스 3개는 그대로 됩니다.
  3. em1 1번 규칙을 `TCP 10.0.10.10 → 10.0.20.10:3306`으로 고침 → 결과에 "이전 결과" 표시 → 확인: `… → 지금 1곳 · 서비스 1개`, 지켜야 할 서비스 3개 그대로, WEB에서 시작하는 변화 14건(새로 막힘), 그 밖의 변화 0건.
  4. "MySQL 근거 보기" → 통과, 규칙 `통과 · TCP · 10.0.10.10 → 10.0.20.10:3306`, 미대조 문구 1회.
  5. em1 규칙 삭제 → 확인: `지금 0곳 · 서비스 0개`, `WEB → DB · MySQL · 막혔습니다`.
  6. 처음 구성으로 → 되돌리기 단추·이전 결과 표시. 판정기로 가져가기 → 판정기에 장비 5대·FW 방화벽 규칙 3개.
  7. 320px 라이트·다크와 1280px 라이트에서 본문 가로 넘침 0. 콘솔 오류 0, 서버 오류 로그 0.
- **하지 않은 것·제한**:
  - 375px은 브라우저 창이 가려져 크기 강제가 적용되지 않아 측정하지 못했다(같은 휴대폰 배치 구간인 320px로 갈음).
  - 같은 이유로 캡처가 깨져 문서용 캡처는 저장하지 않았다.
  - 768px 태블릿, 사람의 수동 QA, 실제 장비 대조는 하지 않았다. 같은 모델의 자체 점검이며 독립 리뷰가 아니다.
  - QA 종료 뒤 임시 폴더(qa.db 1개)를 경로 접두사 확인 후 지웠다(남은 폴더 0, 4870 대기 0).

## 작업 정의 — 방화벽(상태 추적) 화면 입력 (2026-10-23 사용자 "구현 시작하자")

### 목표
학생이 pfSense 같은 상태 추적 방화벽을 화면에서 직접 만들고 고친다. 결과에서는 어느 규칙 때문에 통과·차단됐는지, 응답이 왜 자동으로 통과하는지를 쉬운 말로 본다. 엔진은 바꾸지 않고 PR #44(ADR-016 1단계) 계산을 화면에 연결한다.

### 변경 범위
1. 데이터: `types.ts`에 `stateful`·`rules_in`·`default_in`. `toNetwork`는 상태 추적 장비에 `acl_in`·`acl_out` 키를 보내지 않고 규칙·기본 동작을 그대로 보낸다(빈 포트만 뺌, 모르는 규칙 키는 남겨 엔진이 판정 불가로 알림). 공유 링크 검사에 규칙 모양 추가.
2. 구성 편집기: 종류에 "방화벽"(휴대폰 폭에서 잘리지 않게 짧게, 상태 추적 설명은 장비 안내 문장에), "+ 방화벽" 단추. 인터페이스마다 들어오는 규칙 목록(동작·프로토콜·출발지·출발 포트·목적지·목적 포트, 위·아래·삭제와 기존 되돌리기)과 "어느 규칙에도 안 맞으면"(차단·통과·모름). 포트는 TCP·UDP일 때만 입력.
3. 결과·사례·학습: 방화벽 규칙을 JSON 대신 `통과 · TCP · any → 10.20.20.5:443`처럼 보이고, 단계마다 붙는 미대조 문구는 결과 아래 한 번만 보인다. 사례 상세 구성에 방화벽 규칙을 보인다. 학습실 왕복 경로 설명의 "상태 기반 방화벽은 범위 밖" 문장을 지금 기능에 맞게 고친다.
4. 문서: `docs/semantics.md` §14·README의 "화면 입력은 후속" 문장, HANDOFF·작업 로그.

### 건드리지 않을 것
`engine/`(계산·버전 0.2.0), `server/`, `scripts/`, `cases/*.json`·`expect`, API·DB·URL·저장 형식, `web/package*.json`, `requirements.txt`, `vercel.json`. 정답·점수·완료 표시 없음.

### 예상 리스크
- 기본 동작의 기본값: 화면에서 새로 만들거나 라우터에서 바꾼 방화벽 인터페이스만 보이는 "차단"을 채운다(pfSense의 기본 차단과 같고 바꿀 수 있음). 불러온 입력에 값이 없으면 "모름"으로 보이고 그대로 보내 엔진이 판정 불가로 멈춘다(사용자 D4 유지).
- 라우터↔방화벽 전환 때 ACL 연결·규칙이 사라진 것처럼 보일 수 있다. 입력은 남겨 두고 보내지만 않으므로 되돌리면 다시 보인다.
- 미대조 문구를 줄이다 엔진 문장을 바꿀 위험: 엔진 상수와 정확히 같은 끝 문장만 화면에서 떼고, 결과 아래 한 번 보인다. API 값은 그대로다.

### 완료 조건
1. 엔진·서버 테스트 기준 유지(489+2xfail, 227+1skip). 2. 웹 테스트: 기존 692건 유지 + 신규. 3. `npm --prefix web run build`. 4. `git diff --check`, 금지 경로 diff 0줄. 5. 임시 SQLite 실브라우저 320·375·1280px 라이트/다크: 방화벽 추가·전환·규칙 편집·판정(통과·차단·판정 불가)·공유 링크 왕복·콘솔 0·가로 넘침 0.

### 테스트 결과 — 방화벽 화면 입력 (Claude 직접 실행, 2026-10-23)

자식 프로세스의 DATABASE_URL·NETPROOF_TEST_DATABASE_URL·NETPROOF_SECURITY_LOG·NETPROOF_SYSLOG를 비웠다. 진행 점·폰트 자산 목록·Vitest 성능 안내만 생략했다.

```text
cd engine && ../.venv/Scripts/python -m pytest -q
489 passed, 2 xfailed in 3.75s

cd server && ../.venv/Scripts/python -m pytest -q
227 passed, 1 skipped in 32.16s

npm --prefix web test
RUN v5.0.2 C:/gov/project/skt aleph/netproof/web
Test Files 49 passed (49)
Tests 753 passed (753)

npm --prefix web run build
> tsc --noEmit && vite build
✓ 72 modules transformed.
dist/assets/index-BvMEuoqk.css 89.75 kB │ gzip: 24.22 kB
dist/assets/index-DGBhOK50.js 403.33 kB │ gzip: 120.42 kB
✓ built in 242ms

git diff --check
(출력 없음, 종료0)

git diff --numstat claude/handoff-fold -- engine/ server/ scripts/ 'cases/*.json' api/ requirements.txt 'web/package*.json' vercel.json AGENTS.md CLAUDE.md PROMPTS.md
(출력 없음, 종료0)
```

- 신규 웹 시험 61건: `toNetwork`의 상태 추적 장비 ACL 키 제외·빈 포트 제외·모르는 규칙 키 유지·라우터로 되돌릴 때 ACL 재전송·사례 왕복, 공유 링크 왕복과 형식 오류 5종, 규칙 한 줄 표시·엔진 응답 fixture의 미대조 끝 문장 제거, 규칙 칸 안내(주소·포트), 편집기의 종류 전환·+ 방화벽·규칙 순서/삭제/되돌리기 안내·ICMP 포트 비움, 결과 패널의 미대조 문구 1회, 사례 상세의 규칙·기본 동작 표시. 기존 시험 두 곳(ResultPanel·TracePlayer의 "엔진 원문" 단언)은 미대조 끝 문장만 뗀 값으로 바꾸고 문구가 정확히 한 번 보이는지 함께 단언했다.
- 실브라우저(`scripts/qa_local.py` 127.0.0.1:4870·임시 SQLite, 빌드 `index-DGBhOK50.js`): 처음 구성의 R1을 방화벽으로 바꾸면 규칙 없이 `막힘`(정방향: g0/0 in: 사용자가 적은 기본 정책(block)으로 차단), 구성도 `방화벽 · 차단`. `통과 · TCP · any → 10.20.20.5:443` 규칙을 더하면 `통과`(정방향 · 복귀 방향 모두 통과), 복귀 단계 `g0/1 in: 이 session의 정방향 상태로 허용됨`, 미대조 문구는 결과 아래 1회. 출발지 `LAN_net`은 칸 안내·`aria-invalid`와 Tab 순서(출발 포트) 확인 뒤 `판정 불가`(지원하지 않는 주소·별칭: 'LAN_net'). ICMP로 바꾸면 포트 두 칸이 비워지고 잠김. 공유 링크로 다시 열면 종류·규칙·기본 동작이 그대로이고 판정 `통과`. 정책 검증 10건 `PASS 1 · DENY 9`. 375px 다크·320px 라이트·1280px 다크에서 문서 가로 넘침 0(scrollWidth ≤ 화면 폭), 콘솔 오류 0, 서버 오류 로그 0.
- 캡처: [1024px 라이트 규칙·복귀 단계](docs/screens/firewall-rules-desktop-light.jpg), [375px 다크 칸 안내·ICMP 잠금](docs/screens/firewall-rules-mobile-dark.jpg). QA 서버 종료 뒤 남은 임시 폴더(qa.db 1개)를 경로 접두사 확인 후 지웠다(`QA_TEMP_EXISTS=False`, 4870 대기 0).
- 하지 않은 것: 로그인이 필요한 사례 저장·상세 화면은 브라우저로 확인하지 않고 단위 시험(`networkView`·`CaseNetwork`)으로만 확인했다. 768px 태블릿 폭, 실제 pfSense 장비 대조, 사람의 수동 QA는 하지 않았다. 같은 모델의 자체 점검이며 독립 리뷰가 아니다.

## 작업 정의 — HANDOFF 접기 (2026-10-23 사용자 요청)
- 범위: `HANDOFF.md`, `decisions/ai-work-log.md`, 사라진 HANDOFF 절을 가리키던 `docs/frontend-redesign.md`·`docs/path-workbench.md`의 링크(접기 전 고정 커밋 링크로 교체).
- 제외: `engine/`·`server/`·`web/`·`scripts/`·`cases/`·`api/`·`requirements.txt`·`vercel.json`·`AGENTS.md`·`CLAUDE.md`·`PROMPTS.md`.
- 완료 조건: 기본 회귀 3종 기준 유지(엔진 489+2xfail, 서버 227+1skip, 웹 692), 변경 문서의 상대 링크 누락 0, `git diff --check` 출력 없음, 제외 경로 diff 0줄.

### 테스트 결과 — HANDOFF 접기

문서 작업에서 직접 실행한 기준 회귀다. 자식 프로세스의 DATABASE_URL·NETPROOF_TEST_DATABASE_URL·NETPROOF_SECURITY_LOG·NETPROOF_SYSLOG를 비웠다. 진행 점·Vitest 성능 안내만 생략했다. 화면 코드 변경이 없어 빌드는 실행하지 않았다.

```text
cd engine && ../.venv/Scripts/python -m pytest -q
489 passed, 2 xfailed in 8.24s

cd server && ../.venv/Scripts/python -m pytest -q
227 passed, 1 skipped in 56.53s

npm --prefix web test
> vitest run
RUN v5.0.2 C:/gov/project/skt aleph/netproof/web
Test Files 47 passed (47)
Tests 692 passed (692)
Duration 2.40s

Python 표준 라이브러리 링크·제목 앵커 검사(HANDOFF.md, docs/frontend-redesign.md, docs/path-workbench.md)
DOC_LOCAL_LINKS=49
DOC_MISSING_LINKS=0

git diff --check
(출력 없음, 종료0)

git diff --numstat -- engine/ server/ web/ scripts/ cases/ api/ requirements.txt vercel.json AGENTS.md CLAUDE.md PROMPTS.md
(출력 없음, 종료0)
```

고정 커밋으로 바꾼 링크 5개의 제목은 `git show 9e0b6e8:HANDOFF.md`에서 268·347·437·513·557줄에 있음을 확인했다.

Claude (Opus 5.5)

## 지난 과제

상세는 `decisions/ai-work-log.md`의 같은 날짜 줄, PR 본문·코멘트, 접기 전 HANDOFF에 있다.

| PR | 과제 | 병합 커밋 | 기준 문서 |
| --- | --- | --- | --- |
| #62 | F2 용어 통일·F3 받은 답 입력/표시 정리(#61 포함) | `9fcde17` | [terminology-claim-design](docs/terminology-claim-design.md) |
| #60 | 독자 경로 작업대(중성 회색·오렌지, 왼쪽 탐색) | `cc9d8a5` | [path-workbench](docs/path-workbench.md) |
| #59 | 프론트 전체 리디자인 | `d147af4` | [frontend-redesign](docs/frontend-redesign.md) |
| #58 | Batfish 교차 검증 도구(1660건 결과·DENY 단계 1511건 일치, 로컬 전용) | `de56130` | [batfish-diff](docs/batfish-diff.md) |
| #56 | 비차단 후속 묶음(#47·#52·#54 N1 등) | `dcc1a3e` | — |
| #54 | 고치기 과제 3개(목표 통신·목표 밖 변화, 점수 없음) | `bfb7b4f` | — |
| #52 | 구성도·경로 재생 | `802fd76` | [topology-playback-design](docs/topology-playback-design.md) |
| #49·#50 | 불일치 → 회귀 테스트 내보내기, 엔진 버전별 재판정 | `cd23e46`·`d7dabff` | [semantics §15](docs/semantics.md#15-엔진-버전) |
| #47 | 학습 → 실습 → 기록·복습 흐름 | `225a618` | — |
| #44 | pfSense 상태 추적 계산 1단계(ADR-016) | `b050348` | [semantics §14](docs/semantics.md#14-제한된-상태-추적-방화벽-adr-016) |
| #41 | 원인 태그·통계 | `329e74c` | [semantics §13](docs/semantics.md#13-원인-태그) |
| #34 | n8n 연동 예시·학습실 n8n | `1fef9b6` | [n8n](docs/n8n.md) |
| #33 | 보안 로그(Graylog·Wazuh)·학습실 도구 주제 | `0a53519` | [security-logs](docs/security-logs.md) |
| #32 | 변경 전/후 판정 비교·다른 통신 영향 | `baf6501` | — |
| #23~#31 | 홈·학습실·실습 화면, 휴대폰 접기, 판정기 알림 | `82975e6`~`74c5255` | [home-learning-ui](docs/home-learning-ui.md), [practice](docs/practice.md) |
| #27·#28 | 수동 QA 도구(`scripts/qa_local.py`)·체크리스트 | `2ad04a0`·`8268789` | [qa-manual](docs/qa-manual.md) |
| #21 | 판정기 화면 개선 | `388a9cf` | — |
| #20 | 사례 게시판 학습형 UI | `c2a998d` | [case-learning-ui](docs/case-learning-ui.md) |
| #19 | 수정 후보 | `8be25a8` | [semantics §12](docs/semantics.md#12-수정-후보) |
| #18 | ACL 점검 | `c19f554` | [semantics §11](docs/semantics.md#11-acl-점검) |
| #17 | 오탐·미탐 대시보드 | `6c7c9b1` | [semantics §10](docs/semantics.md#10-오탐미탐혼동-행렬) |
| #16 | 실제 결과 붙여넣기(ping·Nmap → 입력 후보) | `309238d` | [actual-paste](docs/actual-paste.md) |
| #15 | 사례 복제·실습 과제 템플릿 | `7b15fde` | — |
| #14 | 정책 검증·도달성 매트릭스 | `c0ab37e` | [policy-matrix](docs/policy-matrix.md) |
| #13 이전 | 사례 검색·필터, URL 공유, 도달 못 한 목적지, ACL 줄 하이라이트, 숫자 `int()` 버그(#7·#9) | — | [case-search](docs/case-search.md) |

## 유지되는 합의
지난 리뷰에서 정한 규칙이다. 바꾸려면 먼저 사용자에게 요청한다.

- **판정은 엔진만**(ADR-001). 점검·표시·집계·원인 태그·수정 후보는 PASS/DENY를 만들거나 바꾸지 않는다. 화면은 엔진이 준 `result`·`comparison`·`problems`를 보여 주는 방식만 바꾼다.
- **추측하지 않는다.** 결론을 못 내면 "점검 못 함", 분류 못 하면 "분류 못 함", 모르면 "판정 불가(UNSUPPORTED)". "문제 없음"이나 차단으로 단정하지 않는다.
- **pfSense 상태 추적**: 상태는 규칙만 건너뛰고 경로는 건너뛰지 않는다(복귀 경로가 없으면 DENY). 기본 정책 미기재·복귀 중 상태 없는 장비·NAT·floating·그룹 규칙 등은 UNSUPPORTED(사용자 D4). 실제 pfSense와 대조하기 전에는 일치한다고 적지 않는다(D5).
- **관측 ≠ 판정.** 무응답·filtered는 DENY의 증거가 아니다. 붙여넣은 원문은 저장하지 않는다.
- **양성은 통신 차단(DENY).** 오탐 = 막힌다고 했는데 실제로 통함, 미탐 = 통한다고 했는데 실제로 막힘. 미확인·미정·미지원은 분모에서 빼고 제외 수를 보인다. 원인 태그는 혼동 행렬과 다른 축이다.
- **과도함은 경고하지 않는다.** 열린 범위를 사실로만 적는다.
- **정답·채점·점수·완료 표시·축하를 만들지 않는다**(AGENTS.md). 고치기 목표는 요구사항이지 정답이 아니며, 과제 문구에 고칠 장비·규칙·원인을 쓰지 않는다. 검사한 쌍 밖은 알 수 없다고 말한다. 기존 `expect`·`cases/*.json`을 바꾸지 않는다.
- **구성도 선**은 입력 주소 구간 소속이지 실제 배선이 아니다. 재생은 받은 응답의 커서이고 API를 부르지 않는다.
- **입력 상태**: 실습 입력은 `practiceDrafts`, 고치기는 `fixDrafts`에만 둔다. 판정기 `draft`는 `판정기로 가져가기` 때만 바꾼다. 저장은 서버가 다시 판정한 값이다. 「내 예상 ≠ 계산」과 「계산 ≠ 실제 결과」는 다른 조건이다.
- **화면 구현 규칙**: 휴대폰 접기는 CSS `.mobile-fold`로만 하고 판정기는 접지 않는다. localStorage는 try/catch. 떠 있는 투어는 만들지 않는다. cases JSON은 테스트에서만 import한다. 판정기 규칙(배너 문장, 되돌리기 한 단계, 즉시 검사가 판정을 막지 않음, ACL 점검 펼침 조건)은 먼저 요청한다.
- **숫자 변환**: 유니코드 숫자·긴 숫자로 `int()`를 부르면 이슈 #7·#9가 돌아온다. 점검은 `parse_acl` 결과만 쓴다.
- **리뷰**: 엔진 diff가 있는 PR은 `docs/semantics.md` §15에 따라 버전을 올렸는지 대조한다. `rejudge` 보고서에 사례 제목·닉네임이 없어야 한다. 원인 태그 규칙(§13)은 먼저 요청한다.
- 관계없는 줄바꿈 변경 금지.

## 남은 후속 (비차단, 미착수)
- PR #62 N2: 대시보드 혼동 행렬의 받은 답 축 행 표기(통과/막힘) — 사용자 수동 QA 판단 뒤 설계.
- pfSense: ① 2단계 실습 연동(D5) ③ 방화벽 원인 태그(지금은 `firewall_in` 차단이 전부 `분류 못 함`) ⑤ 미대조 문구 한 번만 — 판정 결과 패널은 이번 과제에서 해결, 정책 검증 칸 상세·변경 전/후 문장에는 아직 단계마다 붙음. (② 화면 입력·④ `toNetwork` 키 대조는 `claude/firewall-input`에서 처리)
- F28: change-impact 응답에 바뀐 칸 전체가 담김(최대 971줄·571 KiB).
- PR #52: N1 복귀에서 막힌 DENY도 처음엔 정방향 「도착」 선택(처음 방향은 사용자 결정), N2 단계 목록이 선택한 방향만.
- PR #41: 원인별 사례 목록 필터(저장 열 필요), 사람이 붙이는 원인 태그.
- PR #17: 사례 목록 진입 시 조회 2번, 빈 질의 `#/cases?`의 빈 query 키, 임의 DB `kind`와 `claim_kind=none`(NULL만) 차이. PostgreSQL 실연결·지연 주입 미검증.
- PR #16: Nmap 출력에 ping 낱줄 혼합, NBSP·전각 공백 거절, 거절 시 `target` 잔존.
- PR #15: 제목 길이 UTF-16/코드포인트 차이.
- PR #12: strict xfail 2건, Hypothesis 하한.
- Batfish 교차 검증 범위 밖: pfSense 상태 추적, UNSUPPORTED·INVALID, 비연속 와일드카드. Batfish 일치는 실제 장비 보증이 아니다.

## 사람 할 일
- **운영 DB 재판정 보류**: 운영 사례는 아직 엔진 `0.1.4` 판정. `netproof` 비밀번호 확보 뒤 [deploy.md](docs/deploy.md) 절차로 재개하고, 주소는 가려진 입력으로만 받는다.
- **Vercel `DATABASE_URL`**: Production and Preview 적용을 Production 전용으로 바꾼다(Codex·Claude는 설정을 바꾸지 않음).
- **배포 6단계(가입·사례 저장·로그아웃)·7단계(검토자 지정)** 확인. `make-reviewer`는 `netproof` 계정 연결 주소로 실행하고, 주소는 채팅·명령줄·캡처에 넣지 않는다([deploy.md](docs/deploy.md) 7).
- **수동 QA A~E**([체크리스트](docs/qa-manual.md)): A PR #20 G2, B 실제 기본 확인창 삭제 취소, C 홈·실습 흐름(변경 전/후 포함), D 수업 환경 Graylog·Wazuh 수집, E 수업 Docker n8n 실행. AI의 도구 실행·로컬 대역 확인은 수동 QA 통과가 아니다. 결과는 사람이 `docs/qa-manual.md`나 PR 코멘트에 적고, AI가 대신 완료로 바꾸지 않는다. 임시 DB·합성 계정만 쓰고 비밀번호·쿠키·토큰은 기록하지 않는다.
- **D5(pfSense 실습 사실)**: 질문 답을 주면 2단계를 설계한다.
- **사람 트랙**: 동기 3명 인터뷰, 실제 결과가 있는 사례 모으기, 사례 04 손계산, 표어 결정.
- **t08 Postgres 오류**: 배포 전 t08 대시보드에 최근 60분 오류 111건이 일정 간격으로 보였다(NetProof와 무관, 원인 미확인). Supabase Logs에서 확인한다.

## 배포 (2026-10-06 구성)
| 항목 | 내용 |
| --- | --- |
| Vercel | 프로젝트 `netproof`(Hobby). `main` 병합 = Production 자동 배포, 브랜치 = Preview. Preset `Other`, 함수 지역 `icn1`(`vercel.json`) |
| 주소 | 공개 `netproof-vert.vercel.app`. `netproof.vercel.app`은 다른 사람의 사이트다. `netproof-myeongjundev.vercel.app`·배포별 주소는 Vercel 로그인 보호 |
| 환경 변수 | `DATABASE_URL`(`netproof` 계정 Transaction pooler), `NETPROOF_SECURE_COOKIES=1`. 보안 로그 변수 없음(꺼짐) |
| DB | Supabase **t08 프로젝트**(서울, 무료) 안의 스키마 `netproof`. 계정 `netproof`(로그인 전용, `search_path = netproof`), 풀러 포트 6543. 표 `users`·`sessions`·`cases`는 RLS 켜짐, t08 `public` 표는 0개 보임. Data API 꺼짐 |

- **NetProof DB는 t08에 기대어 있다.** t08을 멈추거나 지우면 NetProof도 멈춘다. 무료 프로젝트는 오래 쓰지 않으면 멈추고, 90일이 지나면 다시 켤 수 없다. `netproof` 비밀번호를 바꾸면 Vercel `DATABASE_URL`도 바꾸고 다시 배포한다.
- 비밀값: `netproof` 비밀번호와 연결 주소는 사용자 비밀번호 관리자와 Vercel에만 둔다. SQL에는 SCRAM-SHA-256 확인값만 넣었다. 2026-10-06 Claude 세션 임시 폴더(저장소 밖)에 연결 주소 파일이 남아 있으면 검토자 지정 뒤 지운다.
- 병합 뒤 공개 주소에서 바뀐 화면·API를 한 번 확인한다.

## 남은 작업 — 로드맵 (ADR-015)
- **정체성**: 네트워크 설정에 대한 답(AI·사람)을 계산으로 검증하고, 왜 그런지 보여 주고, 실제 결과로 그 검증까지 검증하는 실습실.
- **순환 고리**: ① 입력 → ② 판정·설명 → ③ 보안 점검 → ④ 실제 결과로 확인 → ⑤ 통계·학습 → ①. 모든 기능은 이 중 하나를 강화한다.
- **원칙**: 과제마다 설계 → 승인 → 구현 → 리뷰 → 병합 한 바퀴. 앱 안 LLM은 계속 제외(ADR-002). 같은 폴더에서 Codex 작업은 한 번에 하나(병행하려면 별도 worktree).
- **일정**: 11-01 기능 동결. 6주차(11-02~11-08)는 버그 수정·2차 테스트·발표·제출만.
- **완료**: 2026-10-05 합의한 F5·F6 다음 기능 순서 1~8과 홈·학습·사례·리디자인 과제는 모두 병합했다([지난 과제](#지난-과제)).
- **다음 후보(사용자 결정)**: pfSense 2단계 실습 연동. Cisco 설정 붙여넣기는 "수업은 Cisco·pfSense를 쓰지 않음"(2026-10-05)으로 제외했다. 팀 캡스톤 실습망은 pfSense를 쓰므로 pfSense 쪽 우선순위는 사용자가 다시 정한다. Cloudflare 활용은 수업 용도를 확인한 뒤 정한다.

## 다음 LLM이 확인할 내용
- **worktree에서 서버 테스트(F27)**: `server/pyproject.toml`의 pythonpath에 `../engine/src`가 있어 PYTHONPATH 없이 그 worktree 엔진을 쓴다.
- 테스트·QA 자식 프로세스에서는 `DATABASE_URL`·`NETPROOF_TEST_DATABASE_URL`·`NETPROOF_SECURITY_LOG`·`NETPROOF_SYSLOG`를 비운다. QA는 `scripts/qa_local.py`의 127.0.0.1·임시 SQLite만 쓴다.
- 기본 venv에는 선택 의존성 pybatfish가 없어 서버 1 skip이 정상이다. 엔진 2 xfail은 PR #12의 strict xfail이다.
- 주 작업 폴더(`C:/gov/project/skt aleph/netproof`)는 `main`이다.
- [HOME_HANDOFF.md](HOME_HANDOFF.md)는 2026-10-02 집 인계 시점 기록이다. 날짜별 정리: [10-04~06 첫 배포](docs/work-summary-2026-10-04_06.md), [10-06 배포 이후](docs/work-summary-2026-10-06.md), [10-08](docs/work-summary-2026-10-08.md), [회고 10-06](docs/netproof-retrospective-2026-10-06.md).
