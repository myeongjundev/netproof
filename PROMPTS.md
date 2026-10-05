# PROMPTS — 단계별로 붙여넣을 지시문

`<N>`(이슈/PR 번호), `<작업명>`만 바꿔서 해당 LLM 채널에 붙여넣습니다.
**각 단계가 끝나면 사용자가 GitHub에서 커밋·PR이 실제로 올라왔는지 확인한 뒤 다음 단계로 넘깁니다.**

## 0. 학원 PC에서 Orca로 시작하기 — Claude(조정자)
Orca에서 netproof의 기본(main) 폴더에 Claude Code를 열고 아래를 붙여넣는다. 이 Claude가 준비를 마치고, 오늘 할 일을 Orca worktree로 나눠 맡긴다.
```
한국어로 답해 줘. 여기는 학원 내 PC이고 Orca 안에서 실행 중이다. 너는 NetProof 작업의 조정자(Claude)다. 아래 순서대로 해 줘.
Orca 사용법은 추측하지 말고 orca --help, orca skills list, orca skills get <이름> --full로 확인하고 써라.

1) 준비
- orca status --json, orca repo list --json으로 netproof 저장소를 찾아라. 없으면 https://github.com/myeongjundev/netproof.git 을 받아 orca repo add로 등록하고, 기본 브랜치를 main으로 맞춰라.
- 기본 폴더에서 git fetch origin 후 main이면 git pull --ff-only를 하라. 로컬 변경이 있으면 지우지 말고 알려 줘.
- CLAUDE.md, HANDOFF.md, PROMPTS.md, docs/work-summary-2026-10-04_06.md를 읽어라. 규칙과 현재 상태는 HANDOFF.md가 기준이다.
- 기본 폴더에 .venv나 web/node_modules가 없으면 3일 정리 문서의 "학원 PC에서 이어가기"대로 설치하라. 네 명령(엔진 pytest, 서버 pytest, npm --prefix web test, npm --prefix web run build)을 직접 실행하고 결과 줄을 보여 줘. 기대값: 엔진 350 passed·2 xfailed, 서버 140 passed·1 skipped, 웹 417 passed, 빌드 성공.

2) 오늘 할 일 고르기
HANDOFF의 "다음 차례"를 세 줄로 요약하고, 아래 중 무엇을 할지 물어봐 줘(여러 개 가능).
 a. 배포 6단계: https://netproof-vert.vercel.app 에서 내가 가입, 사례 저장, 게시판 확인, 로그아웃(너는 안내만)
 b. 수동 QA D(Graylog·Wazuh) 준비: 로그를 켠 로컬 NetProof 서버(docs/security-logs.md, scripts/qa_local.py)
 c. 수동 QA E(Docker n8n) 준비: examples/n8n 워크플로. HTTP Request 주소를 https://netproof-vert.vercel.app/api/verify 로 바꿔도 된다
 d. 로드맵 4번(원인 태그·통계) 설계(HANDOFF "남은 작업")

3) Orca로 일 나누기: 과제 하나에 worktree 하나
- 새 worktree는 origin/main에서 만든다(orca worktree create). 브랜치 이름은 구현 과제면 codex/<작업명>, 문서·QA 준비면 claude/<작업명>.
- 새 worktree의 에이전트 지시문은 PROMPTS.md의 단계 지시문(1 설계, 2 구현, 3 리뷰, 4 수정)을 채워서 쓴다. 맨 앞에 다음을 붙인다: "한국어로 답하라. 이 worktree에 .venv나 web/node_modules가 없으면 docs/work-summary-2026-10-04_06.md대로 먼저 설치하라. main으로 바꾸지 마라."
- d는 그 worktree에서 Claude 설계 → 내 승인 → 같은 worktree에서 Codex 구현 → Claude 리뷰 → 내 병합 결정 순서로 간다. 내 승인 없이 다음 단계로 넘기지 마라. 같은 브랜치를 두 worktree에서 열지 마라.
- b·c는 사람이 확인하는 일이다. 너는 준비(서버 실행 명령, n8n 가져오기 순서)만 돕고, 결과는 내가 docs/qa-manual.md에 적는다.
- 일을 맡긴 뒤에는 orca worktree ps, orca terminal read로 진행을 보고, 끝나면 바뀐 것(브랜치, 커밋, PR)을 요약해 줘.

4) 지킬 것
- 너는 설계·리뷰·문서만 한다. 제품 코드 구현은 Codex 몫이다. 리뷰 때는 코드를 고치지 말고 첫 줄이 [Claude]인 PR 코멘트를 남겨라.
- 최종 PASS/DENY는 engine/만 정한다(ADR-001). 앱 안에 LLM을 넣지 않는다(ADR-002).
- 공개 저장소다. 비밀값 커밋, --force 푸시, 승인 없는 main 푸시는 하지 마라. 병합은 내가 정한다.
- 이 PC에는 운영 DB 주소(DATABASE_URL)를 입력하거나 저장하지 마라. 검토자 지정(make-reviewer)은 집 PC에서 한다.
- 수동 QA 결과를 네가 대신 완료로 바꾸지 마라.
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
