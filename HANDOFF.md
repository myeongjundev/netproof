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

## 이번 작업 운영 메모
- 이번 작업: Claude Opus 설계 → Codex 구현·테스트 → Claude 독립 리뷰 → 사용자 병합 결정.
- 구현 모델은 사용자 지정 **Astra medium**. 실행 중인 세부 모델 설정은 이 세션에서 독립 확인하지 못했으므로 지정값과 확인된 사실을 구분한다.
- `codex/` 별도 브랜치·Git worktree만 사용. main 수정·푸시·병합, 강제 푸시 금지.
- 현재 worktree는 Git CLI로 생성했다. Orca 관리 작업 트리 등록 여부는 확인하지 않았다.
- 모델 간 동의가 아니라 검토 SHA, 실행 명령·출력, diff가 근거다.
- 사례 정답·실제 장비 결과·최종 병합은 사람이 결정한다. 비밀값을 공개 저장소에 넣지 않는다.

## 현재 작업 상태
- 브랜치: `codex/contract-fuzz`
- 기반: PR #11 `codex/int-digit-limit`, `36ad012740bd0d7b5cbea17d39403449b67b12c2`.
- PR #10·#11은 2026-10-01 재확인 결과 OPEN, mergedAt=null. 병합하지 않았다.
- PR #11의 이슈 #9 구현 SHA `52a91cb720ff91ffc80edf3685868884ee2db142`는 Claude 독립 리뷰 PASS. 이 후속 작업은 테스트만 추가한다.
- 다음 차례: **사용자 최종 확인·병합 결정** — PROMPTS.md 5번. Claude 재리뷰 PASS, 검토 SHA `051c5899a9c4668bc9101ab64c600c8981607cc8`. PR base는 `codex/int-digit-limit`이며 #11 병합 전 main에 바로 병합하지 않는다.

## 작업 정의 — 고정 시드 생성 회귀 테스트(경로별 80개, Claude 재리뷰 반영)
- 목표: 유효한 합성 네트워크에서 숫자 변환 네 자리(순번·포트·ACL ICMP·flow ICMP)의 단일 문자열 토큰을 변형하고 `verify()`가 경로별 허용 결과를 반환하는지 검사한다.
- 허용 파일: `engine/tests/test_verify_contract.py`, `HANDOFF.md`, `decisions/ai-work-log.md`.
- 엔진·서버·웹·의존성·cases 기대값·판정 의미는 변경하지 않는다. CI 구현도 이번 범위 밖이다.
- 새 테스트는 `verify`만 import하며 과거 엔진에도 그대로 실행한다. 네트워크/flow 사전은 매 예제 새로 만든다.
- 각 경로마다 명시 예제 `①`, `²`, `"9" * 5000`을 실행한다. pytest 경로 매개변수화로 12개를 고정한다.
- 생성기: 0..4294967295 십진 문자열, 이름/0 채운 토큰, Z·C 범주를 제외한 유니코드 문자열(1..12자), Nd·No 문자열(1..12자), 10·11·4300·4301·5000자리 숫자.
- `max_examples=80` **각 경로별**, `derandomize=True`, `deadline=None` 유지. 동일 테스트·Hypothesis 버전/환경에서는 같은 80개 샘플을 반복하는 고정 시드 생성 회귀 테스트이며, 실행마다 새 입력을 탐색하는 상시 퍼징이 아니다. 테스트나 Hypothesis 버전이 바뀌면 샘플도 달라질 수 있다.
- 경로별 허용 집합: sequence `{DENY, UNSUPPORTED}`, port·acl_icmp `{PASS, DENY, UNSUPPORTED}`, flow_icmp `{PASS, INVALID}`. 집합 밖 결과가 나오면 집합을 넓히지 않고 입력·결과를 PR에 보고한다.
- port ACL 뒤에 `permit ip any any`를 둔다. 별도 명시 예제 `443`·`0000000443` → DENY, `80`·`www` → PASS를 직접 단언하며 엔진의 숫자 해석을 테스트에서 재구현하지 않는다.
- 기존 `test_unicode_digits.py`와 같은 네 경로를 과거 엔진 실행을 위해 분리했다. 기존 극단값 외 새 생성 커버리지는 무작위 텍스트 생성기(결정적 샘플)다.
- `str.split()` 한 토큰임을 단언한다. 주소·라우팅·인터페이스·공백 포함 문법·비문자열 타입을 생성하지 않는다. **임의 입력 전체에 대한 계약 증명이 아니다.**
- `try/except`, `assume`, `filter`로 예외를 숨기지 않는다.
- 두 기존 별도 버그는 정확한 예외 타입의 `xfail(strict=True, raises=...)`로 고정한다. 고쳐지면 XPASS가 실패하므로 표시를 제거해야 한다.
- 새로운 원인 발견 시 엔진을 임의 수정하거나 생성 범위를 좁히지 말고 입력·트레이스백을 기록하고 범위를 협의한다.

## 완료 조건과 직접 실행 결과 — 재리뷰 7건 반영 (2026-10-01, Codex)
PowerShell 기준. Python 3.12.10, Hypothesis 6.168.3. 기존 .venv와 의존성 설정은 바꾸지 않았다.
시작 전 `git pull --ff-only` → Already up to date, status clean, log -3 확인 후 기준선도 직접 실행했다: 엔진 154+2 xfail(1.31s), 서버 44+1 skip(7.51s), 웹 65(333ms).

| 명령 | 실제 출력 |
|---|---|
| `cd engine; ../.venv/Scripts/python -m pytest -q tests/test_verify_contract.py -rxX` | `8 passed, 2 xfailed in 0.68s` (permit 원복 후) |
| `cd engine; ../.venv/Scripts/python -m pytest -q` | `158 passed, 2 xfailed in 1.15s` |
| `cd server; ../.venv/Scripts/python -m pytest -q` | `44 passed, 1 skipped in 7.29s` |
| `npm --prefix web test` | `Test Files 5 passed (5)`, `Tests 65 passed (65)`, `Duration 315ms` |

현재 엔진에서 경로별 허용 집합 밖 결과는 없었다. 기존 10/11자리·ASCII·유니코드·5,000자리 회귀도 엔진 전체에 포함된다.

### port 판별력과 xfail 원인 직접 확인
- `cd engine; ../.venv/Scripts/python -m pytest -q tests/test_verify_contract.py -k port_token_verdict -v` → `4 passed, 6 deselected in 0.33s`.
- port ACL에서 뒤의 permit만 잠시 제거하고 `... -k port_token_verdict --tb=short` → `2 failed, 2 passed, 6 deselected in 0.39s`, exit 1. 실패 이름은 `[80-PASS]`·`[www-PASS]`, 둘 다 `AssertionError: assert 'DENY' == 'PASS'`. 숫자 판독을 다시 구현하지 않고 암묵적 deny 결함을 잡는다.
- 확인 후 permit을 복원했다. 새 파일 전체 재실행은 위와 같이 통과.
- 루트에서 `.venv/Scripts/python -c "import runpy; m=runpy.run_path('engine/tests/test_verify_contract.py'); m['test_known_malformed_host_contract']()"` → exit 1, `ipaddress.AddressValueError: Expected 4 octets in 'x'`. pytest xfail을 거치지 않은 실제 예외다. `strict=True`와 정확한 `raises`는 유지했다.

### 과거 버전 실패 검증
저장소 밖 `$env:TEMP/netproof-contract-history-20261001/<sha>`에 다음처럼 각 버전 엔진을 추출하고 새 테스트 파일만 복사했다.

```powershell
git archive --format=zip --output=<archive.zip> <sha> engine
Expand-Archive -LiteralPath <archive.zip> -DestinationPath <historical-root>
Copy-Item engine/tests/test_verify_contract.py <historical-root>/engine/tests/
# 추출된 engine 폴더에서, python은 현재 worktree .venv의 절대 경로:
$env:PYTHONPATH = "$PWD/src"
& <python> -c "import sys, netproof_engine as e; print(e.__file__, e.__version__, sys.get_int_max_str_digits())"
& <python> -m pytest -q tests/test_verify_contract.py --tb=line -rN
```

- `8c7ee3502d70da14f38c913ba4f4659b64ba7fea`: 추출 디렉터리의 `__init__.py`, 버전 `0.1.2`, 변환 한도 `4300` 확인. `4 failed, 4 passed, 2 xfailed in 0.43s`, 네 경로의 `ValueError: invalid literal for int()`. 터미널 유니코드 깨짐을 피하려고 `runpy.run_path('tests/test_verify_contract.py')`로 `_input`을 읽고 `verify(*_input(path, token))`을 별도 실행했다. `ascii(token)` 출력 `\u2460`·`\xb2` 각각 네 경로 모두 ValueError(8건). 같은 명시 입력은 a716341에서 ACL 세 경로 UNSUPPORTED, flow ICMP INVALID(8건)였다.
- `a716341922097cfa55a85b53772691823c1d6892`: 추출 디렉터리의 `__init__.py`, 버전 `0.1.3`, 한도 `4300` 확인. `4 failed, 4 passed, 2 xfailed in 0.38s`, 네 경로 모두 `ValueError: Exceeds the limit (4300 digits) ... value has 5000 digits`.
- 두 과거 버전 모두 pytest exit 1, 새 port 예제 4개는 통과했다. 네 경로 실패 원인은 새 단언이 아니라 변환 지점의 ValueError다.
- 실패는 의도한 과거 버그 검출이다. 현재 엔진 결과와 혼동하지 않는다. 변환 한도는 변경하지 않았다.
- 현재 버전에서 `_input` 정상 도달성도 별도로 실행: sequence `10` → DENY, port `443` → DENY, ACL ICMP `8` → PASS, flow ICMP `8` → PASS. 네트워크 자체가 INVALID여서 숫자 파싱을 건너뛰는 테스트가 아님을 확인했다.

## 별도 버그 / 범위 경계
- Hypothesis 하한 후속: `characters(categories=..., exclude_categories=...)`는 **6.85.0 (2023-09-16)**부터다. [공식 변경 기록](https://hypothesis.readthedocs.io/en/latest/changelog.html#v6-85-0)과 공식 Git 태그 6.84.3/6.85.0의 `hypothesis-python/src/hypothesis/strategies/_internal/core.py` 함수 시그니처를 직접 비교했다. 6.84.3에는 옛 whitelist/blacklist 이름만, 6.85.0에는 새 인자가 있다. 현재 `hypothesis>=6` 선언은 이 사용 하한을 보장하지 않는다. 후속 의존성 과제에서 최소 버전/호환 인자를 결정해야 하며 이번에는 pyproject나 설치 버전을 바꾸지 않았다.
- ACL `deny tcp host x any` → `ipaddress.AddressValueError`. 이슈 #9와 별도. 이번에는 strict xfail로 재현만 기록한다.
- flow `icmp=["8"]` → `TypeError`. 숫자 문자열 계약 밖의 기존 별도 버그. strict xfail로 기록하며 수정하지 않는다.
- 트랙 B(Cloudflare·Graylog·Wazuh·n8n·Kali)는 미구현. A의 PASS/DENY는 실제 차단·탐지 증거가 아니다.
- B 설계 전 필요한 첫 사례 자료: 허가된 대상/범위, 질문과 기대 제어, 실제 실행 명령·요청, 시각/시간대, 사용한 제품·설정, 각 제품의 익명화 로그/이벤트 ID 및 n8n 실행 기록(해당 시), 실제 결과 확인자. 비밀값·세션·원본 민감 로그는 제공/커밋하지 않는다.

## 이전 독립 리뷰 (83bf48c에 한정, 이번 수정은 재리뷰 대기)
- 리뷰어: Claude Code, **Claude Opus 5.5** (`claude-opus-5-5`). Codex가 보고서를 전달하며 Claude가 직접 테스트를 실행했다.
- 최초 SHA `1caed898f3d13f3da7c94ce261aefdb1b4125407`: 경미 수정요청 1건. 새 테스트 52·54행의 `check="oneway"`는 무시되는 키라 실제로 session 모드였다. `mode="one-way"`로 수정했다. 엔진은 변경하지 않았다.
- 최종 SHA `83bf48c661b75d3ab9c760e1714b550080da24eb`, base `36ad012740bd0d7b5cbea17d39403449b67b12c2`: **PASS**, 미해결 차단 finding 없음.
- `git diff --check 36ad012 HEAD` → 출력 없음, exit 0. 허용 세 파일만 변경, engine/src·server·web·cases·docs 변경 0.
- `cd engine && ../.venv/Scripts/python -m pytest -q` → `154 passed, 2 xfailed in 1.16s`.
- `cd engine && ../.venv/Scripts/python -m pytest -q tests/test_verify_contract.py -rxX` → `4 passed, 2 xfailed in 0.68s`.
- `cd server && ../.venv/Scripts/python -m pytest -q` → `44 passed, 1 skipped in 12.46s`.
- `npm --prefix web test` → `Test Files 5 passed (5)`, `Tests 65 passed (65)`.
- 과거 폴더의 새 테스트 파일을 검토 SHA와 `cmp` 비교: identical. 소스도 `git archive <sha> engine/src`와 `diff -r -x __pycache__` 비교: 차이 없음.
- 과거 engine cwd, `PYTHONPATH=$PWD/src`, 현재 .venv python 절대 경로로 `-m pytest -q -p no:cacheprovider tests/test_verify_contract.py --tb=line -rxX`: 8c7ee35 `4 failed, 2 xfailed in 0.37s`(네 경로 ² ValueError), a716341 `4 failed, 2 xfailed in 0.36s`(네 경로 5,000자리 ValueError). 로드 경로/버전/4300 한도도 독립 확인.
- `runpy`로 새 테스트 `_input`을 불러 probe: flow ICMP `0` one-way → PASS, mode 제거(session) → UNSUPPORTED. 수정 의도대로 실행됨.
- 범위 밖 참고: ICMP 타입 `4294967295`의 one-way 흐름도 PASS다. 기존 엔진의 0..255 범위 검사 부재로, 이번 반환값 계약 테스트와 별개다. 판정 의미를 바꾸지 않고 후속 검토 항목으로 남긴다.
- 당시 77ab1fe는 문서만 추가한 커밋이었다. 이후 Claude 재리뷰 7건으로 이번 테스트·문서 수정이 발생했으므로 위 PASS는 이번 변경을 승인하지 않는다.

## 리뷰 기록
대상: [Claude 재리뷰 5932377922](https://github.com/myeongjundev/netproof/pull/12#issuecomment-5932377922), 검토 당시 SHA `77ab1fecf2dba4feff5c19f1b6122d3a9c9e6195`. 아래 상태는 Codex 반영 결과이며, Claude가 `051c589`에서 재확인했다(아래 "Claude 재리뷰").

| # | 파일 / 문제 | 처리 및 재현 근거 | 상태 |
|---|---|---|---|
| 1 | HANDOFF 상시 규칙 삭제 | base의 운영 채널·구분·PROMPTS·사람 업무·검증 원칙·시작 점검·줄바꿈 경고 복원, 이번 작업 메모 분리 | 고침, Claude 확인 |
| 2 | test_verify_contract.py port 판별력 | permit 추가, 4개 명시 예제 통과; permit 제거 시 80/www만 AssertionError | 고침, Claude 변형 검증 확인 |
| 3 | 경로 무관 RESULTS | PATH_RESULTS 적용, 현재 집합 밖 결과 없음; 과거 네 경로는 ValueError | 고침 |
| 4 | _input 중복 설명 | 함수 위 한 줄로 기존 helper와 같은 구성·분리 이유·텍스트 생성 커버리지 명시 | 고침 |
| 5 | xfail 입력 복잡 | deny tcp host x any로 축소; 직접 호출 AddressValueError, strict/raises 유지 | 고침 |
| 6 | Hypothesis 하한 | 6.85.0 도입을 공식 기록·태그 시그니처로 확인, 별도 후속 기록; 의존성 변경 없음 | 기록 완료 |
| 7 | 상시 퍼징 표현 | 고정 시드 생성 회귀 테스트(경로별 80개)로 문서·작업 기록·PR 설명 정정, 설정 유지 | 고침 |
### Claude 재리뷰 (2026-10-02, Claude Opus 5.5) — 검토 SHA `051c5899a9c4668bc9101ab64c600c8981607cc8`: **PASS**
- 엔진 로드 경로: worktree `engine/src/netproof_engine/__init__.py`, 0.1.4.
- `cd engine && PYTHONPATH=$PWD/src ../.venv/Scripts/python -m pytest -q -p no:cacheprovider tests/test_verify_contract.py -rxX` → `8 passed, 2 xfailed in 1.13s`
- `cd engine && ... -m pytest -q -p no:cacheprovider` → `158 passed, 2 xfailed in 1.21s`
- `cd server && ../.venv/Scripts/python -m pytest -q -p no:cacheprovider` → `44 passed, 1 skipped in 7.10s`
- `npm --prefix web test` → `Test Files 5 passed (5)`, `Tests 65 passed (65)`
- `git diff --check origin/codex/int-digit-limit...origin/codex/contract-fuzz` → exit 0, 변경 파일 세 개뿐.
- 과거 엔진(`git archive <sha> engine` + 새 테스트 파일): 8c7ee35 `4 failed, 4 passed, 2 xfailed`(네 경로 `²` ValueError 8건), a716341 `4 failed, 4 passed, 2 xfailed`(네 경로 4300자리 한도 ValueError 8건).
- 엔진 사본 변형: flow ICMP 미지 값을 INVALID 대신 UNSUPPORTED로 → `1 failed`(경로별 허용 결과가 잡음). `_port`가 `number + 1` 반환 → `2 failed`(443·0000000443 단언이 잡음).
- 비차단 참고: 결과 절 제목 날짜(10-01)와 work-log(10-02) 불일치. work-log의 10-01 기존 줄 문구가 바뀐 것은 Claude 지시문 탓이며, 앞으로 이력 줄은 고치지 않고 새 줄만 추가한다. 테스트 36행 주석은 한 줄이 길다.

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
- [x] 이슈 #7 유니코드 숫자 `ValueError`·500 수정(PR #8 병합, 이슈 #7 닫음) — 버그. `isdigit()`가 참이어도 `int()`가 거부하는 **문자**(`²`·`①`)
- [ ] 이슈 #9 긴 숫자 `int()` 한도(PR #11 구현·Claude 리뷰 완료, 병합 대기) — 버그. 같은 약속("예외 없이 네 값 중 하나")의 남은 부분: 문자는 맞지만 **자릿수**가 4300을 넘는 경우
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
- fetch/status, PR #10·#11 및 후속 PR의 병합 여부, 본 문서와 테스트 결과 확인.
- #11 병합 전 후속 PR을 main에 바로 병합하지 않는다. #11 병합 방식(merge/squash)에 따라 base와 비교 diff를 재확인한다.
- 병합과 추가 기능 착수는 사용자 결정이다.

## 주의사항 / 미해결 이슈
- 줄바꿈이 섞여 있음(CRLF 49, LF 17, 혼합 1). 관계없는 파일의 줄바꿈만 바뀐 diff를 만들지 않는다.

Codex (사용자 지정: Astra medium)
