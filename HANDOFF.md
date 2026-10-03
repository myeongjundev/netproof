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
- 작업: **수정 후보 제안 1차** — 판정기의 흐름 하나에 대해 "ACL에 어떤 줄을 넣으면 사용자가 고른 결과가 되는지"를 엔진이 계산하고, 기존 `verify`로 다시 판정해 확인한 후보만 보여 준다(로드맵 4주차, 순환 고리 ②).
- 사용자 승인(2026-10-03):
  - 목표 결과(PASS/DENY)는 **사용자가 직접 고른다. 기본값은 없다.**
  - 편집은 **ACL 줄 삽입만** 한다.
- 기반: origin/main `c19f554`(PR #18 ACL 점검 병합 완료, 사용자 확인).
- 브랜치: `codex/acl-suggest`.
- PR: https://github.com/myeongjundev/netproof/pull/19 (main 대상, OPEN, 구현 `a1f39dd`). 네 명령 전체 출력과 브라우저 확인을 [Codex] 코멘트에 남김.
- 단계: 설계 확정 → Codex 구현·테스트 완료 → Claude 리뷰 PASS(2026-10-04) → **사용자 최종 확인·병합 결정(다음 차례).**
- 보류(사람 트랙): Cisco 설정 붙여넣기 선행 확인, 배포.

## 작업 정의

### 0) 원칙
- **후보는 판정이 아니다.** PASS/DENY는 기존 `verify`만 정한다(ADR-001). 후보를 정답이나 안전 보장으로 표현하지 않는다.
- **모르면 만들지 않는다.** 근거를 만들 수 없으면 `NO_CANDIDATE`와 사유를 돌려준다.
- **쓰기가 없다.** 다음은 하지 않는다: 자동 적용, 입력 덮어쓰기, DB 쓰기, 기존 `expect` 변경, 실제 장비 반영, 앱 안 LLM 호출.

### 1) 엔진: `engine/src/netproof_engine/suggest.py` (신규)
- 함수는 `suggest(network_data, flow, target) -> dict` 하나다. 어떤 입력에도 예외를 던지지 않고 사전을 돌려준다.
- 기존 코드 재사용(**읽기·호출만 하고 고치지 않는다**):
  - `verify.verify`, `verify._flow_packet`, `verify._reverse`
  - `acl.parse_rule`, `acl.ICMP_TYPES`
  - `model.load` — `verify`가 PASS/DENY를 낸 뒤 `shared_by`를 계산할 때만 쓴다.
  - 공개 helper를 새로 만들려고 기존 파일을 바꾸지 않는다.
- 모듈 상수(테스트에서 monkeypatch로 바꿀 수 있게 둔다):
  - `MAX_EDITS = 4` — 목표 PASS 후보 하나의 최대 삽입 수
  - `MAX_DENY_CANDIDATES = 8` — 목표 DENY 후보 최대 수
  - `MAX_VERIFY_CALLS = 9` — 요청 하나에서 `verify`를 부르는 전체 상한(처음 판정 1회 포함)
  - `MAX_ACL_LINES = 500` — 서버 `LIMITS["acl_lines"]`와 같은 값. 주석에 그 뜻을 적는다.

#### 처리 순서
1. **목표 검사.** `target`이 `"PASS"`·`"DENY"`가 아니면(없음 포함) `status: "INVALID"`로 끝낸다. `verify`는 부르지 않는다.
2. **처음 판정.** `before = verify(network_data, flow)`.
   - 결과가 UNSUPPORTED/INVALID → `NO_CANDIDATE`, `not_decidable`
   - 결과가 이미 목표와 같음 → `ALREADY`
3. **목표가 PASS일 때(현재 DENY).** 편집 목록 `edits = []`로 시작해 아래를 반복한다.
   - 막힌 쪽을 정한다: `before`(또는 직전 재판정)의 `forward.delivered`가 거짓이면 `forward`, 아니면 `return`.
   - 그 경로의 마지막 홉(`decisive`)이 `acl_in`/`acl_out`의 `drop`이 아니면 → `not_acl_cause`.
   - 판정을 낸 줄 앞에 permit 줄을 넣는다.
     - `rule_line`이 원래 입력 줄이면 `anchor_before`는 그 줄 번호다.
     - 판정을 낸 것이 암묵적 deny(`rule_line`이 null)면 `anchor_before`는 null(맨 끝)이다.
     - 재판정은 편집을 적용한 목록 위에서 하므로 `rule_line`은 새 번호다. 이를 아래 2절 규칙의 역으로 원래 번호로 되돌린다. 삽입한 permit 줄은 같은 흐름의 drop 원인이 될 수 없으므로 되돌릴 수 없는 경우는 없다. 만약 생기면 `reverify_failed`.
   - 넣을 줄의 문법(3절)을 `parse_rule`로 다시 읽고, `Rule.matches(그 경로의 패킷)`가 참인지 확인한다. 거짓이면 `reverify_failed`.
   - 편집을 적용했을 때 ACL 전체 줄 수가 `MAX_ACL_LINES`를 넘으면 → `line_limit`.
   - 원래 입력과 편집 목록으로 2절의 정규 적용 결과를 만들고 다시 `verify`한다.
     - PASS → 후보 `c1` 하나로 끝
     - ACL 단계에서 다시 drop → 반복
     - 경로 없음·게이트웨이 없음 등 ACL 아닌 원인 → `not_acl_cause`
     - UNSUPPORTED/INVALID → `reverify_failed`
     - 편집 `MAX_EDITS`번 뒤에도 PASS가 아님 → `edit_limit`
4. **목표가 DENY일 때(현재 PASS).** 정방향 `forward.hops`에서 `acl_in`/`acl_out`이고 결과가 `ok`인 홉을 경로 순서대로 본다.
   - `(acl, rule_line)`이 같은 홉은 처음 것 하나만 쓴다.
   - 홉마다 그 `rule_line` 앞에 deny 줄을 넣는 편집 1개짜리 후보를 만든다.
   - 위 홉이 `MAX_DENY_CANDIDATES`개를 넘으면 앞에서부터 그 수만 계산하고 `truncated: true`.
   - 후보마다 다시 `verify`해 결과가 DENY인 것만 남긴다. 줄 수가 넘는 후보는 버린다.
   - 정방향에 ACL 단계가 하나도 없으면 → `no_acl_on_path`. 복귀 방향은 1차 범위 밖이다.
   - 남은 후보가 0개면 사유를 정한다: 모두 줄 수 때문이면 `line_limit`, 아니면 `reverify_failed`.
5. 전체 `verify` 호출은 PASS 쪽 최대 5회, DENY 쪽 최대 9회다. `MAX_VERIFY_CALLS`를 넘는 경로가 생기면 버그이므로 테스트로 막는다.
6. 예기치 않은 `ValueError`·`TypeError`·`AttributeError`·`KeyError`는 `matrix.py` 관례처럼 `status: "INVALID"`, `problems: ["입력 형식을 확인하세요: …"]`로 바꾼다.
- 입력 사전은 깊은 복사본만 다룬다. 원본은 바꾸지 않는다.

### 2) 정규 적용 규칙 (엔진·테스트·문서 공통)
- 줄 번호는 원래 입력 목록에서 1부터 센 위치다. 빈 줄도 세며, `Rule.line`과 같다.
- ACL 하나의 새 목록은 이렇게 만든다.
  1. 원래 줄 k를 순서대로 돌며, 먼저 `anchor_before == k`인 편집의 `raw`를 **편집 목록 순서대로** 넣고, 그다음 원래 줄 k를 넣는다.
  2. 마지막에 `anchor_before == null`인 편집을 편집 목록 순서대로 붙인다.
- `insert_at`은 그 후보의 **모든 편집을 적용한 새 목록**에서 그 줄의 1부터 센 위치다.
- 같은 ACL에 삽입이 여러 개여도 원래 입력과 `edits`만 있으면 결과 목록이 하나로 정해진다.
- 엔진은 매번 원래 입력에서 이 규칙으로 다시 만든다. 이전 중간 결과에 이어 붙이지 않는다.

### 3) 넣는 줄의 문법
패킷은 `_flow_packet(flow)`(정방향)과 `_reverse(정방향 패킷)`(복귀)으로 얻는다. ICMP 종류 표기: 8은 `echo`, 0은 `echo-reply`, 나머지는 숫자.

| 경우 | 줄 |
|---|---|
| 정방향 tcp/udp | `{act} {proto} host S host D eq P` |
| 정방향 icmp | `{act} icmp host S host D {종류}` |
| 복귀 tcp (permit만) | `permit tcp host D eq P host S established` |
| 복귀 udp (permit만) | `permit udp host D eq P host S` |
| 복귀 icmp (permit만) | `permit icmp host D host S echo-reply` |

- 복귀 줄에는 엔진이 고정한 출발지 포트 50000이 들어가지 않는다.

### 4) 응답 schema (정확히 이 키만)
```json
{
  "status": "OK | ALREADY | NO_CANDIDATE | INVALID",
  "target": "PASS | DENY | null",
  "reason": "null | not_decidable | not_acl_cause | no_acl_on_path | edit_limit | reverify_failed | line_limit",
  "problems": ["…"],
  "engine_version": "0.1.4",
  "truncated": false,
  "before": {"…verify 응답 그대로…"},
  "candidates": [{
    "id": "c1",
    "edits": [{
      "acl": "101",
      "anchor_before": 3,
      "insert_at": 3,
      "raw": "permit tcp host 10.0.1.10 host 10.0.2.10 eq 443",
      "action": "permit",
      "device": "R1",
      "interface": "g0/0",
      "direction": "in",
      "path": "forward",
      "shared_by": [{"device": "R1", "interface": "g0/0", "direction": "in"}]
    }],
    "after": {"…다시 계산한 verify 응답 그대로…"}
  }]
}
```

상태별 필드 규칙:

| status | target | before | candidates | reason | problems |
|---|---|---|---|---|---|
| `INVALID` | 받은 값이 PASS/DENY면 그 값, 아니면 null | null | `[]` | null | 1개 이상 |
| `ALREADY` | 목표 | 판정 | `[]` | null | `[]` |
| `NO_CANDIDATE` | 목표 | 판정(UNSUPPORTED/INVALID 판정도 그대로) | `[]` | 위 여섯 사유 중 하나 | `[]` |
| `OK` | 목표 | 판정 | 1개 이상 | null | `[]` |

- `id`는 `c1`, `c2`… 순서다.
- PASS 후보는 1개이고 편집은 1~4개다. DENY 후보는 1~8개이고 편집은 각 1개다.
- `truncated`는 DENY 후보를 잘랐을 때만 `true`다.
- 필드 값의 출처:
  - `direction`: `in`/`out`
  - `path`: `forward`/`return`
  - `device`·`interface`: 원인 홉의 장비와, `acl_in`이면 `in_if`·`acl_out`이면 `out_if`
  - `shared_by`: 그 ACL이 붙은 모든 인터페이스. (device, interface, direction) 오름차순.
- **수정한 network를 응답에 싣지 않는다.**

### 5) 서버: `POST /api/suggest` (`server/netproof_api/cases.py`)
- `/api/acl-audit`와 같은 모양이다.
  - 로그인 없이 사용한다. 기존 CSRF·X-NetProof 검사는 그대로 둔다.
  - `_limit_problem(network)` 초과는 422.
  - 기존 64KB 전역 상한은 **413 그대로**다.
- 본문은 `{"network", "flow", "target"}`이다. `_judge`처럼 dict가 아니면 `{}`로 넘기고, 엔진 응답을 **항상 200**으로 돌려준다.
- 입력 500줄 한도는 서버가 지키고, 삽입 뒤 500줄 초과는 엔진이 `line_limit`로 처리한다. 그래서 후보를 사람이 옮겨 넣어도 같은 API로 다시 판정할 수 있다.
- DB 접근은 없다. 다른 엔드포인트는 고치지 않는다.

### 6) 화면: 판정기만
- 새 파일은 `web/src/components/SuggestPanel.tsx`이고, `JudgePage`에서 `ResultPanel`·`AclAudit` 뒤에 둔다.
- **패널을 보이는 조건**: 판정이 있고, 결과가 PASS/DENY이고, 입력이 판정 뒤 바뀌지 않았을 때(`!stale`).
  - 처음에 목표 라디오(PASS/DENY)는 **선택되지 않은 상태**다. 고르기 전에는 "수정 후보 계산" 단추가 비활성이다.
- **요청**: 판정한 입력만 계산한다. 요청 시점에 `!stale`이어야 하고, `judgedNetwork`의 복제와 판정 당시 흐름 `draft.flow`를 보낸다.
- **늦은 응답 버리기**: `suggestRevision` ref를 따로 둔다. 다음 경우에 값을 올리고, 응답이 왔을 때 번호가 다르면 버린다.
  - 목표 변경, `judge()`, `load()`(예시·공유·실습 불러오기)
  - 응답 도착 시점의 입력 snapshot이 요청 때와 다를 때도 버린다.
- **결과 지우기**: 목표 변경, 재판정, 예시 불러오기 때 기존 후보 결과·오류를 지운다.
- **이전 결과 표시**: 결과가 보이는 중에 입력이 바뀌면 지우지 않고 "이전 결과" 표시를 하고, "원래 줄 보기"를 막는다.
- 고정 문구(항상 보임): **"수정 후보는 판정이 아니며 정답이나 안전을 보장하지 않습니다. 이 흐름 하나만 다시 계산했고, 다른 통신에 미치는 영향은 계산하지 않았습니다."**
- 편집 한 줄의 표시:
  - "{acl} · 원래 {N}번 줄 앞(또는 맨 끝)에 넣기 → 새 {insert_at}번 줄 · {device} {interface} {in/out} · {정방향/복귀 방향}"
  - `raw`는 코드 글꼴로 보인다.
- 공유 ACL은 경고가 아니라 사실로 적는다: "ACL {acl}은(는) {n}곳에 붙어 있어 이 줄은 모든 곳에 적용됩니다: …"
- 후보마다 "다시 판정: {after.result} — {after.reason}"을 보인다.
- `ALREADY`·사유·`truncated` 문구는 이렇게 쓴다.
  - `truncated`: "정방향 ACL 단계 중 앞의 8곳만 계산했습니다."
- "원래 줄 보기"는 `anchor_before`가 있을 때만 보이고, 기존 `showAcl(acl, anchor_before)`을 쓴다(입력은 바뀌지 않았으므로 원래 번호가 맞다).
- 적용·복사·입력 반영 단추는 두지 않는다.
- 문구 변환은 **순수 모듈 `web/src/suggest.ts` 한 곳에서만** 한다. 판정이나 후보를 다시 계산하지 않는다.
- `api.ts`에는 `suggest(network, flow, target)` 한 줄만, `types.ts`에는 `Suggestion` 계열 타입만 더한다. 기존 타입은 바꾸지 않는다.

### 7) 허용 파일 / 금지
**허용 파일**
- `engine/src/netproof_engine/suggest.py`(신규)
- `engine/src/netproof_engine/__init__.py` — `from .suggest import suggest` **한 줄 외 변경 금지**(`__all__`·`__version__` 포함)
- `engine/tests/test_suggest.py`(신규)
- `server/netproof_api/cases.py`, `server/tests/test_suggest.py`(신규)
- `web/src/{suggest.ts, suggest.test.ts}`(신규), `web/src/components/SuggestPanel.tsx`(신규)
- `web/src/{api.ts, types.ts, styles.css}`, `web/src/pages/JudgePage.tsx`
- `docs/semantics.md`(**12절 "수정 후보" 추가만**, 1~11절 불변)
- `HANDOFF.md`, `decisions/ai-work-log.md`

**금지**
- 엔진 판정 코드: `acl.py`·`model.py`·`trace.py`·`verify.py`·`matrix.py`·`observe.py`·`audit.py`
- 서버: `models.py`·`auth.py`·`__init__.py`, DB 열·마이그레이션·DB 쓰기
- 화면: `ResultPanel`·`AclAudit`·`AclEvidence`·`CaseDetailPage`·`PolicyMatrixPage`·`DashboardPage`·`CasesPage`
- `share.ts`·`draft.ts`·`practice.ts`, 기존 `expect`·`cases/*.json`
- 새 의존성, 자동 적용, 앱 안 LLM, 배포·병합

### 8) 위험과 대응
- **후보를 정답·안전으로 오해** → 고정 문구, 공유 ACL 사실, 흐름 하나만 확인했다는 문구.
- **판정 의미 복제** → 원인은 `verify` 출력의 홉만 읽고, 확인은 항상 `verify`를 다시 실행한다.
- **줄 번호 혼동** → 2절의 정규 규칙과 `anchor_before`·`insert_at`을 함께 둔다.
- **응답·시간 폭증** → 편집 4개, DENY 후보 8개, verify 9회, network 미포함.
- **고정 포트 의존** → 복귀 줄에 포트 50000을 넣지 않는다.

### 9) 완료 조건 (직접 실행하고 출력을 붙인다)
- `cd engine && ../.venv/Scripts/python -m pytest -q`
- `cd server && ../.venv/Scripts/python -m pytest -q`
- `npm --prefix web test`
- `npm --prefix web run build`

#### 엔진 `test_suggest.py`
**독립 적용 규칙**
- 테스트는 2절 규칙을 **suggest를 쓰지 않고 따로 구현**해 원래 입력에 `edits`를 적용한다.
- 그 결과로 다음을 확인한다.
  - (a) `insert_at` 위치의 줄이 `raw`와 같다.
  - (b) 삽입한 위치를 빼면 원래 목록과 같다.
  - (c) `verify(적용본, flow)`가 `target`이고 `after`와 정확히 같다.

**교차 확인 대상**
- `cases/*.json` 전부, 그리고 Hypothesis로 만든 직선 토폴로지(h1–R1–R2–h2).
  - 무작위 소규모 ACL을 넣는다: `ip`·tcp·udp·icmp, any·host·서브넷, 모든 포트 조건, `established`, ICMP 종류.
  - 무작위 in/out 연결과 무작위 흐름·모드를 쓴다.
  - 고정 시드로 돌리고, 엔진 전체 테스트 시간이 지금보다 10초 넘게 늘지 않게 한다.
- 목표 PASS/DENY 둘 다 돌린다.

**모든 입력에서 확인할 불변식**
- `NO_CANDIDATE`도 합법 결과다. **억지로 `OK`를 요구하지 않는다.**
- 4절 상태별 필드 규칙을 지킨다.
- 응답 키가 schema와 정확히 같고, network가 들어 있지 않다.
- `before == verify(원본)`.
- 원본 입력이 바뀌지 않았다(깊은 비교).
- 편집 수·후보 수 상한을 지킨다. 모듈의 `verify`를 감싼 호출 수가 `MAX_VERIFY_CALLS` 이하다.
- `OK`이면 독립 적용 규칙 (a)~(c)가 성립한다.

**개별 테스트**
- 암묵적 deny → `anchor_before` null, 맨 끝에 붙음.
- 같은 ACL에 두 편집 → `insert_at` 재현. 예: 한 ACL을 R1 g0/0 in과 out에 붙여 정방향·복귀가 둘 다 막히는 구성.
- tcp 복귀 줄은 `established`이고, `flow.src_port`를 바꿔도 적용본이 PASS.
- udp·icmp echo.
- 넣는 줄의 정확성: `parse_rule` 후 흐름 패킷에는 일치하고, 출발지 주소 ±1·목적지 포트 ±1 패킷에는 불일치.
- 사유별:
  - `not_decidable`: INVALID 입력, 앞 줄 미해석으로 UNSUPPORTED
  - `not_acl_cause`: 게이트웨이 없음, 경로 없음
  - `no_acl_on_path`
  - `edit_limit`: `MAX_EDITS`를 1로 바꿈
  - `line_limit`: `MAX_ACL_LINES`를 작게 바꿈
  - `reverify_failed`: 두 번째 ACL의 앞 줄이 미해석
- `shared_by`가 여러 곳인 경우.
- DENY 중복 제거와 `truncated`(`MAX_DENY_CANDIDATES`를 1로 바꿈).
- 목표 누락·`"pass"` 같은 잘못된 값 → `INVALID`. `ALREADY`.

#### 서버 `test_suggest.py` (conftest의 임시 DB)
- 비로그인 200, 응답이 `suggest(...)` 결과와 같다.
- `Cache-Control: no-store`.
- `before_cursor_execute` 리스너로 **SQL 0건**을 확인한다.
- 잘못된 target도 200 `INVALID`.
- ACL 501줄과 장비 41개는 422.
- CSRF 누락·불일치는 403.
- 64KB 초과는 413.
- 기존 엔드포인트 테스트 회귀가 없다.

#### 웹 `suggest.test.ts` (순수 모듈)
- 네 status, 여섯 사유, `truncated` 문구.
- 고정 문구가 항상 들어 있다.
- `anchor_before`가 null인 경우와 숫자인 경우의 문구, `insert_at`, in/out·정방향/복귀 표기.
- `shared_by` 1곳·여러 곳 사실 문구, `after` 표기.
- 적용 동작을 만들지 않는다.

#### 브라우저 375×812와 1280 (임시 SQLite, 로컬 포트만)
1. DENY 예시를 판정한다. 목표를 고르기 전에는 단추가 비활성이다.
2. PASS를 고른다. 후보·고정 문구·`raw`가 보이고, "원래 줄 보기"가 그 원래 줄을 선택한다.
3. 목표를 DENY로 바꾼다. 결과가 지워지고, 계산하면 `ALREADY` 문구가 보인다.
4. 입력을 고친다. "이전 결과" 표시가 나오고 "원래 줄 보기"가 비활성이다.
5. 다른 예시를 불러온다. 패널이 초기화된다.
6. 사람이 후보 줄을 직접 입력에 옮겨 재판정한다. 결과가 `after`와 같다.
7. 공통: body `scrollWidth ≤ 화면 폭`, console error 0.

#### `docs/semantics.md` 12절 "수정 후보"
- 판정이 아님, 삽입만, 목표 선택
- 3절 줄 문법, 2절 정규 적용 규칙
- 상태·사유, 상한, `line_limit`
- 공유 ACL 사실, 흐름 하나만 확인

### 10) 하지 않는 것 (다음 과제 이후)
- 줄 삭제·범위 넓히기·순서 바꾸기 후보
- 복귀 방향 DENY 후보
- 경로·게이트웨이·ACL 연결 수정
- 다른 흐름 영향(변경 전/후 판정 비교 과제)
- 사례 상세·공유 링크·매트릭스 표시
- Cisco 붙여넣기

설계: Claude (Claude Opus 5.5, `claude-opus-5-5`)

## 완료 내용 / 테스트 결과
- 설계 커밋 `9de253c` 뒤 삽입 전용 엔진·상태 없는 API·판정기 후보 패널 구현. 목표 기본값·자동 적용·입력 덮어쓰기·DB 쓰기 없음. 후보는 기존 verify 재판정으로만 확인하며 다른 흐름 영향은 계산하지 않는다.
- 독립 적용·삭제 복원·after=verify 교차 확인: 기존 사례 모두/두 목표, Hypothesis 고정 시드 30개 직선 토폴로지, 같은 ACL 정방향/복귀·나중 편집에 따른 insert_at 이동, tcp 출발지 포트 변화·ACK, udp/icmp 숫자 종류, 정확 host/포트 ±1, 여섯 사유, 실제 500줄 한도, 실제 10개 ACL 경로의 PASS 5회·DENY 9회 상한. 새 엔진 테스트 32개. 전체 3.50초로 이전 과제 마지막 3.87초 대비 +10초 조건 충족(환경 의존).
- 서버 임시 DB 테스트: 익명 응답=엔진, SQL 0건, no-store, 잘못된 목표 200 INVALID, 501줄·41장비 422, CSRF 403, 전역 64KB 413. 기존 엔드포인트 변경 없음.
- 범위 확인: 판정 파일·expect·사례·DB 모델·허용 밖 화면 불변. engine/__init__.py는 import 한 줄만 추가. docs/semantics.md 1~11절 불변, 12절만 추가. git diff --check 성공.
- 화면 계약의 조건을 함께 적용: 최초 패널은 !stale인 PASS/DENY에서만 보이되, 이미 받은 후보가 있는 채 입력만 바뀌면 패널을 남겨 이전 결과와 비활성 원래 줄 버튼을 표시한다. 목표 변경·재판정·load는 결과를 지운다. 입력 변경 뒤 되돌림도 진행 중 응답을 무효화한다.

### 브라우저 직접 확인

- 로컬 127.0.0.1:5184, 임시 SQLite만 사용(운영 DB 접근 없음). 검증 후 서버·탭을 닫고 viewport override 복원.
- 375×812와 1280×900 각각: 예시01 DENY → 목표 미선택/계산 비활성 → PASS 선택/후보 c1 및 고정 문구·raw 확인 → 원래 줄 보기에서 원래 deny 줄 선택 → 목표 DENY로 변경 시 후보 삭제/계산 시 ALREADY → 입력 수정 시 이전 결과/원래 줄 보기 비활성 → 예시02 load 시 패널 초기화 → 후보 permit 줄을 직접 입력하고 재판정 PASS(후보 after와 같은 "정방향 · 복귀 방향 모두 통과").
- body scrollWidth: 360 ≤ 375, 1265 ≤ 1280. console error 0, 가로 넘침 없음.
- 캡처는 로컬 임시 파일 netproof-suggest-375.png / netproof-suggest-1280.png에 보관하며 저장소에는 넣지 않음. 스킬을 이용해 실제 브라우저 조작·관찰로 확인함.
- 미검증: 인위적 네트워크 지연 주입·전체 DOM 자동 회귀·PostgreSQL 실연결. 기존 __all__은 설계 지시대로 변경하지 않음.

### `cd engine && ../.venv/Scripts/python -m pytest -q`

```text
........................................................................ [ 21%]
........................................................................ [ 43%]
........................................................................ [ 65%]
........................................................................ [ 87%]
......................................xx                                 [100%]
326 passed, 2 xfailed in 3.50s
```

### `cd server && ../.venv/Scripts/python -m pytest -q`

```text
.......................................................................s [ 78%]
....................                                                     [100%]
91 passed, 1 skipped in 24.70s
```

### `npm --prefix web test`

```text
> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/gov/project/skt aleph/netproof/web


 Test Files  12 passed (12)
      Tests  128 passed (128)
   Start at  14:07:03
   Duration  589ms (transform 56%, import 23%, tests 13%, worker 7%)
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
dist/index.html                                            0.60 kB │ gzip:  0.44 kB
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
dist/assets/index-DNRzcA91.css                            66.68 kB │ gzip: 19.81 kB
dist/assets/index-B-9kSOJh.js                            306.50 kB │ gzip: 93.30 kB

✓ built in 416ms
```

구현·실행: Codex (GPT-6)

## 현재 과제 리뷰 기록
- 2026-10-04 Claude Code(Claude Opus 5.5)가 HEAD `b65a28b`(구현 `a1f39dd`)를 독립 리뷰했다: **PASS, 차단 0건.** 코드는 고치지 않았다.
- 직접 실행(별도 worktree, `PYTHONPATH`=worktree `engine/src`·`server`): engine **326 passed, 2 xfailed** / server **91 passed, 1 skipped** / web **128 passed** / build 성공. 구현 기록과 테스트 수가 같다.
- 범위: `origin/main...b65a28b`의 15개 파일이 모두 허용 목록 안에 있다. 금지 파일(엔진 판정 코드·`ResultPanel` 등)은 바뀌지 않았다. `docs/semantics.md`는 줄 추가만 있고(삭제 0줄), `__init__.py`는 import 한 줄만 바뀌었다.
- 코드 검토 결과:
  - `suggest.py`의 처리 순서·한도·정규 적용 규칙(`_apply`)·넣는 줄 문법(`_raw`)이 설계 1~4절과 같다.
  - 모든 후보를 `verify`로 다시 확인하고, 원래 입력은 깊은 복사본으로만 다룬다.
  - 테스트는 `importlib.import_module("netproof_engine.suggest")`로 실제 모듈을 패치하므로 한도 상수 변경이 실제로 반영된다.
- Claude 독립 probe(저장소 밖 스크립트, 설계 2절 적용 규칙을 따로 구현):
  - 직선 토폴로지 h1–R1–R2–h2에 무작위 ACL·연결·흐름·모드를 넣고, 두 목표로 각 1,500건씩 두 번(permit 비중을 바꿔) 돌렸다. **총 6,000번 호출에서 불일치 0건.**
  - 확인한 것: 입력 불변, 응답 키, `verify` 호출 수(PASS ≤ 5, DENY ≤ 9), `insert_at` 줄 = `raw`, 삽입 줄을 빼면 원래 목록, `verify(적용본) == after`이고 결과가 목표, DENY 후보의 기준 줄이 정방향 permit 홉.
  - 경계 사례: 빈 줄·remark 뒤의 결정 줄(원래 번호 4 유지), 복귀 경로 막힘(`established` 줄), 같은 ACL을 in·out에 붙였을 때 `shared_by` 2곳, one-way ICMP 숫자 종류, 500줄 `line_limit`, 게이트웨이 없음 `not_acl_cause`, 잘못된 목표 4종 `INVALID`.
- 브라우저(임시 SQLite, localhost:4840): 예시 01 판정(막힘) → 목표를 고르기 전 계산 단추 비활성 → PASS 선택·계산 → 후보 c1 `permit tcp host 10.10.10.10 host 10.20.20.5 eq 443`, "다시 판정: PASS" → 포트를 바꾸면 "이전 결과" 표시, 목표 선택·계산·원래 줄 보기 모두 비활성. console error 0.
- 비차단 참고(이 PR에서 조치 불필요):
  - 목표 라벨 `PASS`/`DENY`와 `정방향`/`복귀 방향` 표기는 판정기 개선 설계(`codex/judge-ux` 4절)에서 통과/막힘·가는 길/돌아오는 길로 통일한다.
  - 막히게 만들기(DENY) 후보는 정방향만 본다. 설계대로이며, 복귀 방향은 1차 범위 밖이다.
- 검증 한계: PostgreSQL 실연결, 실제 장비, 여러 탭·지연 주입은 확인하지 않았다.
- 다음 차례: **사용자 최종 확인·병합 결정.** 병합 순서는 충돌이 가장 적은 #19 → #20 → judge-ux를 권한다.

리뷰: Claude (Claude Opus 5.5)

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
- **PR #18 ACL 점검 (병합 완료, c19f554)**: 정확 상자 합집합 차집합·unread 중단·열린 범위 사실·판정기만 점검. Claude 독립 리뷰 및 R1·R2 재리뷰 PASS. 전체 한도 300,000회, 최악 사례 약0.59초. 마지막 엔진294+2 xfail/서버88+1 skip/웹114/build 성공. __all__·지연주입·PG 실연결 한계 유지.
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
- [x] ACL 점검(가려진 규칙·중복·열린 범위) — ③ **PR #18 병합 완료, c19f554**
- [ ] Cisco 설정 붙여넣기 ③`access-list`/`ip access-group`
- [ ] **배포**(사람 트랙과 함께) — 4주차 테스트 전에 공개 URL

**4주차 (10-19~10-25) — 사용자 테스트 주간, 기능은 병행**
- [ ] 수정 후보 제안("무엇을 바꾸면 통하나") — ② **PR #19 구현·테스트 완료 → Claude 독립 리뷰 차례**
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

## 다음 LLM이 확인할 내용
- `git switch codex/acl-suggest`, `git pull` 후 이 문서의 리뷰 기록을 읽는다. Claude 리뷰는 PASS(차단 0건)이고 **다음 차례는 사용자 최종 확인·병합 결정**이다. 사용자 요청 없이 병합하지 않는다.
- 승인한 목표 직접 선택·삽입만·자동 적용 없음 범위를 지킨다. 기존 판정 파일·expect는 고치지 않는다. 병합은 사용자 결정이다.

설계: Claude (Claude Opus 5.5), 기록: Codex (GPT-6)
