# 최종 제출 전 검토 — 2026-10-25

검토 기준: main `0c144ccf850b70ad6f15ee5350db69b5931cd513` = 태그 `v1.1.1`. 작업 브랜치 `codex/final-review`. 사용자 허용 범위의 문서 정정·기존 기능의 작은 오류·접근성 속성만 수정한다. 이 문서의 변경 전 지적 줄 번호는 기준 커밋에 대한 번호다.

## 1) 검토 결과

### 꼭 고칠 것

| 지적 | 파일:줄(변경 전) | 재현·근거 | 처리 |
| --- | --- | --- | --- |
| 고정 CISA URL의 리다이렉트를 기본 urllib가 따라가 다른 호스트에도 요청할 수 있음 | `server/netproof_api/security_news.py:43` | HTTPS 전송만 메모리 응답으로 바꿔 301·302·303·307·308을 반환. 기존 코드는 `redirect-target.invalid` 요청까지 생성. 회귀 시험 10건 실패(외부 접속 없음) | 리다이렉트 거절. 기존 502·stale 응답 유지 |
| 최신 버전·태그가 v1.1.0으로 남음 | `docs/release-v1.0.md:1`, `:6`, `:7`; `HANDOFF.md:23` | `web/package.json`은 1.1.1, `git tag --points-at HEAD`는 v1.1.1 | 최신 표기 정정 |
| 서버 1 skipped 이유가 pybatfish 미설치로 잘못 적힘 | `README.md:86`, `HANDOFF.md:162` | `cd server && ../.venv/Scripts/python -m pytest -q -rs tests/test_deploy.py::test_postgres_tables_have_row_level_security` → SQLite에는 RLS가 없다 | PostgreSQL RLS 검사 제외로 정정. pybatfish 시험은 대역을 사용 |
| 시험 개수만 같으면 같은 소스라는 과장 | `README.md:86`, `docs/release-v1.0.md:45` | 다른 소스에서도 시험 수는 같을 수 있음. 검증 원칙에 맞지 않음 | 태그·전체 커밋 해시로 재현 소스 확인 |

### 고치면 좋은 것

| 지적 | 파일:줄(변경 전) | 재현·근거 | 처리 |
| --- | --- | --- | --- |
| 예상 라디오의 접근성 이름이 장비마다 반복됨 | `web/src/pages/BreachPage.tsx:153` | 장면 1에서 키보드로 라디오 이동. 접근성 트리에는 세 장비 모두 "닿을 것 같다"·"안 닿을 것 같다"만 표시 | 장비명을 접근성 이름에 포함. 시각 문구·동작 유지 |
| README에 공개 확인 단계가 없고 동기 테스트 예정 문구가 현재 결정과 다름 | `README.md:6`, `:24` | README만 읽으면 직접 실행 경로는 릴리스 노트를 더 열어야 함. HANDOFF는 동기 확인을 하지 않기로 기록 | 3단계·15 → 1·막힘 14, AI 점검과 다른 사용자 확인 없음 명시 |

### 제출 뒤로 미룰 것

- `server/netproof_api/security_news.py:43`, `:85`: 5초는 소켓 대기 제한이며 전체 처리 시간의 상한이 아니다. 인스턴스의 받기 잠금은 동시 요청을 직렬화하지만 장애 중 재시도 간격이나 여러 인스턴스 간 캐시는 제공하지 않는다. 변경 범위가 커지는 전체 마감 시간·장애 제어는 이번에 구현하지 않았다. README와 릴리스 노트에 제한을 정확히 적었다.
- `HANDOFF.md:128` 이하: 사람 수동 QA F·G·H, 실제 pfSense 기준 사례, 운영 DB의 예전 엔진 판정 재판정, Vercel Preview의 운영 DB 접근 설정 확인은 기존 후속이다. 이번에는 운영 설정·DB·실제 장비를 수정하거나 확인 완료로 표시하지 않았다.

README의 목적·엔진/관측의 구분·지원하지 않는 범위는 분명하다. 지정한 다섯 문서의 상대 파일·이미지 링크 28개에서 누락 0개. 보안 소식의 영어 설명에는 영어 원문 안내가 있으며 깨진 글자·의미를 바꿀 오타는 발견하지 않았다.

## 2) 바꾼 것과 이유

- 요청마다 전용 urllib opener를 만들고 리다이렉트를 거절한다. 새 의존성·외부 요청·API 모양을 추가하지 않는다. 정상 200의 원문 바이트, 고정 주소·5초·최대 5MiB 읽기 제한, 실패 시 502·오래된 자료·내부 정보 비공개 동작을 시험한다.
- 예상 라디오에 `장비 · 선택지` 접근성 이름을 붙인다. 판정·입력 상태·화면 배치는 바꾸지 않는다.
- README·릴리스 노트·CHANGELOG·HANDOFF를 실제 버전과 검증 근거에 맞춘다. v1.1.1 태그 당시 시험 수와 이번 브랜치의 추가 시험 수는 구분한다.
- `engine/`·`cases/`·의존성·웹/엔진 버전 diff 없음. ADR-001·semantics §15의 판정 의미 변경이 없으므로 엔진 0.2.0을 유지한다.

모든 문제는 수정 전에 회귀 시험을 추가해 실패를 확인했다. 직접 실행한 변경 전 결과:

```text
리다이렉트 회귀: 10 failed, 1 passed, 11 deselected in 1.36s (exit 1)
문서 회귀: 3 failed in 0.29s (exit 1)
접근성 회귀: Tests 1 failed | 19 skipped (20) (exit 1)
```

## 3) 직접 실행한 시험·빌드 결과

시험·QA 자식 프로세스의 `DATABASE_URL`·`NETPROOF_TEST_DATABASE_URL`·보안 로그 환경 변수는 비웠다. 서버 시험은 임시 SQLite를 사용했다.

변경 전 네 명령의 결과 원문(요약 줄 발췌), 모두 종료 코드 0:

```text
cd engine && ../.venv/Scripts/python -m pytest -q
508 passed, 2 xfailed in 8.56s

cd server && ../.venv/Scripts/python -m pytest -q
263 passed, 1 skipped in 59.22s

npm --prefix web test
 Test Files  55 passed (55)
      Tests  831 passed (831)
   Duration  2.58s (transform 66%, import 21%, tests 7%, worker 5%)

npm --prefix web run build
✓ 80 modules transformed.
dist/assets/index-B8aFOzro.css                            93.99 kB │ gzip:  24.99 kB
dist/assets/index-YgXu7lhv.js                            451.85 kB │ gzip: 132.03 kB
✓ built in 772ms
```

변경 후 네 명령을 모두 다시 실행했다. 결과 원문(요약 줄 발췌), 모두 종료 코드 0:

```text
cd engine && ../.venv/Scripts/python -m pytest -q
508 passed, 2 xfailed in 8.25s
EXIT_CODE=0

cd server && ../.venv/Scripts/python -m pytest -q
277 passed, 1 skipped in 63.99s (0:01:03)
EXIT_CODE=0

npm --prefix web test
 Test Files  55 passed (55)
      Tests  832 passed (832)
   Duration  1.90s (transform 67%, import 20%, tests 11%, worker 3%)
EXIT_CODE=0

npm --prefix web run build
✓ 80 modules transformed.
dist/assets/index-B8aFOzro.css                            93.99 kB │ gzip:  24.99 kB
dist/assets/index-BHFhZOa8.js                            451.88 kB │ gzip: 132.04 kB
✓ built in 518ms
EXIT_CODE=0
```

서버 +14건(리다이렉트 10·정상 다운로드 1·문서 3), 웹 +1건(장비별 접근성 이름). 엔진의 2 strict xfail과 SQLite의 1 skipped는 그대로다. `git diff --check`도 종료 0.

## 4) 공개 사이트 확인 결과

2026-10-25 로그인 없이 브라우저를 직접 조작했다. Codex의 점검이며 사람 수동 QA와 구분한다.

- 홈 → "침해 가정 실습 열기" → "확인하기": `처음 구성 3곳 · 서비스 15개 → 지금 3곳 · 서비스 15개`.
- FW em1 통과 규칙을 TCP `10.0.10.10` → `10.0.20.10:3306`으로 바꾸고 "고친 구성 확인하기": `처음 구성 3곳 · 서비스 15개 → 지금 1곳 · 서비스 1개`.
- 수복 기록: `막힘 14 · 아직 닿음 1 · 판정 불가 0 · 주소 사라짐 0, 새로 닿음 0`. 지켜야 할 서비스 3개는 그대로 됨. 입력 변경 중에는 이전 결과 표시·내려받기 비활성.
- 학습실 pfSense 수업 도구: 개념·예시·실측 비교 안내·공식 문서 링크 4개·미대조 안내 표시.
- 비로그인 학습실 보안 소식 10건, 카탈로그 판 `2026.10.23`, 16개 업체 313건, stale=false. 전체 카탈로그 수는 날짜에 따라 달라지므로 과거 설계 문서의 날짜가 붙은 수치를 지금 값으로 덮어쓰지 않았다.
- 1280px 라이트 침해 가정·수복 기록과 375px 라이트 홈·다크 홈/학습실/보안 소식/pfSense/구성 편집기: 문서 가로 넘침 0. 375px에서 실제 콘텐츠 폭은 세로 스크롤바를 제외한 360px이다. 모바일 뉴스 설명 두 줄과 키보드 초점 표시를 화면으로 확인. 전수 WCAG 인증이나 실제 휴대폰/스크린리더 검증으로 보지 않는다.
- 본문 바로가기 Enter → main 초점, 뉴스 링크 Tab 이동·가시 초점, 이름 없는 표시 중인 단추 0. 라디오의 장비명 누락은 위에서 별도로 수정했다. 점검 경로의 콘솔 오류·경고 0.
- 기본 CSS 색상으로 계산한 일반 글자 대비: 라이트 보조 글자/흰 바탕 5.81:1·회색 바탕 5.29:1·강조 링크/흰 바탕 5.05:1, 다크 보조 글자/패널 7.62:1·회색 바탕 7.24:1·강조 링크/패널 7.74:1. 확인한 조합은 4.5:1 이상이다. 모든 상태·색 조합을 인증한 것은 아니다.
- `/api/security-news` 비로그인 200, items=10, stale=false. CSP의 `connect-src 'self'`, `nosniff`, `DENY`, `no-referrer`, API `no-store` 직접 확인.
- 추적 파일의 개인 키·GitHub/AWS 토큰·비밀번호 포함 DB URL 패턴을 점검했다. 후보 7곳은 문서 자리표시자·시험용 가짜 값이며 추적 `.env`는 0개다. 전체 Git 이력·운영 비밀값 보관소를 검사했다는 뜻은 아니다.

변경 전 로컬 빌드와 공개 번들의 SHA256:

```text
/assets/index-YgXu7lhv.js
9ef960c941d0ee93d7052d4eb7d800e675446c53473127318e897049f7c36e4c
/assets/index-B8aFOzro.css
31cb43a3eedb3f966b977ed2c39bea753335b034fbfba98a4749105b8ef6222e
local_matches True (JS, CSS)
```

이번 PR 수정은 사용자의 병합·배포 전까지 공개 사이트에 반영되지 않는다.

변경 후 로컬 임시 SQLite QA에서도 15 → 1·막힘 14를 직접 재현했고 콘솔 오류·경고는 0이었다. 여섯 라디오의 접근성 이름이 장비별로 구분되는 것을 브라우저에서 확인했다. 새 다운로드 코드로 실제 CISA 자료를 받아 로컬 API 200·10건·stale=false를 확인했다(리다이렉트에 의존하지 않는 정상 경로). 저장소 밖 임시 폴더의 캡처는 검토 근거용이며 운영 계정·비밀값·제출 초안을 포함하지 않는다.

## 5) 제출 판단과 남은 위험

합성 네트워크 구성의 예상·계산·근거·수정·수복 기록을 보여 주는 학생용 앱으로 제출할 수 있다. 실제 장비 검증·다른 사용자 검증·운영 보안 보증을 한 것으로 설명하면 안 된다. 위 작은 수정은 PR에서 검토·병합한 뒤 배포 결과를 확인할 수 있으며, 병합 여부는 사용자가 결정한다. 실제 pfSense 대조·사람 QA·운영 DB 및 Preview 설정 후속은 남는다.

Codex (GPT-6)
