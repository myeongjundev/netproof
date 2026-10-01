# 집에서 오르카로 이어하기 — 2026-10-01

## 오늘 확정한 상태

- 저장소: `https://github.com/myeongjundev/netproof.git`. 문서 작업은 `codex/quality-opinion` 브랜치의 [PR #10](https://github.com/myeongjundev/netproof/pull/10)에 올라가 있다. 병합은 아직 사용자가 결정하지 않았다.
- `docs/quality.md` 4부에는 다섯 질문에 대한 Codex 의견과 직접 실행한 퍼징 수치가 있다. 5부는 사용자가 확인한 현재 실습 환경을 반영한다.
- **두 트랙 결정(ADR-016):** A는 기존 ACL·라우팅 학습 앱, B는 Cloudflare·Graylog·Wazuh·n8n·Kali Linux 실습 증거. Cisco ACL은 초기에만 썼고 현재 사용하지 않는다. `docs/two-tracks.md`가 경계 문서다. B는 아직 구현되지 않았다.
- A의 다음 코드 작업은 `HANDOFF.md`에 정의된 이슈 #9(5,000자리 숫자에서 `/api/verify` 500). 별도로 잘못된 ACL `host` 주소가 `AddressValueError`를 내는 경로도 `docs/quality.md` 4-2에 기록했다. 이 둘을 혼동하지 않는다.
- 오늘 코드 변경은 없었다. 마지막 실행: 엔진 `105 passed`, 서버 `43 passed, 1 skipped`, 웹 `65 passed`.

## 집 PC 시작 절차

1. 집 PC에 Git, Python, Node.js, Orca, Claude Code CLI, Codex CLI가 있는지 확인한다. **로그인과 오르카 프로젝트 목록은 PC별 로컬 상태**이므로 집 PC에서 `claude auth status --json`, `codex login status`를 확인하고 필요하면 각 공식 로그인 절차를 밟는다. 비밀값을 저장소에 옮기지 않는다.
2. 오르카에 이 저장소를 추가한다. 새 PC라면 `git clone https://github.com/myeongjundev/netproof.git` 후 `git fetch origin`을 실행한다. PR #10을 볼 때는 `git switch --track origin/codex/quality-opinion`으로 브랜치를 연다. 이미 병합됐다면 `main`에서 `git pull` 후 확인한다.
3. 오르카에서 구현 작업을 시작할 때는 **새 작업 트리와 `codex/<작업명>` 브랜치**를 사용한다. 이슈 #9는 `HANDOFF.md`의 범위·완료 조건을 먼저 읽는다. 리뷰 대상 커밋 SHA를 고정하고 Claude가 별도로 검토하게 한다. `main` 직접 푸시·강제 푸시는 하지 않는다.
4. B는 첫 허가된 실습 사례 하나의 질문·요청/관찰·각 도구의 증거·시각·확인자를 정한 뒤 설계한다. A의 `PASS`·`DENY`를 B의 실제 차단·탐지 결과로 쓰지 않는다.

## 확인 명령

```powershell
git status -sb
git pull
cd engine; ../.venv/Scripts/python -m pytest -q
cd ../server; ../.venv/Scripts/python -m pytest -q
cd ..; npm --prefix web test
```

가상환경과 npm 의존성이 없으면 `README.md`의 Windows 실행 절차부터 따른다. 작업 근거는 `HANDOFF.md`, `docs/quality.md`, `docs/two-tracks.md`, PR #10이다.

Codex (GPT-6)
