# F2·F3 — 용어와 받은 답 입력·표시 정리

2026-10-11 사용자 “문서 정리해 그리고 그다음은 용어 통일(F2)과 받은 답 입력의 중복 정리(F3) 설계 하자” 요청에 따른 설계다. 기준은 PR #60이 병합된 main `cc9d8a5`. 이번 설계 담당은 사용자 요청에 따라 Codex다. 이후 사용자의 “진행하자”로 범위1~5 구현을 승인받았으며, 문서 PR #61의 `4711695`에서 새 `codex/terminology-claim` 브랜치를 만들어 구현했다.

## 문제와 근거

F2·F3의 출발점은 [PR #20의 Claude 리뷰](https://github.com/myeongjundev/netproof/pull/20#issuecomment-5969258205)다. F2는 실제 결과의 `PASS` 원값, 받은 답의 “안 된다(DENY)”, 계산의 “막힘” 등 표시가 섞이는 문제였다. F3는 사례 상세의 받은 답 패널과 바로 아래 계산 비교 머리에서 종류·답을 반복하는 문제였다. 현재 입력 폼이 두 개라는 뜻은 아니다.

현재 제품을 읽어 확인한 내용:

| 위치 | 현재 상태 | 정리할 점 |
|---|---|---|
| `components/Badges.tsx`, `caseView.ts`, `pages/CasesPage.tsx` | 막힘/차단, 같음/일치, 판정 불가/지원 범위 밖이 섞이고 확인 전 실제 결과는 PASS/DENY 원값 | 사람이 읽는 결과·비교 문구를 정하고 공통 표시 함수로 사용 |
| `components/FlowForm.tsx` | 답 선택은 한 곳. 종류 선택은 접힌 “누구의 답인지 적기” 안에 있고 source 자유 입력도 같은 질문처럼 보임 | 종류를 답 선택 옆에 노출하고 출처·내용은 선택 메모로 구분 |
| `pages/CaseDetailPage.tsx`, `components/ResultPanel.tsx` | 받은 답 패널의 종류·답·출처가 계산 비교 머리의 종류·답·출처와 반복 | 종류·답은 계산 비교 머리, 출처·내용은 메모 영역에서 표시 |
| `components/ResultPanel.tsx` | UNSUPPORTED/INVALID, 답 없음, 비교 값 없음에는 대결 머리가 나타나지 않음 | 중복 제거 뒤에도 비교 불가 사례의 원래 답을 잃지 않도록 별도 표시 |
| `draft.ts`의 `fromCase` | expected/source/text를 옮기지만 kind는 옮기지 않음 | 사례 열기·JSON 가져오기에서 이미 있는 종류를 보존. source에서 종류를 추측하지 않음 |

## 목표와 경계

사용자가 적은 답, 엔진 계산, 사람이 적은 실제 결과를 구분하면서 반복 표시를 줄인다. 계산이나 비교를 바꾸는 과제가 아니다. API 필드·열·필터 주소와 저장 형식은 유지한다. 종류 미정인 옛 사례를 AI 답이나 내 예상으로 바꾸지 않는다.

F2는 판정기 입력·결과, 사례 목록·상세, 관련 대시보드 문구에 적용한다. 학습 질문·고치기 과제 prompt/label, 엔진 reason/detail/problems, 사용자가 쓴 제목·출처·내용, ACL 문자열은 그대로 둔다. 원인 태그의 “ACL 규칙에서 차단”이나 “양성은 통신 차단(DENY)” 같은 기술 설명도 일괄 치환하지 않는다. 정책 매트릭스의 기술 코드·JSON·export·API 문서의 PASS/DENY 표기는 유지한다.

## F2 — 표시 사전

| 의미·값 | 기준 표시 | 적용 |
|---|---|---|
| 엔진 PASS / DENY | 통과 / 막힘 | 결과 제목·배지·사례 판정 필터·적용 조건 |
| 엔진 UNSUPPORTED / INVALID | 판정 불가 / 입력 오류 | 결과 제목·배지·사례 판정 필터·적용 조건 |
| 받은 답 expected PASS / DENY | 된다 / 안 된다 | 입력 선택·계산 비교 머리·비교 배너·상세의 예외 표시·받은 답 필터 |
| 사람이 적은 actual PASS / DENY | 통과 / 막힘 | 실제 결과 배지·필터·상세 읽기/선택 표시. “실제 결과” 문맥을 함께 표시 |
| comparison AGREE / DISAGREE | 같음 / 다름 | 받은 답과 계산의 배지·필터·조건·문장 |
| NOT_COMPARABLE / NO_CLAIM | 비교 불가 / 받은 답 없음 | 기존 엔진 comparison 값만 표시 |
| kind ai | AI 답 | 입력·판정·목록·상세·대시보드 |
| kind self, 본인의 입력 문맥 | 내 예상 | 판정기 종류 선택·본인의 판정 비교·전용 실습 |
| kind self, 저장된 사례 문맥 | 사람 예상 | 다른 사람도 보는 목록·사례 상세·대시보드. 소유자에 따라 이름을 바꾸지 않음 |
| kind null/생략, 종류 선택·종류 항목 | 종류 미정 | 자동 추론 없이 기존 값을 유지 |
| kind null/생략, 답 비교 문맥 | 받은 답 | 종류를 모르는 비교 대상의 이름. 답 없음과 구분 |

JSON 코드를 함께 보여 줄 필요가 있는 상세 선택지는 “통과(PASS) / 막힘(DENY)”처럼 사람이 읽는 말을 먼저 쓴다. 실제 결과 배지에 코드만 단독으로 나타나지 않게 한다. 필터의 값과 주소는 기존 `PASS`, `DENY`, `AGREE`, `DISAGREE`, `none` 등을 유지한다. 필터의 `claim_kind=none`은 “종류 미정”이며 **답 없음 필터가 아니다**. `NO_CLAIM`과 합치지 않는다.

공통 표시 사전은 새 `web/src/displayText.ts`에서 정의한다. 결과·받은 답·실제 결과·비교·종류 문맥별 함수/상수를 제공하고, `caseView.ts`와 `verdictView.ts`는 이를 재사용한다. 사전은 받은 값을 글자로 옮기는 순수 함수이며 판정·comparison·확인 상태를 새로 계산하지 않는다.

ActualBadge의 plain/good/bad/warn 클래스와 기존 confirmed/result 조건은 유지한다. “안 적음”, “확인 전”, “확인”을 유지하고 “확인 · 판정과 일치”만 “확인 · 판정과 같음”으로 맞춘다. 확인된 판정 불가/입력 오류의 “확인 · 범위 밖”은 “확인 · 비교 불가”로 표시한다. 확인 전 실제와 계산이 같아도 good로 바꾸지 않는다.

대시보드 혼동 행렬의 숫자·분모·축·필터 링크는 그대로다. 결과 행·열은 통과/막힘으로 표시하고 “양성은 통신 차단(DENY)”의 정의는 유지한다. 원인 태그·오탐/미탐 이름은 이번에 바꾸지 않는다.

## F3 — 입력과 읽기 영역

### 판정기 입력

FlowForm의 기존 입력과 onClaim 경로를 유지한다. 받은 답의 세 선택지 “비교 안 함 / 된다 / 안 된다”는 한 radiogroup에서만 보인다.

답을 선택했으면 “답의 종류” 선택을 접힌 영역 밖에서 바로 보여 준다: 종류 미정 / AI 답 / 내 예상. 이 선택은 선택 사항이며 판정을 막지 않는다. 접힌 영역은 “출처·내용 적기(선택)”로 부르고 source/text만 둔다. 필드는 “출처(선택)”, “답 내용(선택)”으로 구분한다. 종류를 source 자유 입력으로 또 적게 요구하지 않는다. 내 예상의 출처는 비워도 된다.

- 종류 변경은 kind만 바꾼다. expected/source/text와 네트워크·통신은 유지한다.
- “비교 안 함”은 expected만 null로 바꾸고 종류·출처·내용은 현재 메모리에 남긴다. 다시 답을 선택하면 같은 값이 보인다. 답이 없을 때 서버가 claim을 null로 정리하는 기존 저장 동작은 바꾸지 않는다.
- 종류 미정은 기존 null/생략 상태다. source에 “ChatGPT”나 “내 예상”이 있어도 종류를 자동 선택하지 않는다.
- `fromCase`는 입력에 있던 ai/self/null kind를 보존하고 kind가 생략된 경우에는 계속 생략한다. 기존 expected/source/text 변환과 복제에서 EMPTY_CLAIM으로 비우는 동작을 유지한다. 잘못된 kind의 추정·새 JSON 검증은 이번 범위가 아니다.
- 전용 실습은 기존 PracticeGuessPicker 하나를 유지한다. `hideClaim`인 FlowForm에 새 종류 선택이나 답 radiogroup을 보이지 않는다. 실습의 self/예상 없음 전환과 App 메모리 저장은 그대로다.

### 사례 상세

입력 컨트롤을 추가하지 않는다. 기존 두 패널의 역할을 다음처럼 정한다.

1. 판정의 비교 머리: 종류(“AI 답 / 사람 예상 / 받은 답”)·된다/안 된다·NetProof 계산. 사례 상세에서는 출처를 비교 머리에 덧붙이지 않는다.
2. “답의 출처·내용” 패널: 출처와 내용만 표시한다. 빈 값은 각각 “적지 않음”. 받은 답 출처와 실제 결과 출처의 차이를 설명하는 기존 안내는 유지한다.

예를 들어 AI 답이 ‘된다’인 사례의 종류·답은 비교 머리에서 읽고, 어떤 도구의 어떤 문장인지는 출처·내용 패널에서 읽는다. 읽는 순서와 기존 사례 상세의 구성→답→계산→실제 결과 배치는 유지한다.

비교 머리를 표시하는 조건은 **현재 ResultPanel의 조건을 그대로** 공유한다: verdict 존재, result PASS/DENY, comparison 값 존재·NO_CLAIM 아님, claim.expected 존재. 사례 상세에서는 CaseCalculation이 사용하는 verdict와 같은 값(저장된 verdict에 item.comparison을 적용한 값)을 읽는다. item.result만으로 별도 조건을 만들지 않는다. NOT_COMPARABLE이나 비교 값 누락을 보고 화면에서 AGREE/DISAGREE를 새로 정하지 않는다. 조건은 `verdictView.ts`의 표시 여부 함수로 추출하고 ResultPanel과 사례 상세가 함께 사용한다.

| 상태 | 출처·내용 패널 | ResultPanel |
|---|---|---|
| 답 있음 + 기존 비교 머리가 보임 | 출처·내용만 | 종류·답·계산 비교. 출처 중복 없음 |
| 답 있음 + UNSUPPORTED/INVALID 또는 기존 비교 머리가 숨겨짐 | 종류·답을 **이 경우에만** 추가하고 출처·내용 유지 | 기존 계산 상태·이유·비교하지 않은 설명 유지 |
| claim null 또는 expected null | “이 사례에는 받은 답이 없습니다.” | 기존 계산 결과, 비교 없음 |
| kind null/생략 + 답 있음 | 필요할 때 종류 미정 표시, 출처·내용 유지 | 종류를 모르면 “받은 답”, 기존 비교 값 그대로 |

ResultPanel에는 사례 상세용 표시 옵션을 더한다: 종류 문맥을 저장된 사례로 지정하고 비교 머리의 출처를 숨긴다. 기본값은 현재 판정기/실습 문맥·출처 표시를 유지한다. 비교 배너·요약 행의 반복은 “전체 상태 요약 → 양쪽 답 → 근거”라는 기존 역할을 유지하며 이번에 없애지 않는다. “다시 살펴보기”의 두 비교 축도 유지한다.

## 구현 범위 1~5

| 번호 | 만질 파일·내용 |
|---|---|
| 1 | 새 `web/src/displayText.ts`·테스트, `caseView.ts`·`verdictView.ts`·테스트: 표시 사전·종류 문맥·기존 비교 머리 표시 조건 공유 |
| 2 | `components/FlowForm.tsx`·새 `FlowForm.test.tsx`, 필요 최소 `styles.css`: 종류를 바로 표시하고 선택 메모의 질문 중복 정리. 기존 props·hideClaim·onClaim 경로 유지 |
| 3 | `components/Badges.tsx`, `components/ResultPanel.tsx`, `pages/CasesPage.tsx`, `pages/CaseDetailPage.tsx`, `pages/DashboardPage.tsx`와 해당 테스트: 표시 통일·상세 중복 제거와 예외 보존. `draft.ts`·테스트는 kind 전달 보존만 |
| 4 | 관련 웹 회귀·임시 SQLite 브라우저 QA·캡처: 기존 비교/메모리/늦은 응답/저장/재생 검사 유지. 추가 API·기준 사례 없음 |
| 5 | 이 설계·`docs/practice.md`의 관련 문구·HANDOFF·ai-work-log·제품 QA 근거: 실제 실행 출력과 제한 기록, 커밋·푸시·main 대상 템플릿 PR |

engine/, server/, scripts/, cases/*.json·expect, web/package*.json, requirements.txt, vercel.json은 0줄이다. API·DB·라우트·URL 필터 값·공유/export 형식·엔진 버전0.2.0을 유지한다. App의 draft/practiceDrafts/fixDrafts와 revision/current()는 바꾸지 않는다. 운영 재판정·Vercel 설정 변경·배포 계정 작업은 포함하지 않는다. 해법·정답·점수·완료·축하·LLM 기능을 추가하지 않는다.

## 예상 리스크와 회귀 계약

1. **답 유실:** PASS/DENY 정상 비교에서는 종류·답이 한 곳, 비교 불가/NO_CLAIM/비교 값 없음에서는 원래 답이 사라지지 않는지 SSR 조합으로 확인한다. claim null과 expected null은 답 없음으로 구분한다.
2. **비교 재계산:** PASS/PASS/DISAGREE·PASS/DENY/AGREE 같은 의도적으로 어긋난 fixture도 받은 comparison 그대로 표시한다. INVALID/UNSUPPORTED에는 같음/다름 배너가 없다. reason/detail/problems는 원문을 유지한다.
3. **종류 오인·메모 소실:** ai/self/null/생략 × PASS/DENY의 사례 열기·JSON 가져오기·복제, 종류 변경·비교 안 함 왕복을 검사한다. 종류 추론 없음, source/text 유지, 복제만 EMPTY_CLAIM. 전용 실습의 답 입력 하나와 hideClaim도 검사한다.
4. **확인 의미 변경:** 실제 결과 null/PASS/DENY × confirmed true/false × 엔진4종 배지·클래스와 비교 가능 조건을 확인한다. 확인 전은 항상 plain, 실제 결과가 없으면 안 적음. 확인/취소 요청과 분모를 바꾸지 않는다.
5. **필터/접근성/모바일:** label 문구와 적용 조건이 같고 option 값·필터 URL은 기존과 같다. 출처·내용 중복 횟수는 fixture의 고유 값으로 검사한다. 폼은 label/legend·details·키보드 포커스를 유지하고320·375·768·1100·1101·1280px에서 넘침을 확인한다.

읽기 전용 테스트뿐 아니라 입력 상태 변경은 실제 핸들러를 호출하는 테스트와 브라우저로 확인한다. 새 라이브러리를 설치하거나 CSS 문자열 검사만으로 메모리·요청 보존을 증명하지 않는다.

## 완료 조건 — 구현 단계

1. `cd engine && ../.venv/Scripts/python -m pytest -q`: 기준489 passed·2 xfailed 유지.
2. `cd server && ../.venv/Scripts/python -m pytest -q`: 기준227 passed·1 skipped 유지(선택 pybatfish가 없는 기본 venv).
3. `npm --prefix web test`: 기존656건과 위 회귀가 모두 성공. 단순 문구 기대값은 새 사전에 맞춰 바꾸되 기존 의미 검사는 삭제하지 않음.
4. `npm --prefix web run build`: TypeScript·Vite 성공.
5. `git diff --check` 출력 없음. `git diff main...HEAD --numstat -- engine/ server/ scripts/ 'cases/*.json' requirements.txt 'web/package*.json' vercel.json` 출력 없음. `rg -n '차단|일치|불일치|사람 예상|내 예상|PASS|DENY' web/src/components/Badges.tsx web/src/components/FlowForm.tsx web/src/components/ResultPanel.tsx web/src/pages/CasesPage.tsx web/src/pages/CaseDetailPage.tsx web/src/pages/DashboardPage.tsx web/src/caseView.ts web/src/verdictView.ts web/src/displayText.ts` 결과를 붙이고 원문·기술 용어·wire 값·문맥별 예상 표현의 허용 항목을 대조. 검색0건을 목표로 삼지 않음.
6. DB·보안 로그 환경 변수를 비운 프로세스에서 `scripts/qa_local.py` 실행, 임시 SQLite·합성 계정만 사용. 라이트/다크의 위6폭에서 입력 종류/선택 메모·AI/사람 예상 상세·종류 미정·판정 불가/입력 오류·답 없음·목록 필터를 확인. 필요한 변형 사례는 임시 DB에서 기존 API로만 준비하고 cases/에는 넣지 않음. 읽기 화면에서 원래 종류/답/출처/내용이 사라지지 않음, 정상 비교의 중복 없음, 전용 실습·복귀 재생 유지, 콘솔/페이지/버튼 넘침0. 캡처·결과 기록 후 서버 정지·임시 DB 삭제.

설계 단계의 테스트 출력과 이번 구현의 검증을 구분한다. 구현 후 위 완료 조건을 직접 실행한 출력은 HANDOFF의 「테스트 결과 — F2·F3」에 기록했다. 사용자의 수동 QA A~E와 실제 장비 대조는 계속 별도 대기다.

## 구현 확인 (2026-10-11)

공통 표시 사전과 기존 비교 머리 조건을 공유한다. 종류 문맥은 판정기에서 내 예상, 저장된 사례에서 사람 예상이며 미정인 종류를 출처에서 추론하지 않는다. 답을 고르면 종류를 바로 선택하고, 선택 메모는 source/text만 받는다. 종류 변경·비교 안 함 왕복은 실제 핸들러 및 브라우저에서 다른 값을 유지했다. 상세의 source/text는 정상·비교 불가 모두 각각 한 번 표시하며, 머리가 없을 때만 종류·답을 메모 패널에 추가한다. fromCase는 supplied kind를 보존하고 복제는 기존 EMPTY_CLAIM을 사용한다.

기존 웹656건에 회귀36건을 추가했다. 상세 상태표160조합과 의도적으로 답/결과와 어긋난 comparison, fromCase의 ai/self/null/생략·JSON 가져오기·복제, 실제 결과 배지 스타일 및 필터/대시보드 분모·주소를 검사한다. 임시 SQLite에서 기존 API로 변형 사례7개를 준비하고11개 화면 × 6폭 × 라이트/다크132조합을 확인했다. 페이지·버튼 넘침0, h1 각1개, native console error/warn0이다. 실제 장비 관측·사람의 수동 QA 완료를 의미하지 않는다. QA 서버·임시 DB는 정리했다.

제품 캡처: [입력](screens/claim-input-desktop-light.jpg), [AI 답 상세](screens/claim-detail-desktop-light.jpg), [판정 불가·모바일 다크](screens/claim-unsupported-mobile-dark.jpg). [측정·입력·상세·기능·콘솔 원문](screens/claim-qa.json). 모두 합성 입력과 합성 계정의 로컬 화면이다. 첫 빌드에서 새 대시보드 테스트 fixture의 CaseSummary에 없는 필드2개를 발견해 제거하고 전체 웹 회귀와 빌드를 다시 실행했다.

Codex (GPT-6)
