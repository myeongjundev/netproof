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
- 작업: 실제 결과 붙여넣기 — ping·Nmap 출력에서 **실제 결과 입력 후보** 만들기 (로드맵 3주차, 순환 고리 ④)
- 사용자 승인(2026-10-02): PR #15 병합 완료 후 다음 과제로 진행. Claude가 설계, Codex가 구현·테스트한다.
- 기반: 최신 origin/main `7b15fde`(**PR #15 사례 복제·실습 과제 템플릿 병합 완료**). 판정기·정책 검증·매트릭스·사례 게시판·검색·대시보드·실습 과제·복제는 모두 동작한다.
- 브랜치: `codex/actual-output` (origin/main 7b15fde 기반). 설계는 main이 아니라 이 브랜치에 기록한다.
- 단계: **구현·검증 완료 → Claude 독립 리뷰 대기.** PR #15의 비차단 후속 (3)에 따라 **이 설계 문서를 구현 전에 Codex가 먼저 단독 커밋**한다(설계 커밋과 구현 커밋을 가른다).
- 보류: **Cisco 설정 붙여넣기**는 수업 ACL이 Cisco인지 확인(사람 트랙)까지, **오탐·미탐 대시보드**는 다음 과제로 설계한다. 사용자 결정(2026-10-02): **통신 차단(DENY)을 양성**으로 한다. 이번 과제 범위에는 포함하지 않는다.
- 이 과제에서 **실제 장비 접속·명령 실행·패킷 전송·배포는 하지 않는다.** 사람이 다른 곳에서 얻어 **붙여넣은 텍스트만** 다룬다.

## 작업 정의
- 목표: 사례 상세의 **실제 결과** 칸을 채울 때, 사람이 손으로 옮겨 적던 ping·Nmap 출력을 붙여넣으면 **입력 후보**(실제로/확인 방법/메모 초안)를 보여 준다. 사람이 후보를 보고 **직접 적용·저장**한다.
- **관측(실제 결과)과 판정(`verify`)은 다른 축이다.** 이 과제는 모델 판정을 만들거나 바꾸지 않는다. 붙여넣은 출력은 "실제로 무엇이 관측됐나"일 뿐이고, PASS/DENY 판정은 그대로 `engine/`의 `verify`가 정한다(ADR-001).
- 범위를 이렇게 좁힌 이유: 실제 결과 저장(`PATCH /api/cases/<id>`)·확인 해제(`clear_confirmation`)·검토자 확인·메모 1000자 한도가 이미 전부 있다(cases.py:189-228, CaseDetailPage.tsx:121-153). 새로 필요한 것은 **텍스트 → 후보 변환 하나**뿐이다. 새 DB 컬럼·마이그레이션·자동 저장·자동 확인은 만들지 않는다.

### 1) 엔진: 관측 파서·매핑 (`engine/src/netproof_engine/observe.py`, 신규)
- 최종 결과 매핑을 **엔진에 둔다**(ADR-001 유지). 화면·서버는 호출만 한다. `verify`·`compare`·`matrix`는 **고치지 않는다**.
- 공개 함수 하나: `observe(text: str, flow: dict) -> dict`. 순수 함수다 — **시계·네트워크·파일·난수를 쓰지 않는다**(메모에 날짜를 지어 넣지 않는다. 날짜는 사람이 적는다).
- 반환 계약(키를 줄이거나 늘리지 않는다):

| 키 | 값 |
|---|---|
| `status` | `"OK"` / `"REJECTED"` — REJECTED는 후보를 만들지 않았다는 뜻 |
| `problems` | 거절·미정 이유 문자열 목록(한국어, 각 200자 이하) |
| `tool` | `"ping"` / `"nmap"` / `null` |
| `observed` | `"reply"` / `"no_reply"` / `"partial"` / `"open"` / `"closed"` / `"filtered"` / `"unknown"` |
| `result` | `"PASS"` / `null` — 입력 후보. `null`은 "아직 모름" |
| `source` | `"ping"` / `"nmap"` / `null` — 기존 `ActualSource` 값만 쓴다 |
| `note` | 메모 초안, 1000자 이하 |
| `target` | 출력에서 읽은 목적지 IPv4 또는 `null` |
| `evidence` | 근거로 쓴 줄, 최대 2줄·각 120자 |

- **매핑 표**(이 표가 유일한 기준이다. 표에 없으면 `result: null`):

| 관측 | `observed` | `result` 후보 | 근거 |
|---|---|---|---|
| ping 손실 0% (받음 ≥ 1) | `reply` | `PASS` | 정방향·복귀 왕복이 실제로 됐다 |
| ping 손실 100% / 전부 시간 초과 | `no_reply` | **`null`** | 무응답은 막힘의 증거가 아니다 |
| ping 부분 손실(0 < 손실 < 100) | `partial` | **`null`** | 간헐·속도 제한·ARP와 구분되지 않는다 |
| nmap `open` (tcp·udp) | `open` | `PASS` | 응답이 돌아왔다 |
| nmap `closed` | `closed` | **`null`** | 경로는 닿았지만 서비스 상태는 모델 밖이다 |
| nmap `filtered` · `open\|filtered` | `filtered` | **`null`** | 응답 없음이다. ACL deny로 단정하지 않는다 |
| 그 밖 / 못 알아봄 | `unknown` | `null` | — |

- **무응답·filtered를 자동 DENY로 만들지 않는다.** 장비 꺼짐·ARP 실패·속도 제한·라우팅 누락·호스트 방화벽(모델 밖)과 구분되지 않는다. 사람이 DENY를 고르는 길은 **기존 select** 그대로 열려 있고, 메모 초안은 그대로 채워 준다(손으로 옮겨 적는 수고만 없앤다). **DENY 후보는 이번 범위에서 만들지 않는다** — 명시적 금지 메시지(administratively prohibited 등) 인식은 후속 과제로 남긴다.
- **흐름 일치를 엄격히 본다.** 하나라도 어긋나면 `status: "REJECTED"`, `result: null`이고 `problems`에 무엇이 어긋났는지 적는다.
  - 목적지: 출력에서 읽은 IPv4가 `flow.dst`와 **같아야** 한다. 텍스트 안의 IPv4 집합이 `{flow.dst}`를 벗어나면(경로 중간 장비 응답, 다른 대상) 거절한다.
  - 프로토콜: ping은 `flow.proto == "icmp"`이고 `flow.icmp`가 `echo`(기본)일 때만. nmap 포트 줄의 `tcp`/`udp`가 `flow.proto`와 같고 포트가 `flow.dst_port`와 같을 때만.
  - **출발지는 확인할 수 없다.** ping·nmap 출력에 출발지가 없다. `flow.src`가 맞는지 사람이 확인하게 안내만 하고, 맞다고 가정하지 않는다.
- **보수적으로 거절하는 입력**(모두 `REJECTED`, 후보 없음):
  - 대상이 둘 이상(여러 `Nmap scan report for`, 여러 ping 통계 블록)
  - 포트 줄이 둘 이상(단일 포트만 지원한다. 자동으로 하나 고르지 않는다)
  - ping과 nmap이 섞인 붙여넣기
  - 통계·포트 줄이 없는 잘린 출력, 목적지 IPv4를 못 읽은 출력(이름만 나오고 괄호 IP가 없는 경우 포함)
  - `flow`가 객체가 아니거나 `dst`가 IPv4가 아닌 경우
- **지원 형식**(최소 유용 범위. 넓히는 것은 후속):
  - Windows `ping`: `Pinging 10.0.0.5 …` / 통계 줄의 손실 백분율. **한국어 Windows 포함**(`…의 통계`, `손실: 0 (0% 손실)`). 낱줄(`Reply from` / `…의 응답`)은 근거로만 쓰고 판단은 통계 줄로 한다.
  - Linux `ping`: `PING 10.0.0.5 (10.0.0.5)`, `--- 10.0.0.5 ping statistics ---`, `4 packets transmitted, 4 received, 0% packet loss`.
  - 손실 백분율은 **언어에 의존하지 않게** 백분율 숫자 + 손실 키워드(`loss`·`손실`)로 읽는다. 통계 줄이 없으면 거절한다.
  - `nmap`: `Nmap scan report for <이름> (10.0.0.5)` 또는 `… for 10.0.0.5`, 포트 줄 `443/tcp open https` · `53/udp open|filtered` · `closed` · `filtered`.
- **제외 형식**: Cisco `show`·`ping` 출력(보류 과제), traceroute, curl·telnet·nc, 패킷 캡처, 로그 파일, nmap XML·grepable(`-oX`/`-oG`), 호스트 이름만 있는 출력. 모두 `tool: null` + 거절이고, **추측하지 않는다.**
- **숫자 파싱**: 백분율·포트·개수는 **ASCII 십진수만** 받는다(`value.isascii() and value.isdecimal()`, 길이 상한 확인 후 `int()`). 유니코드 숫자로 `int()`를 부르지 않는다 — 이슈 #7·#9와 같은 부류의 버그를 다시 만들지 않는다.
- **입력 상한**: `text`는 4000자·80줄까지, 그 위는 거절한다(`problems`). `evidence`는 2줄·각 120자, `note`는 1000자에서 자른다(서버 메모 한도와 같다).
- `engine/src/netproof_engine/__init__.py`에 `observe`를 export한다(`__all__` 포함). **`__version__`은 올리지 않는다** — 판정 계산이 바뀌지 않았고, 사례에 적히는 `engine_version`은 판정 재현용이다.

### 2) 서버: 상태 없는 파싱 엔드포인트 (`server/netproof_api/cases.py`)
- `POST /api/observe` 하나만 추가한다. `@login_required`. 본문 `{text, flow}` → `jsonify(observe(text, flow))`.
- **DB를 읽지도 쓰지도 않는다.** 사례 id를 받지 않고, 저장·확인·확인 해제를 건드리지 않는다. 판정·비교를 다시 계산하지 않는다.
- 잘못된 본문(`text`가 문자열 아님, 상한 초과)은 엔진의 `problems`로 200에 담아 돌려준다. 400은 본문이 객체가 아닐 때만.
- **원문 로그를 남기지 않는다.** 붙여넣은 텍스트를 `current_app.logger`·파일·DB·예외 메시지에 넣지 않는다(사례 메모에 사람이 확인해 남기는 요약만 저장된다).
- `/api/cases` 저장·`PATCH`·`confirm`·`unconfirm`·`export`·대시보드는 **한 줄도 고치지 않는다**. 실제 결과가 바뀌면 확인이 풀리는 기존 동작(`changed_truth` → `clear_confirmation`)을 그대로 쓴다.

### 3) 화면: 붙여넣기 → 후보 → 사람이 적용 (`web/src/pages/CaseDetailPage.tsx`)
- 위치: **실제 결과 패널 안, 작성자(`isOwner`)에게만** 보이는 `<details>` "출력 붙여넣기". 비작성자 화면(`dl.facts`)과 검토자 블록은 그대로 둔다.
- 흐름: textarea에 붙여넣기 → **"후보 만들기"** 버튼(사람이 누른다) → `api.observe(text, item.flow)` → 결과 카드(관측·후보·근거 줄·문제 목록) → **"입력칸에 적용"** 버튼 → 지역 `actual` 상태만 바뀐다 → 기존 **"실제 결과 저장"** 버튼으로 사람이 저장한다.
- **자동으로 하지 않는 것**: 입력 중 자동 호출(디바운스 포함), 자동 적용, 자동 저장, 자동 확인/확인 해제, 판정 재실행. 버튼은 사람이 누른다.
- 적용 규칙(`web/src/observe.ts`의 순수 함수로 빼서 테스트한다):
  - `result`: 후보가 `null`이면 **기존 선택을 지우지 않는다**. 후보가 있으면 덮어쓴다.
  - `source`: 후보가 있으면 설정한다(`ping`·`nmap`은 기존 `ActualSource` 값이다).
  - `note`: 비어 있으면 초안을 넣고, 내용이 있으면 **줄바꿈 뒤에 덧붙인다**(사람이 쓴 메모를 지우지 않는다). 합친 뒤 1000자에서 자른다.
- `status: "REJECTED"`면 적용 버튼을 보이지 않고 `problems`만 보여 준다. "미정"일 때는 적용은 되지만(메모·출처) 결과는 비어 있다는 것을 문구로 밝힌다.
- 고정 안내 문구(네 가지를 반드시 쓴다):
  - **"관측은 판정이 아닙니다. 붙여넣은 출력은 실제로 본 것이고, PASS/DENY 판정은 계산 엔진이 정합니다."**
  - **"응답이 없는 것(시간 초과·filtered)은 막혔다는 증거가 아닙니다. 막혔다고 볼지는 사람이 정합니다."**
  - **"출발지는 출력에 없습니다. 이 출력을 어느 장비에서 실행했는지 직접 확인하세요."**
  - **"장비 이름·내부 주소가 담긴 원문은 필요한 줄만 붙여넣으세요. 원문은 저장되지 않습니다."**
- 붙여넣은 원문은 **지역 상태**다. `Draft`·공유 링크·사례 JSON·localStorage·DB에 넣지 않는다. 화면을 떠나면 사라진다 — 의도한 동작이다.
- **출력 위조는 파서가 막을 수 없다.** 후보는 제안일 뿐이고, 사람이 적용·저장하고 검토자가 확인하며 근거 줄이 메모에 남는 것이 통제 장치다. 문구에 "확인했다고 적는 책임은 사람에게 있다"는 뜻이 드러나게 한다.
- `web/src/api.ts`에 `observe: (text, flow) => call<Observation>("POST", "/api/observe", { text, flow })` 한 줄, `web/src/types.ts`에 `Observation` 타입만 추가한다. 기존 타입·엔드포인트는 바꾸지 않는다.
- 새 라우트·새 탭·새 페이지를 만들지 않는다. JudgePage·실습 과제·복제 버튼은 건드리지 않는다.

### 4) 범위 밖 · 허용 파일
- 허용 파일: `engine/src/netproof_engine/{observe.py,__init__.py}`, `engine/tests/test_observe.py`(신규), `server/netproof_api/cases.py`, `server/tests/test_observe.py`(신규), `web/src/{observe.ts,observe.test.ts}`(신규), `web/src/{api.ts,types.ts}`, `web/src/pages/CaseDetailPage.tsx`, `web/src/styles.css`, `docs/actual-paste.md`(신규), `docs/semantics.md`, `HANDOFF.md`, `decisions/ai-work-log.md`.
- 제외: `verify`·`compare`·`policy_matrix` 수정, 판정·비교의 서버·화면 재계산, 기존 `expect`·`cases/*.json` 수정, 새 DB 컬럼·마이그레이션, 자동 저장·자동 확인·자동 판정, 원문 로그 저장, 오탐·미탐 대시보드(사용자 양성 DENY 확정, 다음 과제), Cisco 설정 붙여넣기(수업 장비 확인 전 보류), traceroute·curl·캡처·XML 지원, DENY 후보 생성, `draft.ts`·`share.ts`·`router.ts` 계약 변경, 새 의존성, 실제 장비 접속·명령 실행·패킷 전송, 배포·병합.
- 위험:
  - **무응답을 DENY로 단정**하면 실습망의 장비 꺼짐·ARP 문제를 ACL deny로 기록하게 되고, ④ 실제 결과와 ⑤ 통계가 동시에 오염된다 → 매핑 표에서 `null`로 고정하고 테스트로 막는다.
  - **대상·포트가 다른 출력을 적용**하면 다른 흐름의 결과가 이 사례에 붙는다 → 엄격 일치 + 거절 테스트.
  - 부분 손실을 PASS로 올리면 "간헐적으로 된다"가 "된다"로 기록된다 → `partial`은 `null`.
  - 원문에 수업·사내 장비 정보가 들어갈 수 있다 → 원문은 저장·기록하지 않고, 메모에는 근거 2줄만 넣는다.
  - 한국어 Windows 출력이 거절만 되면 수업 환경에서 쓸 수 없다 → 손실 백분율을 언어 비의존으로 읽고 한국어 출력 테스트를 넣는다.
  - 파서를 넓히다 보면 판정 흉내를 내게 된다 → 표에 없는 관측은 전부 `null`·`unknown`이다.
- 완료 조건: 아래 네 명령을 **직접 실행**하고 출력을 붙인다.
  - `cd engine && ../.venv/Scripts/python -m pytest -q`
  - `cd server && ../.venv/Scripts/python -m pytest -q`
  - `npm --prefix web test`
  - `npm --prefix web run build`
  - 엔진 테스트(`test_observe.py`): 매핑 표 한 줄마다 한 건 — Windows 영어·**한국어** ping 0% → `PASS`, 100%·전부 시간 초과 → `null`+`no_reply`, 부분 손실 → `null`, Linux ping 0%·100%, nmap tcp `open` → `PASS`, `closed`·`filtered` → `null`, udp `open` → `PASS`, `open|filtered` → `null`. 거절: 목적지 불일치, 프로토콜 불일치(icmp 흐름에 nmap tcp), 포트 불일치, 대상 2개, 포트 줄 2개, ping+nmap 혼합, 잘린 출력, 경로 중간 장비 IP가 섞인 출력, 빈 문자열, 4000자·80줄 초과, `flow`가 `None`·문자열·`dst` 없음. 어떤 입력에도 **예외가 나지 않는다**(유니코드 숫자 백분율·포트, 제어문자, 매우 긴 한 줄 포함). `note` ≤ 1000, `evidence` ≤ 2줄·각 ≤ 120자, 반환 키 집합 고정.
  - 서버 테스트(`test_observe.py`): 로그인 없이 401, 정상 본문 200에 계약 키, 상한 초과는 200 + `problems`, 본문이 객체가 아니면 400, **호출 후 사례 수·사례 내용·확인 상태가 그대로**(DB를 건드리지 않는다), 기존 `PATCH`로 후보를 저장하면 `actual`이 바뀌고 확인된 사례의 확인이 풀린다(기존 동작 회귀).
  - 웹 테스트(`observe.test.ts`): 적용 함수 — 후보 `null`이 기존 결과를 지우지 않음, 빈 메모엔 넣고 기존 메모엔 덧붙임, 1000자 절단(코드포인트 기준), `REJECTED`는 아무것도 바꾸지 않음.
  - 브라우저(**375×812 기준**): 사례 상세 → "출력 붙여넣기" 열기 → 붙여넣고 "후보 만들기" → 후보·근거·안내 문구 보임 → "입력칸에 적용" → 기존 "실제 결과 저장"을 **눌러야** 저장됨 확인. 대상이 다른 출력은 거절 메시지만 보이고 입력칸이 안 바뀜 확인. **본문 가로 넘침 없음**(body scrollWidth ≤ 375 — 긴 근거 줄과 붙여넣기 textarea가 가로 스크롤을 만들지 않게 `pre-wrap`·`overflow-wrap`으로 감싸거나 해당 요소 안에서만 스크롤), console error 0, 데스크톱 1280에서도 확인. 임시 DB·합성 출력 텍스트만 쓰고 실제 장비에 접속하지 않는다.
  - `docs/semantics.md`에 **9절 "관측(실제 결과)과 판정의 구분"** 추가: 관측은 `verify` 판정이 아니다 / 무응답·filtered는 DENY가 아니다 / `closed`는 경로 도달 증거지만 서비스 상태는 모델 밖이다(3·4절 범위) / ping은 `icmp echo` 흐름만, nmap은 단일 tcp·udp 포트만 / 출발지는 출력으로 확인할 수 없다 / 매핑 표 그대로. **1~8절의 PASS/DENY 정의는 바꾸지 않는다.**
  - `docs/actual-paste.md`(신규): 지원 형식·거절 사유·"원문을 저장하지 않는다"·형식을 넓히는 방법 한 문단.

## 완료 내용 / 테스트 결과
- 선행 설계 커밋 `04bccc5` 이후 observe 순수 엔진 파서·로그인 필요 상태 없는 API·작성자 상세 UI·후보 적용 helper 구현. verify/compare/matrix/기존 저장·확인 API·expect는 변경하지 않았다.
- 정상·부분손실·무응답·closed/filtered 매핑, 대상·포트·프로토콜·혼합·불완전·숫자/제어문자·상한 거절, 임의 문자열/flow 예외 없음 Hypothesis 검증. Windows 오류 응답+0% 통계도 성공 거절. 한국어 `에 대한 Ping 통계`와 `의 통계` 지원.
- 실제 실행: engine **249 passed, 2 xfailed in 2.33s**; server **80 passed, 1 skipped in 15.84s**; web **9 files, 90 passed, 1.19s**; build **tsc 성공, 38 modules, 469ms**. 최초 파서 테스트에서 Windows 통계 머리글을 새 ping으로 세는 오류 발견 후 수정·전체 엔진 재실행 통과.
- 임시 DB 사례 #27, 합성 Nmap 텍스트 수동 QA: 후보 만들기/적용 후 새로고침하면 미저장 상태, 명시적 저장 후 PASS 유지. 원문 추가 표시자는 메모에 안 들어감, 사람이 쓴 메모 보존. 다른 목적지는 적용 버튼 없음·기존 결과 유지. filtered 미정 적용은 기존 DENY 선택 유지·자동 저장 없음.
- 375×812: 긴 서비스 근거 300자에서도 body 360 ≤ 375, console error 0. 데스크톱 body 1265 ≤ 1280. 작성자 후보 패널을 브라우저에 열어 두었다.
- 원문은 지역 상태·상태 없는 요청에만 사용, 근거 2줄만 확인 후 메모에 저장. 전체 DOM 자동 테스트·인위적 응답 지연 주입·실제 장비·PostgreSQL 실연결은 미검증. 사용자 양성 DENY는 다음 대시보드용으로 기록.

## 현재 과제 리뷰 기록
- PR #16: https://github.com/myeongjundev/netproof/pull/16 — Claude (Claude Opus 5) 독립 리뷰 대기.
- 리뷰 전 추가 확인: 지원 밖 포트와 불완전 혼합 출력을 거절하는 회귀 3건을 추가했다.

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
- **PR #15 사례 복제·실습 과제 템플릿 (병합 완료, 7b15fde)**: `web/src/practice.ts`로 예시 사례에 질문·확인할 점만 붙인 실습 과제 3개, 받은 답을 비운 "복제해 다시 풀기", 저장 제목 기본값. 새 엔드포인트·새 라우트 없이 기존 `fromCase`·`load`·`api.createCase`만 재사용. Claude 독립 리뷰 PASS(9e7bdc9) → 사용자 병합.
  - 유지되는 합의: 앱은 기대값·정답·채점을 만들지 않는다. 복제는 `actual`·`confirmed`·작성자·`expect`를 물려받지 않는 별개 사례이고 저장 시 서버가 판정을 다시 계산한다. 과제 안내는 `Draft`·공유 링크에 넣지 않는다.
  - 남은 비차단 후속: 예시 버튼 제목이 풀이 원인을 드러내는 문제(문구·배치 후속 설계), 제목 입력 `maxLength`는 UTF-16 80인데 `cloneTitle`·서버는 코드포인트 80(후속 제목 입력 개선). 전체 DOM 자동 테스트는 미검증.
- **PR #14 정책 검증 + 도달성 매트릭스 (병합 완료, c0ab37e)**: 엔진 `policy_matrix`, `POST /api/policy-matrix`, `#/matrix` 화면. 상한 초과는 잘라 계산하지 않고 거절한다. `policy`와 `comparison`은 다른 축이다(`docs/semantics.md` 8절).
- **PR #13 사례 목록 검색·필터·페이지 (병합 완료)**: 비ASCII 검색은 DB 의존, `mine=1`·무인자 호환 유지.
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
- [ ] 실제 결과 붙여넣기(ping·Nmap 출력 → 실제 결과 입력 후보) — ④ **설계 완료, Codex 구현 대기 — 브랜치 codex/actual-output**
- [ ] 오탐·미탐 대시보드 — ⑤ AI 답·사람 예상·NetProof 판정을 각각 실제 결과와 2×2로, 칸을 누르면 목록 필터로. **보류: 양성 정의는 사용자가 정한다**
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
- [ ] 로그인 실패 → Graylog(GELF, 로컬 시연용) — 운영
- [ ] Batfish 차등 테스트 — ④

**6주차 (11-02~11-08)**: 버그 수정만, 2차 테스트, 발표·제출

**사람 트랙 (동시에, LLM에 넘기지 않음)**
- [ ] 동기 3명 인터뷰 · [ ] 실제 결과가 있는 사례 모으기(붙여넣기 기능의 재료) · [ ] 사례 04 손계산
- [ ] **수업 ACL이 Cisco인지 pfSense인지 확인(Cisco 과제의 선행 조건)** · [ ] **오탐·미탐 양성 정의(대시보드 과제의 선행 조건)** · [ ] 표어 결정
- [ ] 배포(Vercel·Supabase 가입, 비밀값) · [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

**위험**: 4주차 전에 ①~⑤의 핵심(하이라이트·목록 필터·정책 검증·오탐/미탐·실제 결과 붙여넣기)이 끝나지 않으면 사용자 테스트가 흔들린다. 밀리면 4·5주차 항목부터 미룬다.

## 다음 LLM이 확인할 내용
- `git pull`, `git status`, `git log -3` 후 본 작업 정의 확인. 이 설계 문서를 **구현 전에 단독 커밋**한 뒤 구현을 시작한다.
- Codex: 구현 전에 `server/netproof_api/cases.py`(`update_case`의 `actual` 검증·`clear_confirmation`, `confirm_case`), `server/netproof_api/models.py`(`ACTUAL_RESULTS`·`ACTUAL_SOURCES`), `web/src/pages/CaseDetailPage.tsx:121-153`(실제 결과 입력칸·저장 버튼·`actualChanged`), `web/src/types.ts`(`CaseDetail.actual`·`ActualSource`), `engine/src/netproof_engine/matrix.py`(엔진에 새 공개 함수를 더하는 방식·`isascii()`/`isdecimal()` 숫자 처리)를 읽고 **새 DB 컬럼·새 저장 경로·판정 재계산을 만들지 않는지** 확인한다.
- 매핑 표와 거절 목록을 줄이거나 늘리고 싶으면 먼저 요청한다. 표를 바꾸는 것은 판정 의미에 닿는 변경이다.

## 주의사항 / 미해결 이슈
- 관계없는 줄바꿈 변경 금지.
- **관측 ≠ 판정.** 붙여넣은 출력은 실제 결과(④)이고 PASS/DENY 판정은 `engine/`의 `verify`가 정한다(ADR-001). 화면·서버는 어느 쪽도 다시 계산하지 않는다.
- **무응답·filtered는 DENY가 아니다.** 자동 DENY 후보를 만들지 않는다. 사람이 기존 select로 고른다.
- 붙여넣은 **원문은 저장하지 않는다.** 저장되는 것은 사람이 확인한 메모(1000자)뿐이다.
- 실제 결과가 바뀌면 확인이 풀리는 것은 **기존 서버 동작**이다. 화면에서 확인·확인 해제를 자동으로 부르지 않는다.
- 앱은 기대값·정답·채점을 만들지 않는다(AGENTS.md). 기존 `expect`·`cases/*.json`을 바꾸지 않는다.
- 유니코드 숫자·긴 숫자로 `int()`를 부르면 이슈 #7·#9가 되돌아온다. ASCII 십진수 확인 후 길이 상한을 보고 변환한다.
- 이전 PR #12의 별도 버그(strict xfail 두 건), Hypothesis 하한 문제는 별도 후속 범위.
- CasesPage 후속 1건(빈 검색창에 공백만 입력하면 매 타자마다 재조회)은 다음에 CasesPage를 만질 때 함께 처리한다. 이번 과제 범위가 아니다.
- PR #15 후속: 예시 버튼 제목이 풀이 원인을 드러내는 문제, 제목 입력 UTF-16/코드포인트 단위 차이. 이번 범위가 아니다.

설계: Claude (Claude Opus 5)

Codex (GPT-6)
