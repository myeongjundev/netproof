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
- **운영 방식 예외(2026-10-23 사용자 지시: "이번 작업은 클로드로만")**: Claude가 설계·구현·테스트·자체 점검을 모두 맡고 Codex에 넘기지 않는다. 브랜치는 `claude/<작업명>`. 같은 모델의 점검은 독립 리뷰로 기록하지 않으며, 근거는 직접 실행한 테스트 출력·`git diff`·실제 관측 대조뿐이다. 사례 기대값(손계산)·제품 방향 결정은 그대로 사용자가 한다.
- **병합 위임(2026-10-24 사용자: "앞으로 너가 올린 PR은 테스트가 통과하면 병합하고 다음 작업으로 넘어가도 돼")**: Claude가 만든 PR만 해당한다. 직접 실행한 엔진·서버·웹 시험과 빌드, PR 검사(Vercel)가 통과하고 충돌이 없으면 병합 커밋으로 병합한다. 병합 뒤 main에서 시험을 다시 돌리고 공개 번들 SHA256을 확인해 기록한다.

## 검증 원칙
- "두 LLM이 동의했다/통과라고 했다"는 검증이 아닙니다. 근거는 테스트 출력, `git diff`, 실제 실행 결과뿐입니다.
- 리뷰 지적에는 파일:줄과 재현 명령을 붙입니다. 의견이 갈리면 가릴 수 있는 테스트부터 만듭니다.
- 금지: 비밀값 커밋, `--force` 푸시, 승인 없는 `main` 직접 푸시. 이 저장소는 공개입니다.

## 현재 작업 상태
- 작업(2026-10-24): **기준 사례의 `actual`(실제 결과) 형식과 검사**(아래 작업 정의). 브랜치 `claude/case-actual-field`, main `29a97a0`에서 분기.
- 직전: PR #70(홈 시작 카드)을 위임에 따라 병합했다(`29a97a0`). main에서 엔진 489+2xfail, 서버 236+1skip, 웹 796, 빌드 `index-DVHPqSQR.js`. 공개 JS·CSS SHA256이 로컬과 같다.
- **pfSense 2단계 — 팀 실습망 기준 사례(진행 중, 사용자 자료 대기):**
  - 사용자 답(2026-10-24): VPN 규칙은 `Firewall > Rules > OpenVPN` 탭이다(인터페이스 그룹이라 팀·수업 VPN 두 인스턴스가 같은 규칙을 씀). 공개 저장소에는 **주소·이름을 바꿔** 싣는다(실제↔공개 대응표는 저장소에 넣지 않음).
  - 팀 저장소 기록에서 확인한 사실: pfSense CE 2.7.2, WAN em0·LAN em1·DMZ em2·WORK em3·TRANSIT em4, DB는 WORK에 있고 게이트웨이는 pfSense, WORK·Floating 탭 비어 있음, Outbound NAT는 Automatic이고 목록이 비어 있음(10/21 화면).
  - 대기 중인 자료: OpenVPN 탭 규칙 표 캡처(사용자가 규칙을 모름 → 학원 B PC에서 캡처), 별칭 화면, A VM에서 DB로 TCP 3306·22 `nc -zv` 결과와 차단 로그. 이 PC에서는 pfSense 관리망(10.10.30.1)에 닿지 않는다.
  - 모델링 방침: OpenVPN 그룹 규칙은 두 터널 인터페이스에 같은 `rules_in`으로 넣는다(엔진 변경 없음, 그룹 탭만 쓰는 경우에만 성립한다고 사례에 적음). A VM은 터널 주소·게이트웨이 10.250.0.1인 호스트로 단순화한다. 기대값은 사람이 손계산한다.
- 다음 차례: **Claude(이 PR 병합) → 사용자(캡처·관측 자료).** 자료가 오면 규칙을 옮겨 적고 손계산 표를 드린 뒤 사례를 만든다.

## 작업 정의 — 기준 사례 `actual` 형식 (2026-10-24, Claude 선택·사용자 위임)

- **이유:** 실제 기준 사례를 담을 칸이 없었다(`docs/quality.md` 1-1의 미결정 항목). 캡처가 오기 전에 형식과 검사를 먼저 정해, 자료가 오면 데이터만 채우게 한다.
- **변경 범위:** `engine/tests/test_cases.py`에 `validate_actual`과 시험(모든 사례 형식, 합성 사례에는 없음, 올바른 예 1·잘못된 예 8)을 더했다. `docs/quality.md` 1-1에 형식·규칙을 적었다.
- **형식:** `actual: {result: PASS|DENY, date: YYYY-MM-DD, how, evidence}`. 사람이 정한 `expect.result`와 같아야 하고, 무응답만으로는 DENY로 적지 않는다(semantics §9).
- **건드리지 않을 것:** `engine/src`(판정·버전 0.2.0), server, web, cases 데이터, API.

### 테스트 결과 — `actual` 형식 (Claude 직접 실행, 2026-10-24)

```text
cd engine && ../.venv/Scripts/python -m pytest -q
502 passed, 2 xfailed in 6.42s

cd server && ../.venv/Scripts/python -m pytest -q
236 passed, 1 skipped in 56.42s

npm --prefix web test
Test Files 52 passed (52)
Tests 796 passed (796)

npm --prefix web run build
dist/assets/index-DVHPqSQR.js 425.01 kB (main과 같은 번들 — 화면 변경 없음)

git diff --check / git diff --numstat main -- engine/src server/ web/ scripts/ cases/ api/ requirements.txt vercel.json AGENTS.md CLAUDE.md PROMPTS.md
(둘 다 출력 없음, 종료0 — 판정 코드·데이터 변경 0줄)
```

- **엔진 시험이 489 → 502로 늘었다(신규 13).** 기존 사례 3개의 `actual` 형식 검사 3, 합성 사례에 `actual`이 없음 1, 올바른 예 1, 잘못된 예 8(없음·UNSUPPORTED·날짜 형식·빈 how·숫자 evidence·추가 키·합성 출처·기대값 불일치)이다.
- 실브라우저 확인은 화면 변경이 없어 하지 않았다.

## 지난 과제

상세는 `decisions/ai-work-log.md`의 같은 날짜 줄, PR 본문·코멘트, 접기 전 HANDOFF에 있다.

| PR | 과제 | 병합 커밋 | 기준 문서 |
| --- | --- | --- | --- |
| #70 | 홈 시작 카드 "뚫렸다고 가정해 보기" | `29a97a0` | — |
| #69 | 동결 전 마무리: 미대조 문구 한 번만(변경 전/후·고치기·침해 가정), 768px 확인, 수동 QA F·G·H | `40c2ebb` | [qa-manual](docs/qa-manual.md) |
| #68 | 침해 가정 실습 두 번째 장면 "관리자 PC가 뚫렸다면"(15 → 2, 데이터만) | `d1756d6` | [breach-practice-design §3.4](docs/breach-practice-design.md#34-두-번째-장면-breach-02-관리자-pc가-뚫렸다면-2026-10-24-추가) |
| #67 | 정책 검증의 "이 장비가 뚫리면" 보기(엔진 칸만 고름, 구성도 표시) | `4fb7e7d` | [policy-matrix](docs/policy-matrix.md#이-장비가-뚫리면-침해-가정-보기) |
| #66 | 침해 가정 실습 "학교 홈페이지가 뚫렸다면"(설계+구현, 15 → 1) | `c158c4e` | [breach-practice-design](docs/breach-practice-design.md) |
| #65 | 방화벽(상태 추적) 화면 입력·규칙 한 줄 표시·미대조 문구 1회 | `6e20c29` | [semantics §14](docs/semantics.md#14-제한된-상태-추적-방화벽-adr-016) |
| #64 | HANDOFF 접기(PR #62 N1) | `7922c62` | — |
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
- **침해 가정·피해 범위**: "닿음"은 방화벽과 경로가 막지 않아 연결을 시작할 수 있다는 뜻일 뿐이다. 서비스가 열려 있는지·취약한지, "뚫을 수 있다"고 말하지 않는다. 판정 불가 칸은 "안 닿음"에 넣지 않는다. 화면은 엔진 칸을 고르고 세기만 하며, 바뀐 통신의 분류는 엔진 `change_impact`를 그대로 쓴다. 실습의 참고 구성(해법)은 서버 시험 파일에만 둔다.
- **방화벽 화면 입력**: 화면에서 새로 만들거나 라우터에서 바꾼 방화벽 인터페이스만 기본 동작을 보이는 "차단"으로 채운다. 불러온 입력에 기본 동작이 없으면 "모름"으로 보이고 그대로 보낸다(D4). 상태 추적 장비에는 `acl_in`·`acl_out` 키를 보내지 않는다.
- 관계없는 줄바꿈 변경 금지.

## 남은 후속 (비차단, 미착수)
- PR #62 N2: 대시보드 혼동 행렬의 받은 답 축 행 표기(통과/막힘) — 사용자 수동 QA 판단 뒤 설계.
- pfSense: ① 2단계 실습 연동(D5) ③ 방화벽 원인 태그(지금은 `firewall_in` 차단이 전부 `분류 못 함`) (② 화면 입력·④ `toNetwork` 키 대조는 PR #65, ⑤ 미대조 문구 한 번만은 PR #65·마무리 묶음에서 처리)
- F28: change-impact 응답에 바뀐 칸 전체가 담김(최대 971줄·571 KiB).
- 침해 가정: 2차 확산("닿은 장비도 뚫렸다고 가정") — 표현을 먼저 정한다. 홈 시작 카드는 2026-10-24 추가(Claude 결정, 되돌리기 쉬움). 새 화면들의 사람 수동 QA(F·G·H)는 아직이다.
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
- **수동 QA A~H**([체크리스트](docs/qa-manual.md)): A PR #20 G2, B 실제 기본 확인창 삭제 취소, C 홈·실습 흐름(변경 전/후 포함), D 수업 환경 Graylog·Wazuh 수집, E 수업 Docker n8n 실행, F 방화벽 화면 입력, G 침해 가정 실습 두 장면, H 정책 검증의 이 장비가 뚫리면. AI의 도구 실행·로컬 대역 확인은 수동 QA 통과가 아니다. 결과는 사람이 `docs/qa-manual.md`나 PR 코멘트에 적고, AI가 대신 완료로 바꾸지 않는다. 임시 DB·합성 계정만 쓰고 비밀번호·쿠키·토큰은 기록하지 않는다.
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
- **2026-10-23~24 추가**: 방화벽 화면 입력(#65), 침해 가정 실습(#66·#68), 이 장비가 뚫리면 보기(#67), 동결 전 마무리 묶음.
- **다음 후보(사용자 결정)**: pfSense 2단계 실습 연동. Cisco 설정 붙여넣기는 "수업은 Cisco·pfSense를 쓰지 않음"(2026-10-05)으로 제외했다. 팀 캡스톤 실습망은 pfSense를 쓰므로 pfSense 쪽 우선순위는 사용자가 다시 정한다. Cloudflare 활용은 수업 용도를 확인한 뒤 정한다.

## 다음 LLM이 확인할 내용
- **worktree에서 서버 테스트(F27)**: `server/pyproject.toml`의 pythonpath에 `../engine/src`가 있어 PYTHONPATH 없이 그 worktree 엔진을 쓴다.
- 테스트·QA 자식 프로세스에서는 `DATABASE_URL`·`NETPROOF_TEST_DATABASE_URL`·`NETPROOF_SECURITY_LOG`·`NETPROOF_SYSLOG`를 비운다. QA는 `scripts/qa_local.py`의 127.0.0.1·임시 SQLite만 쓴다.
- 기본 venv에는 선택 의존성 pybatfish가 없어 서버 1 skip이 정상이다. 엔진 2 xfail은 PR #12의 strict xfail이다.
- 주 작업 폴더(`C:/gov/project/skt aleph/netproof`)는 `main`이다.
- [HOME_HANDOFF.md](HOME_HANDOFF.md)는 2026-10-02 집 인계 시점 기록이다. 날짜별 정리: [10-04~06 첫 배포](docs/work-summary-2026-10-04_06.md), [10-06 배포 이후](docs/work-summary-2026-10-06.md), [10-08](docs/work-summary-2026-10-08.md), [회고 10-06](docs/netproof-retrospective-2026-10-06.md).
