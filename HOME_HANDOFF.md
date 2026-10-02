# 집에서 이어가기 — NetProof 작업 정리

작성 기준: 2026-10-02. 현재 상태의 기준 문서는 [HANDOFF.md](HANDOFF.md), 상세 작업 이력은 [decisions/ai-work-log.md](decisions/ai-work-log.md)다.

## 현재 위치

- 저장소: https://github.com/myeongjundev/netproof
- 이어갈 브랜치: `codex/confusion-dashboard`
- 현재 PR: [#17 오탐·미탐 대시보드](https://github.com/myeongjundev/netproof/pull/17), 열림. 구현·테스트·Claude 독립 리뷰 PASS까지 완료했고 사용자 최종 확인·병합 결정 대기다.
- main 기반: `309238d`(PR #16 병합). PR #17 설계 `7af59c3`, 구현 `e0d26b3`, 리뷰 PASS 기록 `5339973`.
- 이번 인계 작업은 문서만 추가·갱신한다. PR #17은 자동 병합하지 않는다.

## 지금까지 완료한 기능

| 작업 | 완료 내용 | 상태 |
|---|---|---|
| 기본 판정·사례 공유 | 엔진 판정, 경로·ACL 증거, 사례 URL 공유, 도달 불가 표시, ACL 규칙 강조 | 기존 기능 |
| 입력 안정성 | 유니코드 숫자·긴 정수 입력 예외 처리와 회귀 검증 | 기존 기능 |
| 사례 게시판 (#13) | 검색·필터·페이지 이동 | main 병합 |
| 정책 검증·매트릭스 (#14) | 장비·서비스별 도달성 격자, 의도와 계산 결과 비교, 셀 상세 증거 | main 병합 (`c0ab37e`) |
| 사례 복제·실습 템플릿 (#15) | 예시 3개 안내, 사례에서 새 초안 만들기, 재판정·저장 | main 병합 (`7b15fde`) |
| 실제 결과 붙여넣기 (#16) | ping/Nmap 출력에서 후보 추출, 작성자가 적용·저장. 원문 비저장 | main 병합 (`309238d`) |
| 오탐·미탐 대시보드 (#17) | AI 답·사람 예상·엔진 판정을 확인된 실제 결과와 비교, 칸별 사례 목록 이동 | 구현·리뷰 완료, 병합 대기 |

최종 PASS/DENY는 `engine/`만 계산한다. 무응답·closed·filtered 출력만으로 실제 결과를 자동 DENY로 정하지 않는다. 사례의 정답과 실제 장비 확인은 사람이 한다.

## PR #17의 확정된 동작

사용자가 **통신 차단(DENY)을 양성**으로 확정했다.

| 칸 | 예측 | 실제 결과 |
|---|---|---|
| TP | DENY | DENY |
| FP · 오탐 | DENY | PASS |
| FN · 미탐 | PASS | DENY |
| TN | PASS | PASS |

AI 답·사람 예상·NetProof 판정 각각에 2×2 표가 있다. 검토자 확인이 있고 실제 결과와 해당 예측이 PASS/DENY인 사례만 분모에 들어간다. 제외 사유는 미확인 → 실제 결과 없음 → 예측 없음 순서로 한 번만 센다. 0건 칸은 링크가 없고, 나머지 칸을 누르면 해당 사례만 보인다.

최근 불일치 20건과 전체 건수도 표시한다. 목록에 실제 결과·답 종류·예상값 필터를 추가했다. 집계는 저장된 값만 읽고, 엔진 재판정이나 사례 수정은 하지 않는다. 필터 주소 동기화는 주소 → 화면의 단방향이다.

Claude (Claude Opus 5)가 구현 `e0d26b3`을 독립 리뷰하여 PASS, 차단 지적 0건으로 확인했다. 별도 probe 67개와 전체 테스트를 실행했다. 게시 단계 API 지연으로 Codex가 출처를 명시하고 리뷰 원문을 대신 게시했다.

리뷰: https://github.com/myeongjundev/netproof/pull/17#issuecomment-5946024286

비차단 후속은 초기 사례 화면의 중복 조회, 빈 query 키, 수동으로 손상된 답 종류 값과 NULL 필터의 차이 3건이다. PostgreSQL 실연결·전체 DOM 자동 테스트·인위적 지연 주입·실제 장비는 미검증이다. 기존 strict xfail 2건과 서버 skip 1건도 남아 있다.

## 인계 직전 실제 검사 출력

2026-10-02 이번 문서 인계 작업에서도 아래 네 명령을 실행했다. 출력의 핵심 줄을 그대로 옮겼다.

```text
cd engine && ../.venv/Scripts/python -m pytest -q
263 passed, 2 xfailed in 5.26s

cd server && ../.venv/Scripts/python -m pytest -q
85 passed, 1 skipped in 17.15s

npm --prefix web test
Test Files  10 passed (10)
     Tests  105 passed (105)
  Duration  1.49s

npm --prefix web run build
> tsc --noEmit && vite build
✓ 39 modules transformed.
✓ built in 705ms
```

## 집에서 받기·실행하기 (Windows PowerShell)

처음 받는 PC에서는 원하는 작업 폴더에서 실행한다.

```powershell
git clone https://github.com/myeongjundev/netproof.git
Set-Location netproof
git switch codex/confusion-dashboard
git pull
Get-Content HOME_HANDOFF.md
Get-Content HANDOFF.md
```

이미 저장소가 있으면 변경 사항을 확인한 뒤 해당 브랜치로 전환하고 `git pull` 한다. 새 PC의 실행 환경은 [README.md](README.md)에 따라 준비한다.

```powershell
python -m venv .venv
.venv/Scripts/python -m pip install -e "engine[test]" -r requirements.txt
npm --prefix web install
npm --prefix web run build
.venv/Scripts/python -m flask --app server/wsgi.py run --port 4820
```

빌드된 앱: http://127.0.0.1:4820/

화면을 개발하면서 보려면 서버를 켜 둔 상태에서 별도 터미널에 `npm --prefix web run dev`를 실행하고 http://127.0.0.1:5820/ 를 연다. Vite가 API 요청을 4820으로 전달한다.

계정을 가입한 뒤 대시보드를 볼 계정은 서버 터미널에서 검토자로 올린다.

```powershell
.venv/Scripts/python -m flask --app server/wsgi.py make-reviewer <닉네임>
```

`<닉네임>`은 가입한 실제 닉네임으로 바꾼다. 기본 DB는 `instance/netproof.db`다. 현재 PC의 4821 프리뷰는 임시 합성 DB를 사용했다. 그 DB·계정·로그인 세션·로컬 스크린샷·가상환경·실행 중 서버는 Git으로 집에 옮겨지지 않는다. 새 PC에서는 계정과 테스트 데이터를 별도로 준비해야 한다. 비밀값은 문서나 Git에 넣지 않는다.

## 다음 순서

1. PR #17 브랜치에서 화면과 리뷰를 확인하고 사용자가 병합 여부를 결정한다.
2. 병합 후 main을 갱신하고 Claude가 다음 **ACL 감사** 과제(가려진 규칙·중복·과도한 permit)를 설계한다. 구현 전 HANDOFF의 범위와 작업 브랜치를 확인한다.
3. Cisco 설정 붙여넣기는 수업 장비가 Cisco인지 사람이 확인할 때까지 보류한다.
4. 동기 인터뷰·실제 사례 수집·사례 정답 손계산·배포 계정과 비밀값 입력·README 실행 캡처는 사람 트랙으로 남는다.

집에서 다음 대화에 붙여넣을 문장:

> NetProof 이어서 작업하자. 먼저 git pull 후 HOME_HANDOFF.md와 HANDOFF.md를 읽어줘. 현재 codex/confusion-dashboard의 PR #17은 구현·Claude 리뷰 PASS 완료이고 사용자 병합 결정 대기야. DENY가 양성이야. 병합 후 다음 ACL 감사 설계는 Claude가 맡고, Codex는 합의한 범위의 구현·테스트를 맡아줘.

Codex (GPT-6)
