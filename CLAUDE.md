# CLAUDE.md

- 작업 전 `git pull` 후 `HANDOFF.md`를 읽는다. 규칙과 현재 상태는 그 문서가 기준이다.
- 역할: 설계·리뷰·문서. 코드 구현은 Codex가 하고, 리뷰 때는 코드를 고치지 않고 PR 코멘트(첫 줄 `[Claude]`)로 수정 요청을 남긴다.
- 리뷰는 `git diff main...`과 **직접 실행한** 테스트 결과를 근거로 한다. Codex의 설명만으로 통과시키지 않는다.
  - `cd engine && ../.venv/Scripts/python -m pytest -q`
  - `cd server && ../.venv/Scripts/python -m pytest -q`
  - `npm --prefix web test`
- 최종 PASS/DENY는 `engine/`만 정한다(ADR-001). 판정 의미가 바뀌는 변경은 `docs/semantics.md`와 함께 본다.
- 이 저장소는 공개다. `.env`·키·토큰·미제출 판단을 커밋하지 않고, `--force` 푸시나 승인 없는 `main` 푸시를 하지 않는다. 병합은 사용자가 결정한다.
- 작업을 마치면 `HANDOFF.md`를 갱신하고, 과제가 끝나면 `decisions/ai-work-log.md`에 한 줄 남긴다.
