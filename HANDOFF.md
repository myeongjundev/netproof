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
- 작업: **ACL 점검** — 가려진 규칙·중복 규칙·일치 불가 규칙을 엔진이 **정확히 계산**해 짚고, permit 줄의 열린 범위를 사실로 보여 준다 (로드맵 3주차, 순환 고리 ③)
- 사용자 승인(2026-10-03): PR #17을 `6c7c9b1`로 main 병합 완료 → 다음 과제로 진행. 설계 방식 A(정확 집합 계산)·아래 정의·API·화면 설계를 사용자가 대화에서 승인했다.
- 기반: 최신 origin/main `6c7c9b1`(**PR #17 오탐·미탐 대시보드 병합 완료**).
- 브랜치: `codex/acl-audit` (origin/main `6c7c9b1` 기반). 설계는 main이 아니라 이 브랜치에 기록한다.
- 단계: **설계 커밋 `62ec0a6` → 사용자 설계 승인(2026-10-03) → Codex 구현·테스트(다음 차례) → 리뷰 → 사용자 병합 결정.**
- 사용자 결정(2026-10-03):
  - **과도한 permit은 경고·점수 없이 "열린 범위 사실"만 표시한다.** 수업 ACL 대부분이 "특정 deny 뒤 `permit ip any any`" 모양이라 any-any 경고는 거의 모든 사례에 뜬다. 판단은 사람이 한다.
  - **보이는 곳: 판정기에서 판정 단추를 누를 때 함께.** 사례 상세에는 넣지 않는다.
  - **계산 방식: A(정확 집합 계산).** 쌍별 포함(B)·표본 패킷(C)은 쓰지 않는다.
- 보류: **Cisco 설정 붙여넣기**는 수업 ACL이 Cisco인지 확인(사람 트랙)까지 보류.
- 이 과제는 **쓰기가 없다.** 사례·DB·공유 링크를 바꾸지 않고 판정 의미도 바꾸지 않는다.

## 작업 정의
- 목표: 판정기에 입력한 **모든 ACL**을 줄마다 점검해, 가려짐·중복·일치 불가·점검 못 함을 **원인이 된 줄 번호와 함께** 보여 주고, permit 줄의 열린 범위를 적는다.
- **이것은 판정이 아니라 점검이다.** 흐름·경로·토폴로지와 상관없이 ACL 규칙만 계산한다. PASS/DENY·`comparison`·`policy`를 만들거나 바꾸지 않는다. 점검 계산은 `engine/`만 하고(ADR-001) 서버·화면은 결과를 전달·표시만 한다.
- **정확성이 이 과제의 핵심이다.** "가려진 규칙 없음"이라고 말하려면 여러 줄의 합집합이 가리는 경우(예: `/25` 두 줄이 `/24` 한 줄을 가림)까지 잡아야 한다. 계산이 한도를 넘거나 해석 못 한 줄 때문에 결론을 낼 수 없으면 **추측하지 않고 "점검 못 함"**으로 둔다.

### 1) 점검 대상 패킷 공간
`verify`가 만들 수 있는 패킷과 같다(`docs/semantics.md` 1·2·6절).

| 프로토콜 | 차원 |
|---|---|
| `tcp` | 출발지 IP(32비트 전체) · 목적지 IP · 출발지 포트 1~65535 · 목적지 포트 1~65535 · ACK {0,1} |
| `udp` | 출발지 IP · 목적지 IP · 출발지 포트 1~65535 · 목적지 포트 1~65535 |
| `icmp` | 출발지 IP · 목적지 IP · ICMP 종류 0~255 |

- 규칙 한 줄 = 상자(각 차원의 구간 곱)의 합집합.
  - `ip`는 세 프로토콜 모두. `tcp`·`udp`·`icmp`는 그 프로토콜만.
  - 주소는 `Rule.src`·`Rule.dst` 네트워크의 [네트워크 주소, 브로드캐스트 주소] 구간.
  - 포트: `eq p` → [p,p], `neq p` → [1,p-1] ∪ [p+1,65535], `lt p` → [1,p-1], `gt p` → [p+1,65535], `range a b` → [a,b]. 모두 1~65535와 교차한다. 포트 조건이 없으면 1~65535.
  - `established` → ACK=1만. 없으면 ACK {0,1}.
  - ICMP 종류가 있으면 [t,t] ∩ [0,255], 없으면 0~255.
- 이 정의는 `Rule.matches`와 같은 뜻이어야 한다. **엔진의 `acl.py`·`Rule.matches`는 고치지 않고 읽기만 한다.** 같은 뜻인지는 아래 교차 확인 테스트로 못 박는다.

### 2) 줄 분류 (한 줄에 `finding`은 최대 하나)
줄 i의 상자 집합을 R_i라 한다.

1. **먼저 잡힘 계산**: 남은 = R_i. 앞 줄 j = 1…i-1을 차례로 보며 `남은 ∩ R_j`가 비어 있지 않으면 j를 `by`에 넣고 `남은 -= R_j`. 끝난 뒤의 `남은`이 F_i(이 줄이 실제로 처음 잡는 패킷)다. 이렇게 모은 `by`는 **R_i의 패킷을 실제로 먼저 잡는 줄**만 담는다.
2. R_i가 처음부터 비었으면 → **`never_matches`**(일치 불가). `by`는 빈 목록.
3. F_i가 비었으면(전부 먼저 잡힘):
   - `by` 중 이 줄과 **동작이 반대인 줄이 하나라도 있으면** → **`shadowed`**(가려짐). 이 줄의 동작은 어떤 패킷에도 적용되지 않는다.
   - 모두 같은 동작이면 → **`redundant_earlier`**(중복·앞 줄).
4. F_i가 비지 않았으면 **뒤 줄로 흘려 본다**: 남은 = F_i, `by` = 빈 목록. 뒤 줄 k = i+1…를 차례로 보며 `남은 ∩ R_k`가 비지 않았을 때
   - k의 동작이 이 줄과 반대면 → 지우면 결과가 바뀐다. **`finding` 없음**(멈춤).
   - 같으면 k를 `by`에 넣고 `남은 -= R_k`.
   - 끝까지 갔을 때 `남은`이 비었으면 → **`redundant_later`**(중복·뒤 줄).
   - `남은`이 남았으면 암묵적 deny가 받는다. 이 줄이 `deny`면 → **`redundant_later`** + `implicit_deny: true`, `permit`이면 → `finding` 없음.
5. **결론을 낼 수 없으면** → **`undetermined`**(점검 못 함) + `undetermined_reason`:
   - `"limit"` — 계산 한도 초과(아래 4절).
   - `"unread_below"` — 4단계에서 `남은`이 비지 않은 채 해석 못 한 줄에 닿았다.
- **해석 못 한 줄(`UnreadLine`)**: 엔진 `evaluate`처럼 거기서 멈춘다. 그 줄은 `kind: "unread"`, 그 뒤의 규칙 줄은 `kind: "unchecked"`이고 둘 다 `finding: null`이다. 그 ACL의 `unchecked_from`에 그 줄 번호를 적는다(없으면 `null`). 그 앞 줄은 정상 점검한다(1~3단계는 앞 줄만 보므로 영향이 없다).
- `remark` 줄은 `kind: "remark"`, `finding: null`. 빈 줄은 목록에 넣지 않는다.
- **줄 번호(`line`)는 엔진 `Rule.line`과 같은 기준**(보낸 목록의 1부터 센 위치, 빈 줄도 센다)이다. 그래야 기존 "ACL 근거"·"입력에서 보기"와 번호가 맞는다.
- 주의: 지운다고 결과가 같다는 것은 **이 ACL의 판정**에 대한 사실이다. 맨 끝에 일부러 쓴 `deny ip any any`(로그용 관습)도 암묵적 deny 때문에 `redundant_later`로 나온다. 정의대로 맞는 사실이고, 화면 문구가 "지워도 결과가 같습니다"로 사실만 말한다.

### 3) 열린 범위 (permit 줄만, `finding`과 별개)
- `open`: 아래 값 중 해당하는 것을 이 순서로 담는다. deny 줄은 빈 목록.
  - `"src"` — 출발지가 `any`(0.0.0.0/0)
  - `"dst"` — 목적지가 `any`
  - `"proto"` — 프로토콜이 `ip`(모든 프로토콜)
  - `"dst_port"` — `tcp`·`udp` 줄인데 목적지 포트 조건이 없음
  - `"icmp_type"` — `icmp` 줄인데 종류가 없음
- `catch_all`: `permit ip any any`(옵션은 무시되는 `log`만)일 때 `true`. 화면 이름 "나머지 전부 허용". 위치와 상관없이 붙인다(그 뒤 줄들은 2절대로 가려짐·중복이 된다).
- **경고·점수·순위를 만들지 않는다**(사용자 결정). 출발지 포트가 열린 것은 정상이므로 적지 않는다.

### 4) 엔진: `engine/src/netproof_engine/audit.py` (신규)
- `acl_audit(network_data) -> dict`. 어떤 입력에도 예외 대신 사전을 돌려준다.
  - `acls`만 읽는다. 형태 검사는 기존 `model._check_shape`를 재사용하고 `Invalid`면 `status: "INVALID"`·`problems`. **`load()`를 부르지 않는다** — 게이트웨이·IP 중복 같은 토폴로지 오류가 ACL 점검을 막지 않게 한다.
  - 해석은 기존 `parse_acl`을 그대로 쓴다. ACL 순서는 입력 순서.
- 계산 한도(모듈 상수, 테스트에서 작게 바꿀 수 있게):
  - 한 줄 계산 중 상자 수 **2,000개** 초과 → 그 줄 `undetermined`(`"limit"`), 다음 줄은 계속 점검.
  - 요청 전체의 상자 교차 연산 수 상한(값은 Codex가 아래 측정으로 정한다) 초과 → 그 줄과 **남은 모든 줄** `undetermined`(`"limit"`).
  - 측정: 500줄 합성 최악 사례(겹치는 접두사·`neq` 포트 혼합)의 `perf_counter` 시간을 `docs/semantics.md` 11절에 적는다. 목표는 2초 이하. `policy-matrix.md`의 측정처럼 "모든 구성의 상한 보장 아님"을 함께 적는다.
- 응답:

```json
{"status": "OK", "problems": [], "engine_version": "…",
 "acls": [{"name": "101", "unchecked_from": null,
   "lines": [{"line": 3, "raw": "access-list 101 deny tcp any any eq 443", "kind": "rule",
              "action": "deny", "finding": "shadowed", "by": [1, 2], "implicit_deny": false,
              "undetermined_reason": null, "open": [], "catch_all": false}]}],
 "totals": {"shadowed": 0, "redundant_earlier": 0, "redundant_later": 0, "never_matches": 0, "undetermined": 0}}
```

  - `kind`: `rule` · `remark` · `unread` · `unchecked`. `action`은 `rule`만(`permit`/`deny`), 나머지는 `null`.
  - `by`는 오름차순 줄 번호. `implicit_deny`는 `redundant_later`에서만 `true`가 될 수 있다.
  - `totals`는 모든 ACL의 `finding` 개수 합. 다섯 키를 항상 담는다.
  - `status: "INVALID"`일 때 `acls`는 빈 목록, `totals`는 모두 0.
- **고치지 않는 것**: `acl.py`·`model.py`·`trace.py`·`verify.py`·`matrix.py`·`observe.py`·`__version__`. `__init__.py`에는 `acl_audit` 내보내기 한 줄만 더한다.

### 5) 서버: `POST /api/acl-audit` (`server/netproof_api/cases.py`)
- `/api/verify`·`/api/policy-matrix`와 같은 모양: 로그인 없이 사용, 기존 CSRF·X-NetProof 검사 그대로, 기존 `_limit_problem`(ACL 500줄·장비 수 등)과 64KB 요청 상한 → 422.
- 본문 `{"network": {...}}`. 엔진 응답을 그대로 HTTP 200으로 돌려준다(`INVALID`도 200 — policy-matrix 관례).
- DB 접근·저장 없음. 다른 엔드포인트는 고치지 않는다.

### 6) 화면: 판정기만 (`web/src/pages/JudgePage.tsx`)
- `judge()`에서 `api.verify`와 **`api.aclAudit`를 함께**(`Promise.allSettled`) 부른다. 점검이 실패해도 판정은 보이고, 점검은 자기 자리에 오류를 따로 보인다. 기존 `revision` 가드로 늦게 온 응답은 버린다. 입력이 바뀌면 판정과 같은 방식으로 "이전 결과"임을 표시하고 "입력에서 보기"를 막는다.
- ACL이 하나도 없으면 점검을 부르지 않고 섹션도 숨긴다.
- `ResultPanel` 바로 뒤에 **"ACL 점검" 섹션**(`web/src/components/AclAudit.tsx` 신규). `ResultPanel`은 사례 상세·매트릭스도 쓰므로 **고치지 않는다.**
  - 섹션 머리 고정 문구: **"이 점검은 판정이 아닙니다. 흐름·경로와 상관없이 ACL 규칙만 계산합니다."**
  - ACL마다 요약 한 줄: `가려짐 n · 중복 n · 일치 불가 n · 점검 못 함 n` (점검 못 함 = `undetermined` + `unread` + `unchecked` 줄 수).
  - 문제 있는 줄만 나열하고, 문제 없는 줄은 "문제를 찾지 못한 줄 n개"로 센다. 줄 문구:
    - `shadowed`: "N번 줄 · 가려짐 — {by}번 줄이 먼저 잡고, 그중 동작이 반대인 줄이 있어 이 줄의 {permit/deny}는 적용되지 않습니다."
    - `redundant_earlier`: "N번 줄 · 중복 — {by}번 줄이 같은 동작으로 먼저 잡습니다. 지워도 결과가 같습니다."
    - `redundant_later`: "N번 줄 · 중복 — 지워도 {by}번 줄{·암묵적 deny}이(가) 같은 동작을 합니다."
    - `never_matches`: "N번 줄 · 일치 불가 — 이 줄에 맞는 패킷이 없습니다(포트 1~65535, ICMP 종류 0~255 기준)."
    - `undetermined`: "N번 줄 · 점검 못 함 — 계산 한도를 넘었습니다." / "— 아래 해석하지 못한 줄 때문에 판단할 수 없습니다."
    - `unread`부터: "N번 줄부터 점검하지 않았습니다 — 해석하지 못한 줄이 있습니다."
  - permit 줄의 열린 범위는 문제 줄과 따로 한 줄씩: "N번 줄 · 열린 범위: 출발지 전체 · 목적지 전체 · 모든 프로토콜 · 모든 목적지 포트 · 모든 ICMP 종류"(해당 항목만). `catch_all`이면 "N번 줄 · 나머지 전부 허용".
  - 각 줄에 기존 `showAcl(name, line)`을 쓰는 "입력에서 보기" 단추.
- 새 순수 모듈 `web/src/aclAudit.ts`: 응답 → 화면 줄(문구·요약 수) 변환을 **여기 한 곳에서만** 한다. 분류를 다시 계산하지 않는다.
- `web/src/api.ts`에 `aclAudit(network)` 한 줄, `web/src/types.ts`에 `AclAudit` 타입만 더한다. 기존 타입은 바꾸지 않는다.
- 사례 상세·공유 링크·저장 데이터·매트릭스 화면에는 넣지 않는다.

### 7) 범위 밖 · 허용 파일
- 허용 파일: `engine/src/netproof_engine/{audit.py(신규),__init__.py(내보내기 한 줄)}`, `engine/tests/test_acl_audit.py`(신규), `server/netproof_api/cases.py`, `server/tests/test_acl_audit.py`(신규), `web/src/{aclAudit.ts,aclAudit.test.ts}`(신규), `web/src/components/AclAudit.tsx`(신규), `web/src/{api.ts,types.ts,styles.css}`, `web/src/pages/JudgePage.tsx`, `docs/semantics.md`(11절 추가만), `HANDOFF.md`, `decisions/ai-work-log.md`.
- 제외: 엔진 판정 코드 전부(`acl.py`·`model.py`·`trace.py`·`verify.py`·`matrix.py`·`observe.py`·`__version__`), `server/netproof_api/{models.py,auth.py,__init__.py}`, DB 열·마이그레이션, `ResultPanel`·`AclEvidence`·`CaseDetailPage`·`PolicyMatrixPage`·`DashboardPage`·`CasesPage`, `share.ts`·`draft.ts`·`practice.ts`, 기존 `expect`·`cases/*.json`, 새 의존성, 앱 안 LLM 호출, 배포·병합.
- **하지 않는 것**: 토폴로지 기반 점검(없는 서브넷을 가리키는 줄, 어디에도 붙지 않은 ACL), 수정 후보 자동 제안(4주차 과제), 과도함 경고·점수, 사례 상세 표시, Cisco 붙여넣기, 판정 변경.
- 위험:
  - **엔진과 다른 뜻으로 상자를 만듦**(예: `neq`·`established`·`ip` 처리) → 점검이 엔진 판정과 어긋난다 → 아래 교차 확인 테스트.
  - **쌍별 포함으로 단순화** → 합집합 가림을 놓쳐 "가려짐 없음"이 거짓이 된다 → `/25` 두 줄 테스트.
  - **해석 못 한 줄을 건너뛰고 계속 점검** → 엔진은 거기서 멈추므로 뒤 줄 결론이 틀린다 → `unread`·`unchecked`·`unread_below` 테스트.
  - **상자 폭증** → 500줄에서 응답이 멈춤 → 한도·`undetermined`·측정 기록.
  - **"문제 없음"을 안전으로 오해** → 고정 문구로 판정이 아님을 밝히고, 열린 범위는 사실만 적는다.
- 완료 조건: 아래 네 명령을 **직접 실행**하고 출력을 붙인다.
  - `cd engine && ../.venv/Scripts/python -m pytest -q`
  - `cd server && ../.venv/Scripts/python -m pytest -q`
  - `npm --prefix web test`
  - `npm --prefix web run build`
  - 엔진 테스트(`test_acl_audit.py`):
    - `/25` 두 줄이 `/24` 한 줄을 가림(반대 동작 → `shadowed`, `by`에 두 줄), 같은 동작이면 `redundant_earlier`.
    - 앞 줄과 일부만 겹치는 줄은 `finding` 없음.
    - 끝의 `deny ip any any` → `redundant_later` + `implicit_deny`. 끝의 `permit` 뒤에 아무것도 없으면 `finding` 없음.
    - 뒤에 같은 동작 줄이 덮으면 `redundant_later`(`by`에 그 줄), 사이에 반대 동작 줄이 끼면 `finding` 없음.
    - `lt 1`·`gt 65535`·ICMP 종류 300 → `never_matches`.
    - `neq` 포트, `established`(ACK)와 non-established 구분, `ip` 줄이 tcp·udp·icmp 줄을 가림.
    - 해석 못 한 줄: 그 줄 `unread`, 뒤 줄 `unchecked`, `unchecked_from` 값, 앞 줄의 `unread_below`.
    - 한도를 작게 바꿔 `undetermined`(`"limit"`)와 남은 줄 처리.
    - `remark`·빈 줄이 섞여도 `line`이 `Rule.line`과 같음. `open`·`catch_all` 값.
    - 형태 오류 → `INVALID`, 토폴로지 오류(게이트웨이 밖 등)는 점검을 막지 않음.
  - **엔진 교차 확인(정확성)**: Hypothesis로 작은 ACL(1~5줄, 좁은 주소 풀·작은 포트 집합, 모든 포트 조건·`established`·ICMP 종류 포함)을 만들고, 모든 규칙 경계값과 그 ±1, 차원 양 끝을 조합한 패킷을 **전수**로 만든다(구간 경계 사이는 결과가 같으므로 이것으로 모든 경우를 덮는다). 해석 못 한 줄 없이·한도 충분히 크게 두고:
    - `finding`이 네 종류 중 하나인 줄은, 그 줄을 지운 `Acl`의 `evaluate` 동작이 모든 패킷에서 원래와 같다.
    - `finding`이 없는 규칙 줄은, 지웠을 때 동작이 바뀌는 패킷이 적어도 하나 있다.
    - `never_matches`·`shadowed`·`redundant_earlier` 줄은 원래 `Acl`에서 어떤 패킷에도 결정 규칙으로 나오지 않는다.
    - 엔진 전체 테스트 시간이 지금보다 10초 넘게 늘지 않도록 예제 수를 조정하고 고정 시드 회귀 1개를 둔다.
  - 서버 테스트: 정상 200·응답 키, `INVALID` 200, ACL 501줄 422, 로그인 없이 사용 가능, 다른 엔드포인트 회귀.
  - 웹 테스트(`aclAudit.test.ts`): 다섯 `finding`·`unread`·`catch_all`·`open` 문구, 요약 수(점검 못 함 합산), `by`·암묵적 deny 표기, 빈 ACL 목록이면 아무 줄도 만들지 않음.
  - 브라우저(**375×812와 1280**): 예시 사례에 가려진 줄을 하나 넣고 판정 → "ACL 점검" 섹션·고정 문구·가려짐 줄·"입력에서 보기"가 해당 줄을 선택 → 입력을 고치면 이전 결과 표시 → ACL을 모두 지우면 섹션 숨김 → 흐름이 `INVALID`여도 점검은 보임. 본문 가로 넘침 없음(body scrollWidth ≤ 화면 폭), console error 0.
  - `docs/semantics.md`에 **11절 "ACL 점검"** 추가: 패킷 공간 / 다섯 `finding`의 정의와 우선 순서 / 해석 못 한 줄에서 멈춤 / 열린 범위는 사실 표시 / 판정이 아니라는 점 / 계산 한도와 측정값. **1~10절은 바꾸지 않는다.**

## 완료 내용 / 테스트 결과
- (Codex 구현 후 채운다.)

## 현재 과제 리뷰 기록
- (리뷰 후 채운다.)

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
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
- [ ] ACL 점검(가려진 규칙·중복·열린 범위) — ③ **설계 승인 완료 → Codex 구현 차례 — 브랜치 codex/acl-audit**
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
- [ ] 로그인 실패 → Graylog(GELF, 로컬 시연용) — 운영
- [ ] Batfish 차등 테스트 — ④

**6주차 (11-02~11-08)**: 버그 수정만, 2차 테스트, 발표·제출

**사람 트랙 (동시에, LLM에 넘기지 않음)**
- [ ] 동기 3명 인터뷰 · [ ] 실제 결과가 있는 사례 모으기(붙여넣기 기능의 재료) · [ ] 사례 04 손계산
- [ ] **수업 ACL이 Cisco인지 pfSense인지 확인(Cisco 과제의 선행 조건)** · [x] **오탐·미탐 양성 정의: 통신 차단(DENY)** · [ ] 표어 결정
- [ ] 배포(Vercel·Supabase 가입, 비밀값) · [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

**위험**: 4주차 전에 ①~⑤의 핵심(하이라이트·목록 필터·정책 검증·오탐/미탐·실제 결과 붙여넣기)이 끝나지 않으면 사용자 테스트가 흔들린다. 밀리면 4·5주차 항목부터 미룬다.

## 다음 LLM이 확인할 내용
- `git pull`, `git switch codex/acl-audit`, `git log -3` 후 이 문서의 작업 정의를 읽는다. 설계는 사용자 승인 완료(2026-10-03)이고 **다음 차례는 Codex 구현**이다. 이미 있는 `codex/acl-audit` 브랜치에서 작업한다(새 브랜치를 만들지 않는다).
- Codex: 구현 전에 `engine/src/netproof_engine/acl.py`(`Rule.matches`·`PortMatch.matches`·`parse_acl`·`UnreadLine`·`Acl.evaluate` — **읽기만 한다**), `engine/src/netproof_engine/model.py`(`_check_shape`), `engine/src/netproof_engine/matrix.py`(새 엔진 API 경계의 오류 처리 관례), `server/netproof_api/cases.py`(`verify_endpoint`·`matrix_endpoint`·`_limit_problem`), `web/src/pages/JudgePage.tsx`(`judge`·`revision`·`showAcl`), `web/src/components/AclEvidence.tsx`(줄 번호 기준)를 읽는다.
- 다섯 `finding`의 정의·우선 순서, 패킷 공간, 해석 못 한 줄에서 멈추는 규칙, "열린 범위는 사실만"을 바꾸고 싶으면 **먼저 요청한다.** 점검의 뜻이 바뀌는 변경이다.
- 교차 확인 테스트가 실패하면 **점검 구현 쪽 버그다.** 테스트를 맞추려고 엔진 `acl.py`를 고치지 않는다.

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
- PR #15·#16·#17 후속(위 이전 과제 기록)은 이번 범위가 아니다.
- [HOME_HANDOFF.md](HOME_HANDOFF.md)는 2026-10-02 집 인계 시점 기록이다. 현재 상태는 이 문서가 기준이다.

설계: Claude (Claude Opus 5.5)
