# PROMPTS — 단계별로 붙여넣을 지시문

`<N>`(이슈/PR 번호), `<작업명>`만 바꿔서 해당 LLM 채널에 붙여넣습니다.
**각 단계가 끝나면 사용자가 GitHub에서 커밋·PR이 실제로 올라왔는지 확인한 뒤 다음 단계로 넘깁니다.**

## 0. 새 PC(학원 등)·Orca에서 이어가기 — Claude
Orca는 작업(에이전트)마다 git worktree를 따로 만든다. 과제 하나에 worktree 하나를 쓰고, 그 안에서 설계(Claude) → 구현(Codex) → 리뷰(Claude)를 차례로 한다. 같은 브랜치는 두 worktree에서 동시에 열 수 없다.
```
한국어로 답해 줘. 이 PC는 집이 아닌 새 PC(학원)이고, 공용일 수 있다. Orca가 만든 git worktree 안일 수 있다.

1) 시작 점검
- git fetch origin 후 지금 폴더 경로와 브랜치를 알려 줘. main 폴더면 git pull --ff-only를 하라. worktree면 main으로 바꾸지 마라(다른 폴더가 main을 쓰고 있다). 새 작업 브랜치는 origin/main에서 만든다.
- origin/main 기준의 CLAUDE.md, HANDOFF.md, docs/work-summary-2026-10-04_06.md를 읽어라. 규칙과 현재 상태는 HANDOFF.md가 기준이다.
- 이 폴더에 .venv나 web/node_modules가 없으면 docs/work-summary-2026-10-04_06.md의 "학원 PC에서 이어가기"대로 설치하라. worktree마다 따로 필요하다.
- 네 명령(엔진 pytest, 서버 pytest, npm --prefix web test, npm --prefix web run build)을 직접 실행하고 결과 줄을 보여 줘. 기대값: 엔진 350 passed·2 xfailed, 서버 140 passed·1 skipped, 웹 417 passed, 빌드 성공.

2) 지킬 것
- 너는 설계·리뷰·문서만 한다. 제품 코드 구현은 Codex 몫이다. 리뷰 때는 코드를 고치지 말고 첫 줄이 [Claude]인 PR 코멘트를 남겨라.
- 최종 PASS/DENY는 engine/만 정한다(ADR-001). 앱 안에 LLM을 넣지 않는다(ADR-002).
- 공개 저장소다. 비밀값 커밋, --force 푸시, 승인 없는 main 푸시는 하지 마라. 병합은 내가 정한다.
- 이 PC에는 운영 DB 주소(DATABASE_URL)를 입력하거나 저장하지 마라. 검토자 지정(make-reviewer)은 집 PC에서 한다.
- 수동 QA 결과는 내가 docs/qa-manual.md에 직접 적는다. 네가 대신 완료로 바꾸지 마라.

3) 오늘 할 일 고르기
HANDOFF의 "다음 차례"를 세 줄로 요약하고, 아래 중 무엇부터 할지 물어봐 줘.
- 배포 6단계: https://netproof-vert.vercel.app 에서 내가 가입, 사례 저장, 게시판 확인, 로그아웃(너는 안내만)
- 수동 QA D(Graylog·Wazuh): 로그를 켠 로컬 NetProof 서버(docs/security-logs.md, scripts/qa_local.py)로 수업 환경에 보내기
- 수동 QA E(Docker n8n): examples/n8n 워크플로 가져오기. HTTP Request 주소를 https://netproof-vert.vercel.app/api/verify 로 바꿔도 된다
- 다음 기능 설계: 로드맵 4번 원인 태그·통계(HANDOFF "남은 작업")
```

## 1. 설계 — Claude
```
git pull 후 CLAUDE.md와 HANDOFF.md를 읽어라.
이슈 #<N>을 설계해 HANDOFF.md의 "작업 정의"를 채워라:
목표, 변경 범위(만질 파일), 건드리지 않을 것, 예상 리스크, 완료 조건(실행 가능한 명령과 기대 출력).
코드는 작성하지 마라. main에 커밋·푸시하고 "다음 차례"를 Codex로 바꿔라.
```

## 2. 구현 — Codex
```
git pull 후 AGENTS.md와 HANDOFF.md를 읽어라.
main에서 codex/<작업명> 브랜치를 만들고, HANDOFF.md 작업 정의의 범위 안에서만 구현하고 테스트를 작성하라.
완료 조건의 명령을 전부 직접 실행하고, 그 출력을 HANDOFF.md "테스트 결과"에 붙여라.
"다음 차례"를 Claude로 바꾼 뒤 커밋·푸시하고, PR 템플릿을 채워 PR을 열어라.
```

## 3. 리뷰 — Claude
```
PR #<N>을 리뷰하라. 코드는 고치지 마라.
브랜치를 받아 git diff main...HEAD를 읽고, 테스트와 완료 조건 명령을 직접 실행하라.
Codex가 적은 결과와 네가 실행한 결과가 다르면 그것부터 보고하라.
지적은 PR 코멘트 하나로 남겨라. 첫 줄은 [Claude], 항목마다 파일:줄, 문제, 재현 명령.
HANDOFF.md "리뷰 기록"을 채우고 "다음 차례"를 Codex(수정 필요) 또는 사용자(문제 없음)로 바꿔 같은 브랜치에 커밋·푸시하라.
```

## 4. 수정 — Codex
```
git pull 후 PR #<N>의 [Claude] 코멘트와 HANDOFF.md "리뷰 기록"을 읽어라.
항목별로 고치고, 고친 항목마다 재현 명령을 다시 실행해 결과를 PR 코멘트([Codex])로 남겨라.
동의하지 않는 항목은 고치지 말고, 근거가 되는 테스트나 실행 결과를 붙여 반박하라.
HANDOFF.md를 갱신하고 "다음 차례"를 Claude로 바꿔 커밋·푸시하라.
```

## 5. 최종 확인 — 사용자
- [ ] 브랜치를 받아 테스트를 **내가 직접** 실행했다
- [ ] 완료 조건의 명령을 직접 실행해 기대 출력과 비교했다
- [ ] PR diff에 비밀값이 없다
- [ ] 두 LLM이 "동의"한 항목도 위 결과로 확인했다
- [ ] 병합 (`gh pr merge <N> --merge`)
