# AGENTS.md

- 작업 전 `git pull` 후 `HANDOFF.md`를 읽는다. 규칙과 현재 상태는 그 문서가 기준이다.
- 역할: 코드 구현, 테스트 작성·실행, 버그 수정, Claude 리뷰 반영. 설계와 리뷰는 Claude가 한다.
- `codex/<작업명>` 브랜치에서만 작업하고, `HANDOFF.md` 작업 정의의 범위를 벗어나지 않는다. 벗어나야 하면 이유를 적어 요청한다.
- 완료 보고에는 **실제로 실행한** 아래 명령의 출력을 붙인다. "통과할 것이다"는 근거가 아니다.
  - `cd engine && ../.venv/Scripts/python -m pytest -q`
  - `cd server && ../.venv/Scripts/python -m pytest -q`
  - `npm --prefix web test` (화면을 바꿨다면 `npm --prefix web run build`도)
- 최종 PASS/DENY는 `engine/`만 정한다(ADR-001). 판정 로직을 화면이나 서버에 복제하지 않는다.
- 사례의 정답(`expect`)은 사람이 손으로 정한다. 기존 사례 파일의 기대값을 바꾸지 않는다.
- 이 저장소는 공개다. `.env`·키·토큰은 커밋하지 않고 `--force` 푸시나 `main` 직접 푸시를 하지 않는다. 병합은 사용자가 결정한다.
- 작업을 마치면 `HANDOFF.md`를 갱신하고 커밋·푸시한 뒤, PR 템플릿을 채워 PR을 연다. PR 코멘트 첫 줄은 `[Codex]`.
