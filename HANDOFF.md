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
- 작업: **고치기 과제 구현·검증 완료, 리뷰 대기(로드맵 7번)**. 사용자 승인 설계 D1~D4·합성 문제 3개에 따라 학습실 카드·전용 화면·메모리 입력·목표 계산·목표 밖 변화·근거 재생을 구현했다. 아래 변경 범위 1~5만 수행했다.
- 브랜치: `codex/fix-exercise`, `git pull` 뒤 `main` `12c65bb`(설계 PR #53 병합)에서 분기. 구현 PR [#54](https://github.com/myeongjundev/netproof/pull/54), main 대상·리뷰 대기. 병합하지 않는다.
- 다음 차례: **사용자(병합 결정).** Claude 리뷰 PASS(차단 0) — 아래 「리뷰 기록 — PR #54」.

### 리뷰 기록 — PR #54 (Claude, 2026-10-10)
- 직접 실행(`55e655f`): 엔진 489 passed·2 xfailed, 서버 174 passed·1 skipped(DATABASE_URL 비움), 웹 629 passed, 빌드 성공(번들 `index-BW8VCTzY.js`, Codex와 같음). 번들에 해법 문자열 없음. 엔진·서버 API·cases·배포·의존성 diff 출력 없음, `git diff --check` 오류 없음.
- 실브라우저(QA 서버 4870, 임시 SQLite): fix-01 1280 처음 다름·다름/밖 변화 0, 요청 policy-matrix·change-impact 각 1회 → HTTPS만 허용하는 편법은 목표 같음·같음이지만 밖에서 「새로 막힘」 다수·사실 문장 없음 → SSH만 막는 수정은 같음·같음·밖 0·사실 문장 → 편집 시 이전 결과·근거 보기 비활성 → 근거 보기 R1 ACL 차단 재생 → 학습실 왕복 뒤 ACL 유지. fix-03 375 SRV→PC1 SSH만 다름·넘침 0·버튼 44px, fix-02 375 다름·다름·콘솔 오류 0. 강제 종료로 남은 `netproof-qa-*`는 확인 뒤 삭제.
- **PASS.** 비차단 N1(Claude 설계 과잉): 금지 낱말에 「통과」를 넣어 `factual` 분기·`factualText`(통과→허용) 생김 — 금지를 완료·성공·정답·점수·%로 줄이면 기존 ResultPanel 재사용 가능(사용자 결정). N2: 화면 왕복 시 구성은 남고 확인 결과는 「확인 전」(D4와 일치).
- 직전 과제: 로드맵 6번 구성도·경로 재생 **PR #52 병합 완료**(`802fd76`, 설계 #51 포함). 운영 번들 `index-BHD-u76S.js`, 공개 주소 실습 01에서 구성도(R1 × 차단·SRV 도달 못 함)·콘솔 오류 0을 Claude가 확인했다. 로드맵 5번 후속 PR #50(export note 조사)도 병합 완료(`d7dabff`).
- 별도로 남은 사용자 확인:
  1. **운영 재판정 보류** — 운영 DB의 기존 사례는 아직 `0.1.4` 판정이다. `netproof` 비밀번호 확보 뒤 `docs/deploy.md` 「엔진 버전이 바뀐 배포 뒤 재판정」(dry-run → 보고서 확인·승인 → 실행 → dry-run 대상 0건). 연결 주소는 가려진 입력으로만.
  2. Vercel `DATABASE_URL`이 **Production and Preview**에 걸려 있다 → Production 전용으로(사용자, Vercel 화면).
  3. PR #52 비차단 N1(복귀에서 막힌 DENY도 처음엔 정방향 「도착」 선택 — 처음 방향을 복귀로 바꿀지 사용자 결정)·N2(목록 한 방향만), PR #47 N1·N2.
  4. **D5(실습 사실 5가지)** — pfSense 2단계 설계 전제. 배포 후속(가입·검토자 지정·수동 QA A~E)은 사람 대기.

## 작업 정의 — 고치기 과제 (Claude 설계, 2026-10-10 사용자 승인)

로드맵 「F5·F6 다음 기능 순서」 7번(⑤ 학습). 브랜치: `main`에서 `codex/fix-exercise`.

### 지금 있는 것 (설계 근거)
- 실습 3개(`web/src/practice.ts`·`learning.ts`, `#/practice/:caseId`): 질문 → 구성 → 예상 → 판정 → 「내 예상 ≠ 계산」 비교 → ⑤ 기록. 정답·완료 표시 없음. 처음 구성은 `/api/examples`의 `cases/synthetic-0N`을 불러온다.
- 정책 검증(`#/matrix`, `POST /api/policy-matrix`): 사람이 적은 의도(`PASS`/`DENY`)와 엔진 결과를 셀마다 `AGREE`·`EXPOSED`·`BLOCKED`·`UNDECIDED`·`NO_POLICY`로 계산한다.
- 변경 영향(`POST /api/change-impact`): 두 구성의 매트릭스를 비교해 결과가 바뀐 칸만 `opened`·`closed`·`other`로 준다(판정한 통신 칸 하나는 제외).
- `docs/quality.md` 3-5 #4의 원래 아이디어는 「목표 정책 + 처음 구성 → 학생이 고치면 자동 채점, 강사 출제」였다. 앱은 정답·채점·완료 배지를 만들지 않는다는 원칙(AGENTS.md, 홈·학습 설계)에 맞춰 **채점 대신 엔진 계산 사실만 보여 주는 고치기 과제**로 다시 정의한다.

### 사용자 결정
| 번호 | 결정 | 고르지 않은 선택지 |
| --- | --- | --- |
| D1 | **고치기 과제**: 처음 구성 + 목표 통신이 주어지고 학생이 ACL·경로를 고친다. 목표를 만족하는 구성이면 무엇이든 된다(정해진 답 없음) | 예상 드릴(맞힌 개수가 채점처럼 보임) / 원인 찾기 |
| D2 | **고정 문제 3개**를 코드(JSON)에 둔다. 처음 구성은 기존 합성 사례 01~03 재사용. 목표 문장은 Claude 초안·사용자 승인(아래 표) | 강사가 화면에서 출제(역할·DB·ADR 필요) / 학생이 목표도 직접(정책 검증과 같음) |
| D3 | 확인하면 **목표 통신마다 목표와 같음/다름 + 처음 구성 대비 목표 밖 통신 변화**를 보인다. 점수·완료 배지 없음 | 목표 통신만(전부 여는 편법을 못 잡음) |
| D4 | 고치던 구성은 **앱 메모리에만**(화면 이동 유지, 새로고침 시 사라짐). 서버·DB 저장 없음 | 브라우저 localStorage / 서버 사례(사례가 통신 1개짜리라 DB·API 변경 필요) |

### 문제 (사용자 승인, 모두 합성 구성)
| id | 제목 | 처음 구성 | 목표(`src → dst · service · expect`) |
| --- | --- | --- | --- |
| `fix-01` | HTTPS는 열고 SSH는 막기 | `synthetic-01` | `10.10.10.10 → 10.20.20.5 · tcp/443 · PASS`, `10.10.10.10 → 10.20.20.5 · tcp/22 · DENY` |
| `fix-02` | ping 왕복 만들기 | `synthetic-02` | `10.10.10.10 → 10.30.30.5 · icmp/echo · PASS`, `10.30.30.5 → 10.10.10.10 · icmp/echo · PASS` |
| `fix-03` | 반대 방향 SSH도 막기 | `synthetic-03` | `10.10.10.10 → 10.20.20.5 · tcp/22 · DENY`, `10.20.20.5 → 10.10.10.10 · tcp/22 · DENY`, `10.10.10.10 → 10.20.20.5 · tcp/80 · PASS` |

- 모드는 모두 `session`. 표시 이름(`label`)·과제 설명(`prompt`)은 Codex가 쓰되 **정답·막히는 원인·고칠 장비를 드러내지 않는다**(예: 「R2에 경로를 추가하세요」 금지, 「PC1과 SRV2 사이 ping이 왕복하게 하세요」는 허용).
- Claude가 엔진으로 미리 확인(2026-10-10): 처음 구성에서 `fix-01` 목표 2개 모두 다름(BLOCKED·EXPOSED), `fix-02` 2개 모두 다름(BLOCKED), `fix-03`은 SRV→PC1 SSH가 다름(EXPOSED, 출력 ACL을 지나지 않음). 세 문제 모두 엔진 모델 안에서 모든 목표를 같음으로 만드는 구성이 있다. 확인에 쓴 구성은 기록하지 않는다.

### 목표
학생이 「무엇이 열려야/막혀야 하는지」를 받고 구성을 직접 고친 뒤, **엔진이 계산한 사실**(목표와 같은지, 목표 밖에서 무엇이 바뀌었는지, 왜 그런지)로 스스로 확인한다. 앱은 점수·정답·완료를 정하지 않는다(AGENTS.md, ADR-001).

### 변경 범위
**1. 과제 데이터 — 새 `web/src/exercises.json`(+ 읽는 `web/src/exercises.ts`)**
- `[{id, title, baseCaseId, prompt, goals: [{src, dst, service, expect, label}]}]`. 위 표의 3개. `expect`는 `PASS`|`DENY`, `service`는 정책 검증 키(`tcp/443`·`icmp/echo`).
- 해법 구성·힌트·정답 필드를 넣지 않는다. 처음 구성은 복사하지 않고 `baseCaseId`로 기존 `/api/examples`에서 불러온다.

**2. 화면 — 새 `web/src/pages/FixExercisePage.tsx`, `web/src/router.ts`(`#/fix/:id`), `web/src/App.tsx`, `web/src/pages/LearningPage.tsx`(+ 각 테스트)**
- 학습실에 「고치기 과제」 칸과 카드 3개(제목·`prompt`·`시작하기` 링크). 합성 구성임을 적는다. 완료·통과 배지 없음.
- 과제 화면 순서: 과제 설명 → 목표 목록(목표마다 `열려야 함`/`막혀야 함`, 확인 전에는 `확인 전`) → 구성 편집(실습과 같은 편집 컴포넌트 재사용) → `확인하기` → 결과.
- `확인하기`는 두 요청을 보낸다(**새 API 없음**):
  - `POST /api/policy-matrix` — `network`: 지금 구성, `spec`: `{mode: "session", services: 목표 서비스 ∪ 기본 5개(SSH·HTTP·HTTPS·DNS·Ping), intents: 목표}`. 목표 칸의 `policy`로 `AGREE` → `목표와 같음`, `EXPOSED`·`BLOCKED` → `목표와 다름`, `UNDECIDED` → `판정 불가`. 결과(PASS/DENY/…)도 함께 보인다. 문구는 기존 `POLICY_TEXT`와 충돌하지 않게 정한다.
  - `POST /api/change-impact` — `before`: 처음 구성, `after`: 지금 구성, `flow`: 첫 목표의 flow, `services`: 위와 같은 목록. 응답 `changes` 중 **목표 칸(`src`·`dst`·`service`가 목표와 같은 것)은 화면에서 뺀** 나머지를 「목표에 없는 통신의 변화」로 보인다(`opened` 새로 열림 / `closed` 새로 막힘 / `other`). 분류·순서는 엔진 것 그대로, 다시 계산하지 않는다.
- 목표 한 줄의 `근거 보기` → 그 목표의 flow로 `POST /api/verify`를 불러 기존 `ResultPanel`(구성도·경로 재생 포함)에 지금 구성 스냅샷과 함께 표시. 클릭할 때만 호출.
- 모든 목표가 `목표와 같음`이고 목표 밖 변화가 0이면 사실 문장 하나만: `모든 목표 통신이 목표와 같고, 검사한 서비스 범위에서 목표에 없는 통신의 변화는 없습니다. 검사하지 않은 통신은 알 수 없습니다.` 「완료·성공·정답·통과·점수·%」 낱말·배지·축하 색을 쓰지 않는다.
- 응답 중 하나가 실패하면 받은 쪽만 보이고 실패한 쪽은 오류 문구를 보인다(가짜 결과 없음). `limit_exceeded`·`INVALID`는 엔진 문제 목록 그대로.
- 입력을 바꾸면 결과를 `이전 결과`로 표시하고 `근거 보기`를 막는다. 확인 중 다시 누를 수 없고, 화면을 떠나거나 입력이 바뀐 뒤 도착한 응답은 버린다(기존 `revision`/`current()` 패턴 재사용).
- `처음 구성으로`(되돌리기 한 단계는 기존 실습 방식 재사용 가능), `판정기로 가져가기`(실습과 같은 동작).

**3. 상태 — `App.tsx`**
- 과제별 draft를 `fixDrafts: Record<string, Draft>`에 둔다(`practiceDrafts`와 같은 방식, 별도 키). URL·localStorage·DB에 저장하지 않는다. 화면에 `다른 화면에 다녀와도 남지만 새로고침하면 사라집니다.`

**4. 서버 테스트 — 새 `server/tests/test_fix_exercises.py`** (제품 서버 코드 변경 없음)
- `web/src/exercises.json`과 `cases/`를 읽어: ① 목표의 src·dst가 처음 구성의 host 주소이고 service 키가 유효 ② 처음 구성 + 목표 의도로 `policy_matrix`를 돌리면 **목표 중 하나 이상이 `AGREE`가 아님**(이미 풀린 문제 금지) ③ **테스트 안에만 둔 구성 변경**으로 모든 목표가 `AGREE`(풀 수 있음). 해법 구성은 이 테스트 파일 밖으로 내보내지 않는다.

**5. 문서** — 이 HANDOFF 테스트 결과·다음 차례, `decisions/ai-work-log.md` 한 줄, `docs/practice.md`에 고치기 과제 한 문단(채점 없음·저장 없음·검사 범위 한계), 로드맵 7번 체크.

### 건드리지 않을 것
- `engine/`, `server/netproof_api/`(API·DB 표·열), `cases/*.json`과 `expect`, 배포 구성(`vercel.json`), 의존성(`package.json`).
- 기존 실습 3개·판정기·정책 검증·사례 화면의 동작과 저장 규칙. 엔진 응답의 분류·결과를 화면에서 다시 계산하지 않는다.
- 점수·진도·완료 기록, 강사 역할, 서버 저장.

### 테스트 결과 — 고치기 과제 (Codex 직접 실행, 2026-10-10)

엔진·서버 테스트와 로컬 QA는 DATABASE_URL·NETPROOF_TEST_DATABASE_URL·NETPROOF_SECURITY_LOG·NETPROOF_SYSLOG를 비운 상태에서 실행했다. 서버 시험은 테스트용 SQLite를 사용했고 운영 DB 작업은 하지 않았다. 아래는 실제 출력에서 진행 점·빌드 자산 목록만 생략한 부분이다.

```text
cd engine && ../.venv/Scripts/python -m pytest -q
489 passed, 2 xfailed in 5.45s

cd server && ../.venv/Scripts/python -m pytest -q
174 passed, 1 skipped in 56.09s

npm --prefix web test
Test Files  42 passed (42)
Tests  629 passed (629)
Duration  1.67s

npm --prefix web run build
✓ 68 modules transformed.
dist/assets/index-BW8VCTzY.js  391.19 kB │ gzip: 117.09 kB
✓ built in 265ms

git diff --stat main... -- engine server/netproof_api cases vercel.json web/package.json web/package-lock.json
(출력 없음)

git diff --check
(출력 없음)
```

빌드한 번들 검색도 직접 실행했다. 해법 ACL 문자열을 문서에 복사하지 않고 서버 테스트의 문자열 노드를 읽어 검색한다. 검사한 JS가 없으면 실패하고 일치가 하나라도 있으면 실패한다.

```powershell
@'
import ast
from pathlib import Path
source = Path('server/tests/test_fix_exercises.py').read_text(encoding='utf-8')
strings = {node.value for node in ast.walk(ast.parse(source)) if isinstance(node, ast.Constant) and isinstance(node.value, str) and node.value.startswith('access-list ')}
bundles = list(Path('web/dist/assets').glob('*.js'))
assert bundles, 'No built JS bundle'
hits = sum(text in path.read_text(encoding='utf-8') for path in bundles for text in strings)
print(f'solution ACL strings checked: {len(strings)}; built JS files: {len(bundles)}; matches: {hits}')
assert hits == 0
'@ | .venv/Scripts/python -
```

```text
solution ACL strings checked: 5; built JS files: 1; matches: 0
```

- 서버 +9건: 과제 필드·host 주소·서비스·목표 형식, 처음 구성의 목표 중 하나 이상 다름, 테스트 안에서만 만든 구성으로 모든 목표 AGREE, 원본 cases 불변. 해법 구성은 `server/tests/test_fix_exercises.py` 안에만 있다.
- 웹 +66건: 과제·라우터·학습실 카드, 요청 1회씩/동시 시작·session 본문, 목표 매핑·목표 칸 제외·엔진 분류/순서 유지, 사실 문장 조건(누락·INVALID·상한·비교 못 한 끝점은 표시 안 함), 편집/같은 입력 복귀 시 이전 결과·근거 차단, 늦은 결과/오류·화면 이탈 폐기, 부분 실패, reset/undo/import, App 메모리 분리, 중립 결과 표시 및 기존 화면 회귀.
- 기존 ResultPanel/TracePlayer에 고치기 전용 중립 표시 옵션을 추가했다. PASS/DENY 코드·문제 목록·규칙 원문·분류는 그대로이며 설명의 `통과`는 이 화면에서만 `허용`으로 표시한다. 기존 화면의 문구·동작과 저장 규칙은 유지한다. 기존 `flowForCell` 입력 타입은 필요한 주소·서비스 필드로 좁혀 재사용하며 계산은 바꾸지 않았다.

기존 `scripts/qa_local.py`의 임시 SQLite 준비를 사용한 localhost 실제 빌드에서 Playwright로 세 과제×375/1280px 총 6상태를 확인했다. 초기 목표는 설계와 같이 다름을 포함했고, 확인 때 목표/영향 각 1회·근거 클릭 때 verify 1회였다. 가로 넘침·채점 문구·예상하지 않은 콘솔/페이지 오류 0. 이것은 Claude의 완료 조건 7 전체 리뷰나 실제 장비·운영 배포 검증을 대신하지 않는다.

아래 브라우저 결과는 상태별 출력을 요약했고 임시 폴더 경로만 익명화했다.

```text
{ states: 6, policyMatrixCallsPerCheck: 1, changeImpactCallsPerCheck: 1,
  verifyCallsPerEvidenceClick: 1, overflow: 0, forbiddenText: 0 }
{ previous: 1, disabled: true, memoryRetained: true, reloadReset: true }
{ partialFailure: [
  { failedSide: 'policy-matrix', otherVisible: 1, fact: 0 },
  { failedSide: 'change-impact', otherVisible: 2, fact: 0 }
] }
{ lateAfterEdit: { arrived: 1, goalResultAbsent: true, previous: 1, evidenceDisabled: true } }
{ browserClosed: true, unexpectedBrowserErrors: [], injected500Errors: 2 }
QA server stopped; temporary SQLite folder removed
Test-Path -LiteralPath <작업 전용 임시 QA 폴더의 절대 경로>
False
```

부분 실패 시험은 브라우저에 의도적으로 500 응답 두 번을 넣었고 그에 따른 리소스 오류만 있었다. QA 서버·브라우저를 종료하고 임시 SQLite 폴더 삭제를 확인했으며 커밋하지 않은 QA 준비 도구도 지웠다. 첫 빌드의 목표 flow 타입 단언과 테스트의 Node 타입 import 문제를 고쳤다. 실제 UI에서 엔진 설명의 `통과`를 발견해 중립 표시·기록된 엔진 응답 9개 회귀 시험을 추가했고, 최종 번들을 다시 불러 문구 0을 확인했다.

Codex (GPT-6)

### 예상 리스크
| 리스크 | 대응 |
| --- | --- |
| 「목표와 같음」이 정답·채점으로 읽힘 | 사실 문장과 검사 범위 한계 문구, 완료·점수 낱말 금지(테스트로 확인) |
| 전부 여는 편법(`permit ip any any`) | 목표 밖 변화 목록(change-impact)으로 드러냄 |
| 문제 설명이 답을 알려 줌 | `prompt`·`label`에 고칠 장비·규칙·원인 금지, 리뷰에서 확인 |
| 해법이 공개 번들에 들어감 | 해법은 서버 테스트 파일에만, 빌드 번들에서 검색으로 확인 |
| 이미 풀린 문제·풀 수 없는 문제 | 서버 테스트 ②③ |
| 두 요청 중 하나만 실패 | 받은 쪽만 표시, 실패 쪽 오류 문구 |
| 늦은 응답이 바뀐 입력에 붙음 | revision 확인 + 테스트 |
| 375px 넘침 | 리뷰 때 375·1280 실브라우저 |

### 완료 조건 (Codex가 직접 실행해 출력 첨부)
1. `cd engine && ../.venv/Scripts/python -m pytest -q` → 489 passed·2 xfailed(변화 없음).
2. `cd server && ../.venv/Scripts/python -m pytest -q` → 165 passed·1 skipped에 `test_fix_exercises.py` 추가, 실패 0(위 ①②③).
3. `npm --prefix web test` → 563 passed에 추가, 실패 0. 최소: `exercises.json` 형식(필드·서비스 키·expect·해법/정답 필드 없음); 라우터 `#/fix/:id`(없는 id는 학습실로); `확인하기` 한 번에 policy-matrix·change-impact 각 1회와 요청 본문(목표 의도·서비스·before/after); 목표 칸 표시 매핑(AGREE/EXPOSED/BLOCKED/UNDECIDED); change-impact에서 목표 칸 제외; 사실 문장 조건(전부 같음 + 밖 변화 0일 때만); 편집 시 `이전 결과`·근거 보기 비활성; 늦은 응답 폐기; 한쪽 실패 시 다른 쪽 유지; 화면 문구에 `완료`·`성공`·`정답`·`점수` 없음.
4. `npm --prefix web run build` 성공. 빌드한 `web/dist/assets/*.js`에 서버 테스트의 해법 ACL 문자열이 없음(검색 명령과 출력 첨부).
5. `git diff --stat main... -- engine server/netproof_api cases vercel.json web/package.json web/package-lock.json` → **출력 없음**.
6. `git diff --check` 공백 오류 없음.
7. 리뷰(Claude): `scripts/qa_local.py`로 375×812·1280에서 세 과제 각각 처음 확인(다름) → 구성 고침 → 다시 확인(같음·밖 변화) → 전부 여는 편법이 밖 변화로 보이는지 → 근거 보기 → 편집 시 이전 결과 → 다른 화면 왕복 유지를 실브라우저로 확인.

## 배포 기록 (2026-10-06)

### 배포 구성 (2026-10-06)
| 항목 | 내용 |
| --- | --- |
| Vercel | 프로젝트 `netproof`(Hobby, `myeongjundev`). `main`에 병합하면 Production으로 자동 배포, 브랜치를 올리면 Preview 배포. Application Preset `Other`(가져오기 화면이 폴더를 보고 `Services`를 골라서 바꿨다). 함수 지역 `icn1`(`vercel.json`) |
| 주소 | 공개 주소 `netproof-vert.vercel.app`. `netproof.vercel.app`은 다른 사람의 사이트다. `netproof-myeongjundev.vercel.app`과 배포별 주소는 Vercel 로그인으로 보호된다 |
| 환경 변수 | `DATABASE_URL`(아래 `netproof` 계정의 Transaction pooler 주소), `NETPROOF_SECURE_COOKIES=1`. 보안 로그 변수는 넣지 않았다(꺼짐) |
| DB 위치 | Supabase **t08 프로젝트(패스키 포트폴리오, 서울, 무료)** 안의 전용 공간. 무료 한도가 사람 기준 켜진 프로젝트 2개라 새 프로젝트를 만들 수 없었다(두 프로젝트 모두 사용 중). 사용자 결정(2026-10-06). 대안 중 Neon은 서울·도쿄 지역이 없고, Supabase Pro는 유료다 |
| DB 계정 | `netproof`(로그인 전용, 자기 비밀번호, 기본 `search_path = netproof`). 풀러 사용자 이름은 `netproof.<프로젝트ID>`, 포트 6543 |
| 스키마·표 | 스키마 `netproof`(소유 `postgres`, `netproof`에 USAGE·CREATE). 표 `users`·`sessions`·`cases`는 `netproof` 소유이고 RLS가 켜져 있다. `netproof` 계정에게 t08의 `public` 표는 0개 보인다 |
| Data API | t08에서 이미 꺼져 있다(8번 과제 설정). `netproof` 스키마는 노출 대상도 아니다 |

### 공개 주소 점검 (Claude, 로그인 없이, 2026-10-06)
| 항목 | 결과 |
| --- | --- |
| 화면 | 판정기·학습실(n8n 포함)·정책 검증·실습·사례 게시판이 1280px·375px에서 열림. 가로 넘침 0, 콘솔 오류 0, 375 헤더 68px |
| 판정 | 브라우저 판정하기 → 통과와 경로. API(synthetic-01): AI 답 PASS → `DISAGREE`, DENY → `AGREE`, 답 없음 → `NO_CLAIM`. `X-NetProof` 없으면 403 |
| 엔진 | `/api/policy-matrix`·`/api/change-impact` 200(`includeFiles`로 서버·엔진·사례가 함수에 실림) |
| DB | 없는 세션 쿠키로 `/api/auth/me` → `sessions` 조회 뒤 `{"user": null}` 200. 로그인 없이 `/api/cases` → 401 |
| 지역·속도 | 응답 `x-vercel-id`가 `icn1::icn1`(서울에서 실행). API 38~330ms(사용자 PC에서 잰 값) |
| 보안 헤더 | CSP·nosniff·no-referrer·X-Frame-Options DENY·HSTS. API는 `Cache-Control: no-store` |
| 빌드 | 번들 `index-D1dnOq1Z.js`가 PR #34 리뷰 때와 같다 |
- 가입·로그인·사례 저장·로그아웃은 실제 계정을 만드는 일이라 Claude가 하지 않았다(사람 확인 대기).

### 비밀값 처리 (2026-10-06 배포)
- 사용자가 "전부 진행"을 요청해서 `netproof` 계정 비밀번호는 Claude의 일회용 스크립트가 만들었다. 비밀번호와 연결 주소는 화면·채팅·저장소·캡처에 출력하지 않았고 사용자 클립보드로만 넘겼다. 비밀번호 관리자 저장, Vercel 입력, SQL Editor 실행은 사용자가 했다.
- SQL Editor에는 비밀번호 대신 SCRAM-SHA-256 확인값만 넣었다(SQL 기록·DB 로그에 원문이 남지 않게). t08의 DB 비밀번호는 쓰지 않았다.
- 연결 주소가 든 임시 파일이 Claude 세션의 임시 폴더(저장소 밖)에 남아 있다. **검토자 지정 뒤 지운다.** 그 뒤에는 사용자 비밀번호 관리자와 Vercel 환경 변수에만 있다.
- 처음에는 사용자 터미널에서 스크립트를 돌리고 클립보드로 SQL을 옮겼는데, 계정 SQL이 실행되지 않아 두 번 실패했다(앱 터미널 연동 오류로 Claude가 터미널 패널에 명령을 넣지도 못했다). Claude가 스크립트를 돌리고 사용자는 SQL Editor에서 Run만 누르는 방식으로 바꿔 끝냈다.
- 계정을 `postgres`에 다시 넘기는 문장(`GRANT netproof TO ...`)은 Supabase PostgreSQL 17.6에서 막힐 수 있다는 보고가 있어 뺐다. 바꾼 SQL은 슈퍼유저가 아닌 관리자와 같은 기본 경로를 흉내 낸 임시 PostgreSQL 17에서 두 번(처음·비밀번호 교체) 시험했다.

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)

- **PR #52 구성도·경로 재생 (병합 완료, `802fd76`, 2026-10-10, 설계 #51 포함 — 사용자 지시로 설계·구현 모두 Codex)**: 판정기·실습·사례 상세·정책 행렬에 판정 당시 network·flow로 만든 구성도(CIDR 구간 소속 선, 장비12·구간24 상한 뒤 경로 장비·목록 fallback)와 엔진 hops의 방향별 재생(1초 간격, 편집·숨김·reduced motion 시 정지), `firewall_in`·`state` 표시, 유일하게 일치하는 decisive에만 결정 단계 표시. **엔진·서버·cases·DB·배포·의존성 0줄.** Claude 리뷰 PASS(실브라우저 1280·375, 겹침·넘침·콘솔 0). 최종: 엔진489+2xfail·서버165+1skip·웹563·빌드 성공(`index-BHD-u76S.js`), 운영 반영 확인.
  - 유지되는 합의: 그림 선은 입력 주소 구간 소속이지 실제 배선이 아니다. 기록되지 않은 연결을 그리지 않는다. 재생은 받은 응답의 커서이고 API를 부르지 않는다.
  - 남은 비차단: N1 복귀에서 막힌 DENY도 처음엔 정방향 「도착」 선택(처음 방향 변경은 사용자 결정), N2 단계 목록이 선택한 방향만.
- **PR #50 export note 조사 오류 수정 (병합 완료, `d7dabff`, 2026-10-10)**: PR #49 비차단 N1을 조사 없는 `엔진 판정(DENY) ≠ 확인된 실제 결과(PASS) — 사례 #N`으로 정리하고 양방향 내보내기 문구·expect 보존을 시험했다. Claude 리뷰 PASS(차단 0). 엔진489+2xfail·서버165+1skip·웹485·빌드 성공. 운영 재판정은 계속 보류.

- **PR #49 불일치 회귀 테스트·엔진 버전별 재판정 (병합 완료, `cd23e46`, 2026-10-10)**: 엔진 0.2.0(PR #44 의미 변경 포함), known_mismatch strict xfail·별도 형식 검사, export 선택 필드, 기존 _judge 기반 100건 커밋·멱등 rejudge/dry-run. 확인·actual_*·updated_at 유지. Claude 리뷰 PASS, 엔진489+2xfail·서버164+1skip·웹485·빌드 성공, 임시 SQLite 독립 실연과 xfail/XPASS 확인. 운영 재판정은 보류. 비차단 N1(export note 조사)은 PR #50으로 해결·병합 완료.
- **PR #47 학습 → 실습 → 기록·복습 흐름 강화 (병합 완료, `225a618`, 2026-10-10)**: 실습 화면 ⑤ 기록하기(판정 결과가 최신일 때만, 기존 `POST /api/cases`), 사례 상세 「다시 살펴보기」(저장된 원인 태그로 관련 학습 주제, 받은 답↔계산·계산↔실제 두 비교), `GET /api/cases?actual_mismatch=1`(확인 필터와 함께면 대시보드 `mismatches_total`과 같음), 게시판 바로가기 3개. **엔진·`cases/`·DB·배포 구성 변경 0줄.** Claude 리뷰 R1(저장 중 재판정·편집 뒤 조용히 저장돼 다시 누르면 중복 — Claude 설계 누락) → Codex 수정 `64a2460` → 재리뷰 PASS → 최신 커밋 재검증 PASS. 최종 실행: 엔진 478 passed·2 xfailed, 서버 157 passed·1 skipped, 웹 485 passed, 빌드 성공.
  - 유지되는 합의: 실습 입력은 `practiceDrafts`, 저장은 서버 재판정. 관련 개념은 원인 태그로 고른 주제이고 정답·채점이 아니다(DENY만 연결). 「내 예상 ≠ 계산」과 「계산 ≠ 실제 결과」는 다른 조건이다.
  - 남은 비차단 후속: N1 상세에서 미확인 불일치가 `확인 전 · PASS`로만 보임, N2 `사례 #N으로` 조사.
- **PR #44 pfSense 상태 추적 계산 1단계 (병합 완료, `b050348`)**: 엔진에 **제한된 상태 추적**을 더했다(ADR-016 신설). `stateful: true` 장비의 인터페이스에 pfSense 화면과 1:1인 구조화 규칙 `rules_in`·`default_in`, 들어오는 방향 1차 일치, `session` 복귀는 **정방향이 지난 그 장비에서만** 규칙을 건너뛴다. 새 파일 `engine/firewall.py`(일치 계산은 기존 `acl.py` 재사용, 새 파서·새 숫자 변환 없음), `docs/semantics.md` §14, 서버는 `rules_in` 상한 500만. **`web/`·`cases/*.json`·DB·배포 구성 변경 0줄**(D2: 화면은 후속). Claude 리뷰 R1(상태 없는 복귀 장비를 `default_in`만 보고 단정) → Codex 수정 `a057d79` → **재리뷰 PASS**. 최종 실행: 엔진 478 passed·2 xfailed, 서버 149 passed·1 skipped, 웹 440 passed(그대로).
  - 유지되는 합의: **상태는 규칙만 건너뛰고 경로는 건너뛰지 않는다**(복귀 경로가 없으면 상태가 있어도 DENY). **모르면 차단으로 단정하지 않고 판정 불가**(사용자 D4) — 기본 정책 미기재, 복귀 추적 중 상태 없는 상태 추적 장비(프로토콜·규칙·기본 정책과 무관), 기존 연결 상태에 기댄 패킷, NAT·floating·스케줄·XML 가져오기 등은 `UNSUPPORTED`. 기존 **무상태 ACL 동작은 그대로**(Claude 독립 A/B 6,000건 불일치 0). **실제 pfSense 장비와 대조하지 않았다**(D5).
  - 남은 후속: ① 2단계 실습 연동(D5 확인 뒤) ② pfSense 화면 입력 ③ 방화벽 원인 태그(지금은 `firewall_in` 차단이 전부 `분류 못 함`) ④ 네트워크 JSON의 추가 최상위 키가 전부 미지원 처리되는 점(화면 과제에서 `toNetwork` 키를 엔진 지원 필드와 먼저 대조) ⑤ 미대조 문구를 화면 패널에 한 번만 보이기.
- **PR #41 원인 태그·통계 (병합 완료, `329e74c`)**: 저장된 판정 JSON만 읽는 엔진 순수 함수 `cause`(태그 9개 + 방향, 네트워크를 다시 읽거나 재판정하지 않음), 검토자 대시보드 「가장 많이 틀린 원인 Top 5」(분모 `comparison=DISAGREE`, 복귀 건수, 그 외·분류 못 함·세 제외, 상한 2,000건 표시), 사례 상세 판정 카드 제목의 `원인 태그(통계)`. `docs/semantics.md` §13 신설. **DB 표·열·판정 경로(`verify.py`·`trace.py`)·`cases/*.json`·`/api/verify`·사례 목록·혼동 행렬은 변경 0줄.** Claude 리뷰 R1(판정 불가 사례에도 원인·방향 표시)·R2(원인 줄이 패널 밖에 떠 있고 판정 문장과 중복) → Codex 수정 `aa29f2a` → **재리뷰 PASS**. 최종 실행: 엔진 382 passed·2 xfailed, 서버 149 passed·1 skipped, 웹 440 passed, 빌드 성공.
  - 유지되는 합의: **집계 ≠ 판정.** 원인은 엔진 근거를 묶은 이름이고 정답·채점이 아니다. 분류 못 하면 **`분류 못 함`으로 두고 추측하지 않는다.** `UNSUPPORTED`·`INVALID`는 태그도 분모도 아니며 화면에도 원인·방향을 적지 않는다. 원인은 **혼동 행렬(오탐·미탐)과 다른 축**이라 `DISAGREE`에서 오탐·미탐을 유도하지 않는다.
  - 남은 후속: 원인별 사례 목록 필터는 저장 열이 필요해 넣지 않았다(다음 과제). 사람이 붙이는 원인 태그(설계 D1의 선택지 b)도 별도 과제로 미뤘다.
- **PR #34 n8n 연동 예시 + 학습실 n8n 주제 + F27·F29 (병합 완료, `1fef9b6`)**: `examples/n8n` 워크플로(웹훅 2 → HTTP Request 4.2 → Code 2 → Respond to Webhook 1.1, `X-NetProof` 헤더, `comparison`만 쓰는 문장)·`request.json`(사례 01 + AI 답 PASS)·`docs/n8n.md`(Docker n8n에서 `host.docker.internal`, 서버는 `--host 0.0.0.0`, 선택 알림), 학습실 n8n 주제와 도구 주제 일반화, F27(server pytest가 worktree 엔진 사용)·F29(서버 테스트가 로그 환경 변수를 끔). Claude 리뷰 R1(n8n 출처 404 두 개 — Claude 설계 실수, 확인 문장, F29 빈틈, Docker 이미지) → 재리뷰 PASS. 수동 QA E(수업 Docker n8n)는 사람 대기.
- **PR #33 보안 로그·학습실 도구 주제·F26 (병합 완료, `0a53519`)**: 환경 변수로 켜는 보안 로그(`NETPROOF_SECURITY_LOG` 파일, `NETPROOF_SYSLOG` UDP. login_success·login_failure·account_locked·password_check_failure, 비밀번호·없는 닉네임 미기록, 꺼지면 아무 데도 안 씀), `docs/security-logs.md`(Graylog 7.1 파이프라인, Wazuh 4.14 규칙 100200~100203), 학습실 Graylog·Wazuh 주제, F26(로그인한 휴대폰 헤더 한 줄). Claude 독립 리뷰 PASS(실제 QA 서버 로그 파일 10줄 = UDP 10개, 비밀번호 0건). 수동 QA D(수업 환경 Graylog·Wazuh)는 사람 대기.
- **PR #32 변경 전/후 판정 비교 (병합 완료, `baf6501`)**: 같은 통신을 구성만 바꿔 다시 판정하면 판정기·실습의 결과 아래에 직전 판정과 지금 판정을 나란히 보인다(받은 답만 바꾸면 기준 유지, 통신 변경·불러오기는 해제). `다른 통신 영향 계산`은 엔진 `change_impact`(`policy_matrix` 두 번, 판정한 통신 제외, opened·closed·other·not_compared)와 `POST /api/change-impact`. 후속 F24(저장 제목)·F25(`은(는)`) 포함. Claude 독립 리뷰 PASS(엔진 무작위 대조 3,000회 불일치 0). 후속 F26은 이번 과제, F27(서버 pytest 경로)·F28(응답 크기)은 남음.
- **PR #31 판정기 알림·조사 정리 F5·F6 (병합 완료, `74c5255`)**: 손대지 않은 빈 템플릿에서는 불러오기 되돌리기 알림을 띄우지 않는다(`hasCurrentInput` 재사용). 조사 일곱 곳을 고정 낱말 뒤 조사로 바꿨다(예시 주제 알림·ACL 삭제·ACL 점검 두 문장·로그인 안내·계정 삭제·비교 배너 `과`). Claude 독립 리뷰 PASS(사례 목록 실패 시 `사례가`까지 실브라우저 확인). 후속 F24(저장 제목)·F25(`은(는)`)는 변경 전/후 과제에 넣었다.
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
- [x] 판정기 화면 개선(critique 23/40 우선 문제 5개) — ② **PR #21 병합 완료 `388a9cf`**, F5·F6은 PR #31(`74c5255`)로 처리
- [ ] ~~Cisco 설정 붙여넣기 ③`access-list`/`ip access-group`~~ — **제외**(위와 같은 이유)
- [x] **배포** — 2026-10-06 공개 주소 https://netproof-vert.vercel.app (가입·검토자 지정 확인은 사람 대기)

**F5·F6 다음 기능 순서 (2026-10-05 사용자 합의 — 아래 4·5주차 목록의 순서를 대신한다)**
수업은 Cisco·pfSense를 쓰지 않고 Cloudflare·Graylog·Wazuh·n8n·Kali Linux를 쓴다. 기능마다 설계 → 승인 → 구현 → 리뷰 → 병합 한 바퀴. 11-01 기능 동결 원칙은 그대로다.
1. [x] 변경 전/후 판정 비교 — ② PR #32 병합(`baf6501`)
2. [x] NetProof 로그인 실패·계정 잠금 기록을 Graylog·Wazuh로 보내기(로컬 시연) + 학습실 Graylog·Wazuh 주제 + F26 — PR #33 병합(`0a53519`). 실제 수집은 수동 QA D(사람)
3. [x] n8n 연동 예시 + 학습실 n8n 주제 + F27·F29 — PR #34 병합(`1fef9b6`). 실제 Docker n8n은 수동 QA E(사람)
4. [x] 원인 태그·통계("가장 많이 틀린 원인 Top 5") — ⑤ PR #41 병합(`329e74c`). 운영 화면 확인은 검토자 계정 생성 뒤
- [x] **pfSense 상태 추적 계산 1단계(이슈 #40, 순서 밖·수업 장비)** — PR #44 병합(`b050348`). 2단계 실습 연동은 D5 확인 뒤, 화면 입력은 후속
5. [x] 불일치 사례 → 회귀 테스트 내보내기, 엔진 버전별 재판정 — ④ **PR #49 병합(`cd23e46`), 운영 재판정은 비밀번호 미확보·사용자 요청으로 보류. 비차단 N1 문구는 PR #50 병합(`d7dabff`)으로 해결**
6. [x] 구성도 그림 + 경로 재생 — ② PR #52 병합(`802fd76`, 설계 #51 포함). [설계·제품 화면](docs/topology-playback-design.md)
7. [x] 연습 문제 모드 다시 정의("채점" 없이, AGENTS.md 원칙) — ⑤ **고치기 과제 구현·검증 완료(2026-10-10), 설계 PR #53 병합 `12c65bb`. 구현 PR [#54](https://github.com/myeongjundev/netproof/pull/54)는 Claude 리뷰·사용자 병합 대기. 체크는 사용자 요청의 구현 완료 기준이며 병합 완료를 뜻하지 않는다.**
8. [ ] Batfish 차등 테스트(엔진 검증용, 수업과 거리 있어 낮춤) — ④
- Kali: 기존 실제 결과 붙여넣기(PR #16, Nmap·ping)가 수업과 맞는다. Cloudflare 활용은 수업 용도를 확인한 뒤 정한다.

**4주차 (10-19~10-25) — 사용자 테스트 주간, 기능은 병행** (항목은 위 순서로 옮김)
- [x] 수정 후보 제안("무엇을 바꾸면 통하나") — ② **PR #19 병합 완료, 8be25a8**

**6주차 (11-02~11-08)**: 버그 수정만, 2차 테스트, 발표·제출

**사람 트랙 (동시에, LLM에 넘기지 않음)**
- [ ] 동기 3명 인터뷰 · [ ] 실제 결과가 있는 사례 모으기(붙여넣기 기능의 재료) · [ ] 사례 04 손계산
- [x] **수업 ACL이 Cisco인지 pfSense인지 확인** — 둘 다 아님(2026-10-05). 수업 도구는 Cloudflare·Graylog·Wazuh·n8n·Kali Linux 등 · [x] **오탐·미탐 양성 정의: 통신 차단(DENY)** · [ ] 표어 결정
- [x] 배포(2026-10-06, 가입·검토자 지정 확인은 대기) · [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

**위험**: 4주차 전에 ①~⑤의 핵심(하이라이트·목록 필터·정책 검증·오탐/미탐·실제 결과 붙여넣기)이 끝나지 않으면 사용자 테스트가 흔들린다. 밀리면 4·5주차 항목부터 미룬다.

- [x] **홈·학습실·헤더 MVP(2026-10-04 추가)** — ①② PR #23 병합(`82975e6`).
- [x] **홈·학습실 개선(critique 27/40, 아이디어 A~D)** — ①② PR #24 병합(`b8bb8e8`).
- [x] **홈·학습 2차(계산 범위 띠·퍼즐 주 행동·실습마다 예상·진입 카드 예상 바꾸기)** — ①② PR #25 병합(`397ee0d`).
- [x] **비교 배너 톤·실습 흐름 다듬기** — ② PR #26 병합(`11c6ac2`).
- [x] **후속 F15~F17 + 수동 QA 준비 도구·체크리스트** — ② PR #27 `2ad04a0`, QA 서버 동시 연결 PR #28 `8268789`. 수동 QA는 사람 대기.
- [x] **실습 화면 + 라이트 기본(프로그래머스 벤치마크, 2차 설계)** — ①② PR #29 병합(`f034bff`).
- [x] **휴대폰 구성 접기(F18·F4) + 실습 후속 F19~F23** — ①② PR #30 병합(`63515a6`).
- [x] **판정기 알림·조사 정리(F5·F6)** — ② PR #31 병합(`74c5255`). 후속 F24·F25는 변경 전/후 과제에 포함
- [x] **사례 게시판 학습형 UI 1차(2026-10-03 추가)** — ①②④ PR #20 사용자 지시로 병합(`c2a998d`). **사용자 G2/삭제 취소 수동 QA는 별도 대기 유지.**

## 다음 LLM이 확인할 내용
- **사용자:** 운영 DB rejudge는 보류 중이다. 비밀번호 확보 뒤 재개하며 주소는 가려진 입력으로만 받는다. Vercel DATABASE_URL의 Production and Preview 적용을 Production 전용으로 변경한다(Codex는 설정을 바꾸지 않음).
- **Claude(리뷰):** 고치기 과제 구현 PR의 위 시험 기록과 완료 조건 7을 확인한다. 엔진·서버 API·DB·`cases/` 변경 0줄, 해법은 서버 테스트 안에만, 번들 검색 0건, 과제 문구·부분 실패·늦은 응답 폐기·App 메모리를 대조한다.
- **Claude(리뷰):** 엔진 diff가 있는 PR은 `docs/semantics.md` §15에 따라 버전을 올렸는지 대조한다. `rejudge` 보고서에 사례 제목·닉네임이 없어야 한다.
- **사용자:** D5(실습 사실)를 주면 2단계를 설계한다. 그다음 기능도 사용자가 정한다. 배포 후속(가입·사례 저장·로그아웃·검토자 지정·Vercel 환경 변수)과 수동 QA A~E는 사람이 확인한다.
- **다음 설계자(Claude):** pfSense 규칙은 `docs/semantics.md` §14와 ADR-016이 기준이다. **모르면 판정 불가**가 이 기능의 핵심 합의다. 실제 장비와 대조하기 전에는 일치한다고 적지 않는다.
- **다음 설계자(Claude):** 과제마다 설계 → 승인 → 구현 → 리뷰 → 병합 한 바퀴다. 원인 태그 규칙은 `docs/semantics.md` §13이 기준이고 바꾸려면 먼저 요청한다. 원인은 판정이 아니다.
- **검토자 지정(7단계):** `make-reviewer`는 `netproof` 계정 연결 주소로 실행한다(`docs/deploy.md` 7). 주소는 채팅·명령줄·캡처에 넣지 않는다.
- **배포 흐름:** `main`에 병합하면 바로 운영에 나간다. 리뷰 원칙은 그대로이고, 병합 뒤 공개 주소에서 바뀐 화면·API를 한 번 확인한다.
- **t08 Postgres 오류:** 배포 전 t08 대시보드에 최근 60분 Postgres 오류 111건이 일정한 간격으로 보였다(NetProof와 무관, 원인 미확인). 사용자가 Supabase Logs에서 확인한다.
- **남은 후속:** F28 change-impact 응답에 바뀐 칸 전체가 담김(최대 971줄·571 KiB), F2 용어 통일, F3 받은 답 종류·중복 정리.
- 접기는 CSS(`.mobile-fold`)로만 하고 React로 `open`을 관리하지 않는다. 넓은 화면은 지금과 같아야 한다. 판정기는 접지 않는다.
- 실습 입력은 `practiceDrafts`에만 두고 판정기 `draft`는 `판정기로 가져가기`(기존 되돌리기) 때만 바꾼다. 실습 판정은 verify, ⑤ 기록은 기존 createCase를 부르고 서버가 재판정해 저장한다. 승인된 다른 통신 영향은 단추로 change-impact를 요청하고 비교·분류를 화면에서 다시 계산하지 않는다(ADR-001). 정답·채점·완료 표시를 만들지 않는다.
- 첫 방문 안내 줄과 테마의 localStorage는 try/catch. 떠 있는 투어는 만들지 않는다. cases JSON은 테스트에서만 import한다.
- 수동 QA 결과는 사람이 `docs/qa-manual.md`로 기록한다. AI가 대신 완료로 바꾸지 않는다.
- 판정기 규칙(배너 문장, 되돌리기 한 단계, 즉시 검사가 판정을 막지 않음, ACL 점검 펼침 조건)을 바꾸고 싶으면 먼저 요청한다.

## 사용자 수동 QA 대기 (배포 확인 + PR #20 G2·삭제 취소 + 홈·실습 흐름 + 수업 도구)
- **배포 6단계(가입·사례 저장·로그아웃)·7단계(검토자 지정): 사람 확인 대기.** Claude의 공개 주소 점검은 로그인 없이 할 수 있는 것만이다.
- **A(PR #20 G2)·B(실제 기본 확인창 삭제 취소)·C(홈·실습 흐름): 사용자 수동 확인 대기.** 도구 실행 확인과 F15·F17 구현 검증은 수동 QA 통과가 아니다.
- 병합 뒤 [체크리스트](docs/qa-manual.md)와 `scripts/qa_local.py`로 사람이 직접 확인한다. 결과는 사람이 PR 코멘트나 이 절에 적는다. 비밀번호·쿠키·토큰은 기록하지 않는다.
- 원칙: 임시 DB·합성 계정/사례만 쓴다. 실제 기본 확인창을 대체·우회하지 않는다. 비밀번호·쿠키·토큰을 기록하지 않는다. 확인한 항목만 완료로 바꾼다.
- C에 변경 전/후 항목을 더했다(PR #32). `판정기로 가져가기` 항목은 빈 판정기에서 알림이 없다는 점(PR #31 F5)을 반영해 고쳤다(PR #32 리뷰).
- D(수업 환경의 Graylog·Wazuh 실제 수집·검색·경보)는 체크리스트에 신설했고 **사용자 확인 대기**다. AI의 로컬 파일·UDP 확인은 실제 도구 수집 확인이 아니다.
- E(수업 Docker n8n에서 예시 워크플로 가져오기·실행)는 체크리스트에 신설했고 **사용자 확인 대기**다. AI의 API·스크립트 대역 검사는 실제 n8n 실행 확인이 아니다.

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
- **worktree에서 서버 테스트(F27):** server/pyproject.toml의 pythonpath에 ../engine/src를 추가해 PYTHONPATH 없이 해당 worktree 엔진을 쓴다. 이번 전체 실행과 경로 assert로 확인했다.
- **표시 ≠ 판정.** 판정기 개선은 엔진이 준 `result`·`comparison`·`problems`를 보여 주는 방식만 바꾼다.
- **NetProof DB는 t08 프로젝트에 기대어 있다.** t08을 멈추거나 지우면 NetProof도 멈춘다. Supabase 무료 프로젝트는 오래 쓰지 않으면 멈출 수 있고, 멈춘 지 90일이 지나면 다시 켤 수 없다. t08의 DB 비밀번호를 바꿔도 NetProof는 영향이 없다. `netproof` 비밀번호를 바꾸면 Vercel `DATABASE_URL`도 바꾸고 다시 배포한다.
- 주 작업 폴더(`C:/gov/project/skt aleph/netproof`)는 이제 `main`이다. 2026-10-05까지 `codex/acl-suggest`에 머물러 있어서 공유 venv가 옛 엔진을 불러왔다.
- [HOME_HANDOFF.md](HOME_HANDOFF.md)는 2026-10-02 집 인계 시점 기록이다. 현재 상태는 이 문서가 기준이다.
- 날짜별 작업 정리: [10-04 ~ 10-06 첫 배포](docs/work-summary-2026-10-04_06.md), [10-06 배포 이후](docs/work-summary-2026-10-06.md).

현재 과제(pfSense 상태 추적 1단계) 설계: Claude Opus 5(사용자 승인 2026-10-06). 구현·수정: Codex (GPT-6), R1 수정·재검증 완료. 리뷰: Claude 재리뷰 대기. 직전 과제(원인 태그·통계) 설계·리뷰: Claude Opus 5, 구현: Codex (GPT-6), 2026-10-06 병합. 결정·병합: 사용자.
이전 배포 작업: 단계 안내·DB 준비 스크립트·공개 주소 점검·문서 Claude (Claude Opus 5.5). 가입·SQL 실행·Vercel 입력·병합: 사용자.

## 프로젝트 소개·회고 문서 (2026-10-06)

- 사용자 요청: 대화에서 정리한 NetProof 소개와 다섯 단계 회고를 Markdown으로 저장한다. 이번 문서 작업은 사용자가 직접 요청한 별도 범위다.
- 브랜치: `codex/project-retrospective`, 기준 `main` `329e74c`.
- 결과물: [프로젝트 소개와 개발 과정 회고](docs/netproof-retrospective-2026-10-06.md).
- 내용: 문제 발견 → 접근 → 시행착오 → 피드백 반영 → 배운 점, 내부 네트워크 수업 구성, 구현 상태와 pfSense 계획 구분, 설명용 짧은 소개와 근거 링크.
- 최신화: GitHub에서 PR #41의 병합(`2026-10-06T03:22:38Z`)을 확인해 회고에 반영했다. 공개 사이트의 신규 기능 반영은 이번 작업에서 확인하지 않았다. 위 원인 태그 과제 기록은 별도 이력으로 유지한다.
- 제품 코드·화면 변경 없음. pfSense 설계나 구현을 수행하지 않았고, 실제 실습·사람의 수동 QA를 완료로 바꾸지 않았다.
- 상태: `main`에 들어갔다(`5199532`). Claude 확인(2026-10-06): 링크 8개 유효, AI 답 기록 16행(CLCO 12 + qwen3.5:9b 4)·판정 불일치 0건, 합성 사례 3개로 본문과 맞는다. **고칠 곳 두 군데** — ① 「원인 태그·불일치 원인 Top 5」의 "공개 사이트 반영 미확인"은 **반영 확인됨**(번들 해시가 리뷰 때 빌드한 것과 같다) ② "HANDOFF에 병합 대기 문구가 남아 있다"는 PR #42에서 해소됐다. 작성자가 고친다.

실제 실행한 테스트 출력(2026-10-06):

```text
cd engine && ../.venv/Scripts/python -m pytest -q
382 passed, 2 xfailed in 4.45s

cd server && ../.venv/Scripts/python -m pytest -q
149 passed, 1 skipped in 26.65s

npm --prefix web test
Test Files  32 passed (32)
     Tests  440 passed (440)
  Duration  2.52s (transform 52%, import 30%, tests 10%, worker 8%)
```

`git diff --check` 오류 없음. 화면을 변경하지 않아 web build는 실행하지 않았다.

Codex (GPT-6)
