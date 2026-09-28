# AI 작업 기록

AI가 무엇을 만들었고 사람이 무엇을 정했는지 나눠 적는다. 판단이 달랐던 순간은 `disagreement-log.md`에 따로 적는다.

| 날짜 | 도구 | 한 일 | 사람이 확인·결정할 것 |
|---|---|---|---|
| 2026-09-26 | Claude (Claude Code) | `plan.md` 초안(ADR 12개, 6주 일정) 작성 | Workbench에서 다시 쓰기, 범위·일정 확정 |
| 2026-09-26 | Claude (Claude Code) | `docs/semantics.md` 판정 의미론 v0 작성 | 무상태 ACL·왕복 판정·같은 서브넷=같은 링크 가정에 동의하는지 |
| 2026-09-26 | Claude (Claude Code) | `engine/` 판정 엔진 v0(Python) 구현: 확장 ACL 부분집합 해석, 최장 접두사 경로, 정방향·복귀 추적, PASS/DENY/UNSUPPORTED/INVALID | 동기들이 실제로 쓴 ACL 문법과 맞는지 |
| 2026-09-26 | Claude (Claude Code) | API(FastAPI: 64KB·개수 제한, 저장 없음, 보안 헤더) + 화면(React/TS: 구성·통신·받은 답 입력, 판정·가는 길/돌아오는 길 증거, 사례 JSON) 구현. 화면 확인: 예시 2개, 모델 밖 목적지, 잘못된 IP를 브라우저에서 직접 판정. 데스크톱·390px 화면 캡처(`docs/screen-v0-*.png`), 가로 넘침 0, 콘솔 오류 0. 확인 중 고친 것: 잘못된 IP에 따라붙던 틀린 두 번째 오류, 숫자 뒤 조사, 휴대폰에서 결과가 안 보이던 문제 | 화면 문구·배치가 동기에게 읽히는지는 1차 사용자 테스트에서 확인 |
| 2026-09-26 | Claude (Claude Code) | 테스트 63개(단위·속성·사례 파일). 코드를 일부러 틀리게 바꾼 20가지 중 효과가 있는 19가지를 테스트가 잡는지 확인했고, 처음에 놓친 2가지(ICMP 종류, ping 응답 종류)는 테스트를 더해 잡게 함 | 합성 사례 2개는 실제 장비 결과가 아님 — 동기 사례로 대체 |
| 2026-09-26 | Claude (Claude Code) | 사용자 결정(로그인 범위: 사례 게시판+검토자, 서버: Flask)에 따라 FastAPI를 Flask로 바꾸고 로그인·게시판·검토자·대시보드 구현. 수업 `flask-board`의 등급 구조·401/403 구분·로그인 실패 잠금을 가져오고, JWT 쿠키→서버 세션, 해시→Argon2id, 실명 대신 닉네임으로 바꿈. 서버 테스트 27개. 보안 규칙을 일부러 12가지로 망가뜨려 테스트가 모두 잡는지 확인(처음 놓친 '만료 세션 허용'은 테스트 추가). 실제 Chrome으로 가입→판정→저장→실제 결과→검토자 확인→대시보드→확인 자동 해제→로그아웃→휴대폰까지 통과, 콘솔 오류 0 | 검토자 지정 명령은 서버 관리자(본인)만 실행. 로그인 실패 메시지를 하나로 통일한 판단(계정 존재 여부 숨김)에 동의하는지 |
| 2026-09-26 | Claude (Claude Code) | README 화면을 로그인·게시판 버전으로 교체(`docs/screens/*.png`, 옛 `docs/screen-v0-*.png` 삭제). 빈 개발 DB에 설명용 예시 사례 4건과 계정 2개를 넣어 찍고 DB는 지움. MIT 라이선스 추가(ExplainSOC와 같은 표기) | README에 '화면 속 사례는 예시'라고 밝힘 |
| 2026-09-26 | Claude (Claude Code) | 사용자 결정(배포: Vercel + Supabase)에 따라 서버를 `server/`로 옮기고 Vercel 진입점 `api/index.py`, `vercel.json`, `requirements.txt` 추가. PostgreSQL용 연결(NullPool·prepare 끔·sslmode=require), `init-db`(표 생성 + RLS 켜기). PostgreSQL 17 컨테이너에서 서버 테스트 35개 통과, 슈퍼유저가 아닌 소유자 역할로도 통과, anon 흉내 역할은 0행·추가 거절 확인. `docs/deploy.md` 작성 | Supabase·Vercel 가입과 비밀값 입력은 본인. 첫 배포 로그에서 includeFiles 동작 확인 필요 |
| 2026-09-28 | Claude (Claude Code) | AI 답 받기 실험 v1 설계(`docs/prompts/ai-claim-v1.md`)와 결과 정리(CLCO 12답·로컬 Qwen 4답). Workbench 과제 문서 `docs/workbench-tasks.md` 작성: 합성 사례 7개의 상황(판정은 적지 않음), JSON 초안·반대 논거·익명화 프롬프트. 사례 7개가 엔진에서 입력 오류 없이 도는지만 확인 | 사례 7개의 정답(expect)은 본인이 손으로 먼저 적는다. 이후 구현은 Workbench에서 본인이 |
