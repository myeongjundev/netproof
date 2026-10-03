# HANDOFF

Claude ↔ Codex가 GitHub를 채널로 주고받는 **현재 상태 문서**입니다. 이력은 쌓지 않고 덮어씁니다.
과제별 이력은 `decisions/ai-work-log.md`, 사람과 AI의 판단이 갈린 순간은 `decisions/disagreement-log.md`(사용자가 채움)에 둡니다.

## 운영 방식
- 흐름: Claude Opus 설계 → Codex Sol 구현·테스트 → Codex Luna 리뷰 → Codex Sol 수정·재테스트 → 사용자 최종 확인·병합. 필요하면 Astra를 사용한다.
- 역할: 설계는 Claude Opus, 구현·테스트·리뷰 반영은 Codex Sol, 리뷰는 Codex Luna, 병합과 최종 판단은 사용자.
- 채널: 설계는 `main`의 이 문서, 구현 중 상태는 작업 브랜치의 이 문서(차례인 쪽만 수정), 리뷰 지적은 PR 코멘트.
- 같은 GitHub 계정을 쓰므로 커밋 끝 Co-Author 줄과 코멘트 첫 줄 `[Claude]`/`[Codex]`로 구분합니다.
- 단계별 지시문: [PROMPTS.md](PROMPTS.md).
- **사람만 하는 일**: 사례 정답(손계산), 동기 인터뷰, 배포 가입·비밀값 입력, 제품 방향 결정. 어느 LLM에도 넘기지 않습니다.

## 검증 원칙
- "두 LLM이 동의했다/통과라고 했다"는 검증이 아닙니다. 근거는 테스트 출력, `git diff`, 실제 실행 결과뿐입니다.
- 리뷰 지적에는 파일:줄과 재현 명령을 붙입니다. 의견이 갈리면 가릴 수 있는 테스트부터 만듭니다.
- 금지: 비밀값 커밋, `--force` 푸시, 승인 없는 `main` 직접 푸시. 이 저장소는 공개입니다.

## 현재 작업 상태
- 작업: **판정기 화면 개선** — Impeccable critique(2026-10-03, 23/40)의 우선 문제 5개와 마무리 다듬기. "받은 답이 맞았나"를 화면이 직접 말하게 하고, 학생 입력을 지키고, 오류·결과 칸·스크린리더를 정리한다 (순환 고리 ② 판정·설명)
- 근거: critique 기록(로컬, git 제외) `.impeccable/critique/2026-10-03T12-24-26Z__web-src-pages-judgepage-tsx.md`. 디자인 리뷰 서브에이전트와 Impeccable 검사기(코드 검사 0건, 브라우저 오버레이는 CSP 때문에 실행 못 함)를 합친 결과다. 필요한 내용은 이 문서의 작업 정의에 모두 옮겼다.
- 사용자 결정(2026-10-03):
  - **우선 영역: 일치·불일치 표시.** 범위: **우선 문제 5개 전부 + 마무리.**
  - **예시 버튼 제목이 정답을 드러내는 문제는 이번 범위 밖**(PR #15 후속으로 남김).
- **사용자 설계 승인(2026-10-04)**, 함께 정한 것:
  - **배너 문구는 "계산과 다릅니다/같습니다"로 한다.** NetProof 판정은 모델 안의 계산이므로, 실제 장비로 확인하지 않은 채 받은 답이 "틀렸다/맞았다"고 단정하지 않는다(1절에 반영).
  - 입력 보호는 확인 창이 아닌 **되돌리기 알림**(2절 그대로).
  - ACL 점검은 **문제가 있을 때만 펼치고**, 수정 후보는 항상 접는다(4절 그대로).
  - **구현은 PR #20 병합 뒤에 시작한다.** PR #20과 `JudgePage.tsx`·`styles.css`·`HANDOFF.md`가 겹치기 때문이다.
- 브랜치: `codex/judge-ux`, 별도 worktree `C:/gov/project/skt aleph/netproof-judge-ux`. 승인 설계 `3457154`에 origin/main `c2a998d`를 merge하고 구현·테스트를 완료했다. 원래 폴더의 다른 작업은 그대로 둔다.
- **선행 조건 완료:** PR #19 `8be25a8`, PR #20 `c2a998d`로 병합됨. PR #20 병합은 사용자의 별도 “병합해” 지시로 수행됐으며 사용자 G2/삭제 취소 수동 QA가 끝났다는 뜻은 아니다.
- 단계: **사용자 설계 승인 → main 최신화 → Codex 구현·테스트 완료 → 리뷰 → 사용자 병합 결정.**
- 다음 차례: **Codex — PR #21 리뷰 수정 요청 R1 처리**(아래 "현재 과제 리뷰 기록"). R1만 고치고 재리뷰를 요청한다. 자동 병합하지 않는다.
- **판정·엔진은 그대로다.** 화면 표시만 바꾼다. 엔진·서버·API 응답·저장 데이터를 바꾸지 않는다.

## 작업 정의
- 목표: 판정기에서 다섯 가지를 한다.
  1. 받은 답이 NetProof 계산과 같은지 다른지를 가장 먼저 보여 준다.
  2. 학생이 만든 입력을 실수로 잃지 않게 한다.
  3. 입력 오류를 원인과 칸으로 안내한다.
  4. 판정 뒤 결과 칸을 판정 중심으로 정리한다.
  5. 스크린리더·키보드로도 같은 흐름을 쓸 수 있게 한다.
- **이것은 표시 변경이다.** `verdict.result`·`verdict.comparison`·`problems`·`reason` 값은 엔진이 준 그대로 쓴다. 화면이 판정을 다시 계산하거나 비교를 새로 만들지 않는다(ADR-001). 엔진 문구(`reason`의 "정방향" 등)도 고치지 않는다.

### 1) 일치·불일치를 결과 맨 앞에 (P1, 사용자 우선 영역)
- 현재:
  - `ResultPanel`의 결과 상자 색은 `verdict.result`(PASS 초록·DENY 빨강)만 따른다(`styles.css`의 `.verdict.pass`·`.verdict.deny`).
  - `.verdict-line.agree`·`.disagree` 클래스는 붙지만 스타일이 없다.
  - 그래서 "안 된다 = 막힘"처럼 일치한 경우도 경고처럼 빨간 상자로 보인다.
- 바꿀 것:
  - 받은 답이 있고 `comparison`이 `AGREE`/`DISAGREE`면 결과 상자 **맨 위에 비교 배너** 한 줄을 둔다.
    - `DISAGREE`: **"✕ {누구}이(가) NetProof 계산과 다릅니다"**. 진한 배경에 대비되는 글자색으로 강하게 표시한다.
    - `AGREE`: **"✓ {누구}이(가) NetProof 계산과 같습니다"**. 옅은 배경이나 테두리로 차분하게 표시한다.
    - "틀렸습니다/맞았습니다"처럼 단정하는 말은 쓰지 않는다(사용자 결정). 판정은 모델 안의 계산이고, 실제 결과는 사례의 실제 결과·검토 확인이 다룬다.
    - `{누구}`는 기존 `claimLabel`의 앞부분과 같은 말이다: `AI 답` / `내 예상` / `받은 답`(종류 없음). 출처(`claim.source`)는 배너에 넣지 않는다.
    - 기호(✕/✓)와 문장을 함께 써서 **색만으로 뜻을 전하지 않는다.**
  - 배너가 있으면 결과 상자 배경을 **중립색**(`--gray-bg` 계열)으로 바꾼다. PASS/DENY 색은 대결 머리의 "NetProof 계산" 결과 글자(통과/막힘)에만 남긴다.
  - 배너 색은 일치에는 통과 계열, 불일치에는 막힘 계열 토큰을 쓴다. 라이트·다크 모두 글자 대비 4.5:1 이상이어야 한다.
  - 대결 머리(`versus`), `≠`/`=` 기호, 기존 `verdict-line` 문장은 그대로 둔다. 배너는 그 위에 더하는 것이다.
  - `NO_CLAIM`(받은 답 없음)과 `NOT_COMPARABLE`은 배너를 만들지 않는다. `NO_CLAIM` 화면은 지금 그대로 둔다.
- 새 순수 모듈 `web/src/verdictView.ts`:
  - `comparisonBanner(verdict, claim): { tone: "agree" | "disagree"; text: string } | null` — 위 규칙을 **여기 한 곳에서만** 정한다.

### 2) 입력 보호: 덮어쓰기·삭제 되돌리기 (P1)
- 현재:
  - `JudgePage`의 `load()`가 입력 전체를 말없이 바꾼다. 부르는 곳은 예시 버튼, "처음 구성", 실습 과제 "시작", JSON 붙여넣기 가져오기(`importPasted`)다.
  - `NetworkEditor`의 장비·인터페이스·경로·ACL 삭제도 누르는 즉시 지운다.
- 바꿀 것: 학생 흐름을 끊지 않도록 **확인 창 대신 한 단계 되돌리기**를 둔다.
  - 위 네 가지 덮어쓰기와 네 가지 삭제를 실행하기 **직전의 입력**을 하나 보관하고, 알림 한 줄을 띄운다: **"{무엇}을(를) 했습니다. [되돌리기]"** (예: "예시 01을 불러왔습니다", "R1 장비를 삭제했습니다", "ACL 101을 삭제했습니다").
  - "되돌리기"를 누르면 보관한 입력으로 돌아가고 알림을 닫는다. 판정 결과는 기존 `stale` 규칙대로 "이전 결과"가 된다.
  - 보관은 **한 단계만** 한다. 새 덮어쓰기·삭제가 오면 바꿔 끼운다.
  - 그 뒤 사용자가 입력을 직접 고치면 알림을 닫고 보관을 버린다. 되돌리기가 사용자의 새 입력을 지우지 않게 하기 위해서다.
  - 알림은 시간이 지나도 저절로 사라지지 않고, 닫기 단추(×)로 닫는다. `role="status"`로 알린다. 휴대폰에서는 하단 고정 판정 단추와 겹치지 않는 위치에 둔다.
  - 공유 링크로 처음 들어올 때의 `load`(페이지 진입 시)는 되돌리기 대상이 아니다.
  - **입력이 비어 있거나 직전과 같으면 알림을 띄우지 않는다.** 쓸데없는 알림을 막기 위해서다. 비교는 `toNetwork(draft)`·흐름·받은 답을 JSON으로 비교하는 수준이면 된다.
- `NetworkEditor`는 삭제 직전에 무엇을 지우는지 알리는 콜백 하나만 더 받는다(예: `onBeforeRemove(label)`). 보관·복원 상태는 `JudgePage`가 가진다.

### 3) 입력 오류: 원인을 위로, 틀린 칸 표시 (P2)
- 현재: `INVALID`인데도 받은 답이 있으면 대결 머리("된다 ? 입력 오류")가 뜨고, 진짜 원인(`verdict.problems`)은 상자 아래 작은 목록에 있다.
- 바꿀 것:
  - `result`가 `INVALID`·`UNSUPPORTED`면 **대결 머리를 만들지 않는다.** 상자 제목(`입력 오류`/`판정 불가`) 바로 아래에 `problems` 목록을 두고, 그 위에 한 줄을 넣는다.
    - INVALID: **"입력을 고쳐야 계산할 수 있습니다. 받은 답과는 비교하지 않았습니다."**
    - UNSUPPORTED: **"지원 범위 밖이라 계산을 멈췄습니다. 받은 답과는 비교하지 않았습니다."**
  - **칸 즉시 검사**:
    - `FlowForm`의 출발지·목적지 IP는 칸에서 벗어날 때(blur) IPv4 형식을 검사한다.
    - `NetworkEditor`의 인터페이스 IP는 `주소/길이`(CIDR, 길이 0~32) 형식을 검사한다.
    - 틀리면 `aria-invalid="true"`를 붙이고, 칸 아래에 짧은 문구를 `aria-describedby`로 연결한다: "IPv4 주소 형식이 아닙니다(예: 10.10.10.10)", "주소/길이 형식이 아닙니다(예: 10.10.10.1/24)".
    - 빈 칸은 오류로 표시하지 않는다.
  - 즉시 검사는 **안내일 뿐 판정을 막지 않는다.** 판정 단추는 그대로 누를 수 있고, 최종 판단은 엔진의 INVALID가 한다.
  - 숫자 변환에 `int()`/`Number()`를 쓰지 않고 ASCII 숫자 정규식으로 검사한다. 이슈 #7·#9가 다시 생기지 않게 하기 위해서다. 각 옥텟은 `/^\d{1,3}$/`에 0~255, 길이는 `/^\d{1,2}$/`에 0~32.
- 새 순수 모듈 `web/src/validate.ts`: `ipv4Problem(value): string | null`, `cidrProblem(value): string | null`.
- 엔진 `problems` 문구를 해석해 칸으로 이어 주는 기능은 만들지 않는다. 문자열 해석은 깨지기 쉽고, 흔한 경우는 즉시 검사가 미리 잡는다.

### 4) 결과 칸 정리와 말씨 통일 (P2)
- 현재:
  - 판정 뒤 오른쪽 칸에 판정·ACL 근거·ACL 점검·수정 후보·저장이 모두 펼쳐져 쌓인다.
  - ACL 점검 요약은 `가려짐 0 · 중복 0 · 일치 불가 0 · 점검 못 함 0`처럼 0까지 다 적는다.
  - 수정 후보는 `PASS`/`DENY`를 그대로 쓴다.
- 바꿀 것:
  - **ACL 점검**(`AclAudit`)을 `<details>`로 감싼다.
    - `<summary>`는 한 줄 요약이다. 문제가 있으면 `ACL 점검 · 가려짐 1 · 중복 2`처럼 **0인 항목은 뺀다.** 문제가 없으면 `ACL 점검 · 문제 없음`이고, 열린 범위가 있으면 ` · 열린 범위 N줄`을 붙인다. 점검 못 함이 있으면 `점검 못 함 N`도 요약에 넣는다.
    - 가려짐·중복·일치 불가·점검 못 함 중 하나라도 있으면 **처음부터 펼친다**(`open`). 열린 범위만 있거나 문제가 없으면 접어 둔다.
    - 고정 문구("이 점검은 판정이 아닙니다…"), 줄 목록, "입력에서 보기"는 펼친 안쪽에 그대로 둔다.
    - "나머지 전부 허용" 줄 옆에 한 줄 설명을 붙인다: "앞 줄에 걸리지 않은 모든 통신을 허용합니다." 경고나 위험 판단은 하지 않는다(PR #18 사용자 결정 유지).
  - **수정 후보**(`SuggestPanel`)를 `<details>`로 감싸고 **기본은 접는다.** `<summary>`는 `수정 후보 — 무엇을 넣으면 결과가 바뀌나`. 면책 문구·목표 선택·계산 단추는 펼친 안쪽에 둔다.
  - **말씨 통일**(화면 표시만 바꾸고 값은 그대로):
    - 수정 후보 목표 선택 라벨 `PASS`/`DENY` → `통과`/`막힘`. `afterDescription`의 `다시 판정: PASS — …` → `다시 판정: 통과 — …`.
    - `suggest.ts`의 `정방향`/`복귀 방향` → `가는 길`/`돌아오는 길`(`TRUNCATED`·`REASONS.no_acl_on_path`·`editDescription` 포함). 엔진이 준 `reason` 문장은 고치지 않는다.
  - 요약 규칙(0 제외)은 `aclAudit.ts`의 `auditBlocks`에 넣고 `summary` 필드 형식만 바꾼다. 줄 문구(`auditLineText`)는 그대로다.

### 5) 스크린리더·키보드 (P2)
- 현재:
  - 결과 `section` 전체가 `aria-live="polite"`라 판정할 때마다 경로·근거까지 다 읽는다.
  - "입력에서 보기" 단추가 여러 개인데 이름이 같다.
  - 판정기에 h1이 없다.
  - Enter로 판정할 수 없다.
- 바꿀 것:
  - 결과 `section`에서 `aria-live`를 뺀다. 대신 결과 맨 위에 **짧은 상태 한 줄**(`role="status"`)을 둔다.
    - 배너가 있으면 `"{배너 문장} · NetProof 계산 {통과/막힘}"`, 없으면 `"NetProof 계산 {제목}"`, 계산 중이면 `"계산 중…"`.
    - 화면에 보여도 되고 `sr-only`여도 된다. 배너와 내용이 겹치면 `sr-only`로 둔다.
  - "입력에서 보기" 단추마다 구분되는 `aria-label`을 붙인다.
    - ACL 근거: `"ACL {이름} {N}번 줄 입력에서 보기"`, 암묵적 deny: `"ACL {이름} 전체 입력에서 보기"`.
    - ACL 점검도 같은 형식.
    - 수정 후보의 "원래 줄 보기": `"ACL {이름} {N}번 줄 보기"`.
  - 판정기에 h1 **"판정기"**를 둔다. 화면 배치를 바꾸지 않도록 `sr-only`면 충분하다.
  - **Ctrl+Enter(맥은 Cmd+Enter)로 판정**:
    - 판정기 안 어느 입력에서든 누르면 판정 단추와 같은 동작을 한다. 로딩 중이면 무시한다.
    - 판정 단추 옆이나 아래에 작은 안내 `Ctrl+Enter`를 둔다. 휴대폰(`pointer: coarse`)에서는 숨긴다.
    - `<form>`으로 바꾸지는 않는다. ACL `textarea`에서 Enter가 줄바꿈으로 동작해야 하기 때문이다.
- 상태 한 줄 문구는 `verdictView.ts`의 `statusLine(verdict, claim, loading)`이 만든다.

### 6) 마무리 다듬기
- **이전 결과 표시 강화**: `stale`이면 결과 상자와 배너를 흐리게(`opacity` 0.55 안팎) 하고, 상자 위에 "이전 결과" 표시를 더한다. 기존 경고 문장은 그대로 둔다.
- **데스크톱 겹침**: 스크롤할 때 위에 붙는 판정 단추 줄(`.judge`, sticky `top:0`)이 결과(`.follow`, sticky `top:80px`) 글자 위로 겹친다. 겹치지 않게 정리한다. 방법은 Codex가 고르고, 1280×800에서 스크롤 중간과 끝을 캡처해 확인한다.
- **단추 위계**: "사례로 저장"의 저장 단추를 `ghost`가 아닌 기본 단추(채움 또는 테두리 강조)로 바꾼다. 판정 단추(`primary`) 다음 위계다.

### 7) 범위 밖 · 허용 파일
- 허용 파일:
  - 신규: `web/src/{verdictView.ts,verdictView.test.ts,validate.ts,validate.test.ts}`
  - 수정: `web/src/pages/JudgePage.tsx`, `web/src/components/{ResultPanel.tsx,FlowForm.tsx,NetworkEditor.tsx,AclEvidence.tsx,AclAudit.tsx,SuggestPanel.tsx}`, `web/src/{aclAudit.ts,aclAudit.test.ts,suggest.ts,suggest.test.ts,styles.css,types.ts}`
  - 기록: `HANDOFF.md`, `decisions/ai-work-log.md`
- 제외:
  - 엔진 전부, 서버 전부, API 응답 형식, DB
  - `CaseDetailPage`·`CasesPage`·`DashboardPage`·`PolicyMatrixPage`·`SettingsPage`. 단, `ResultPanel`·`AclEvidence`를 같이 쓰는 화면에서 바뀐 표시가 깨지지 않는지는 확인한다.
  - `share.ts`·`draft.ts`·`practice.ts`, 기존 `expect`·`cases/*.json`
  - 새 의존성, 앱 안 LLM 호출, 배포·병합
- **하지 않는 것**:
  - 예시 버튼 제목 변경 (사용자 결정, 범위 밖)
  - 토폴로지 그림
  - ACL 점검 위치 이동 (다른 탭으로 빼기)
  - 엔진 문구 변경, 엔진 `problems`를 칸과 잇는 기능
  - 휴대폰 "결과로 돌아가기" 단추
  - 확인 창 (되돌리기로 대신한다)
  - 판정 의미 변경
- **`ResultPanel`은 사례 상세와 매트릭스 화면도 쓴다.** 배너·상태 줄·INVALID 표시 변경은 그 화면에도 나타나는데, 의도한 변경으로 본다. 사례 상세에서 깨지지 않는지 브라우저로 확인한다. 되돌리기·Ctrl+Enter·즉시 검사는 판정기에만 둔다.
- 위험과 막는 방법:
  - **배너가 비교를 새로 계산함** → `comparison` 값만 읽는다. `verdict.comparison`이 없으면 배너가 없는지 테스트로 확인한다.
  - **색만으로 뜻을 전함** → 기호와 문장을 함께 쓰고, 대비 4.5:1 이상.
  - **되돌리기가 사용자의 새 입력을 지움** → 직접 고치면 보관을 버리는 규칙 + 브라우저 확인.
  - **즉시 검사가 판정을 막거나 이슈 #7·#9가 다시 생김** → 판정은 막지 않고, 정규식으로 검사하고, 테스트에 유니코드 숫자·긴 숫자를 넣는다.
  - **접힌 ACL 점검이 문제를 숨김** → 문제가 있으면 처음부터 펼친다.
  - **사례 상세 화면 회귀** → 브라우저 확인 항목에 넣는다.
- 완료 조건: 아래 네 명령을 **직접 실행**하고 출력을 붙인다.
  - `cd engine && ../.venv/Scripts/python -m pytest -q` (엔진은 고치지 않지만 회귀 확인)
  - `cd server && ../.venv/Scripts/python -m pytest -q`
  - `npm --prefix web test`
  - `npm --prefix web run build`
- 웹 테스트:
  - `verdictView.test.ts`:
    - AGREE·DISAGREE × 종류(ai/self/없음)의 배너 문장과 tone
    - `NO_CLAIM`·`NOT_COMPARABLE`·받은 답 없음·`INVALID`·`UNSUPPORTED`는 배너 없음
    - `statusLine`의 계산 중·배너 있음·없음 문구
  - `validate.test.ts`:
    - 정상 IPv4/CIDR
    - 옥텟 256, 길이 33, 자리 빠짐, 옥텟 앞자리 0(`010.0.0.1`, `10.0.0.01` — 엔진이 거절한다)
    - 앞뒤 공백은 **오류가 아님**(엔진·`toNetwork`가 공백을 떼고 계산한다. Claude 설계 오류를 PR #21 리뷰에서 바로잡음)
    - 빈 문자열은 오류가 아님
    - 유니코드 숫자(`１０.０.０.１`, `١٠.٠.٠.١`)와 긴 숫자 문자열도 예외 없이 오류 문구를 돌려줌
  - `aclAudit.test.ts`: 요약에서 0 제외, "문제 없음 + 열린 범위 N줄", 점검 못 함 포함, 기존 줄 문구 회귀
  - `suggest.test.ts`: 통과/막힘·가는 길/돌아오는 길 표기, 기존 문구 회귀
- 브라우저(**375×812와 1280×800, 라이트·다크**, 임시 DB만):
  - 예시를 불러와 받은 답을 바꿔 가며 판정한다. 일치 배너(✓)와 불일치 배너(✕)가 각각 보이고, 불일치가 더 강하게 보이는지. 받은 답이 없으면 배너가 없는지.
  - 장비를 만들거나 고친 뒤 예시 버튼을 누른다. 알림 "…불러왔습니다 [되돌리기]"가 뜨고, 되돌리기로 원래 입력이 복구되는지. ACL을 삭제한 뒤 되돌리기로 복구되는지. 알림이 뜬 뒤 입력을 직접 고치면 알림이 닫히는지.
  - 출발지에 `10.10.10.300`을 넣는다. 칸에서 벗어날 때 오류 문구와 `aria-invalid`가 붙는지, 그래도 판정할 수 있는지, INVALID 화면이 대결 머리 없이 원인 목록부터 보이는지.
  - ACL 점검: 문제 있는 ACL은 펼쳐진 채, 문제 없는 ACL은 접혀 요약만 보이는지. 수정 후보는 접혀 있는지.
  - Ctrl+Enter로 판정되는지. "입력에서 보기" 단추 이름이 서로 다른지(접근성 트리로 확인). h1 "판정기"가 있는지.
  - 입력을 고치면 결과가 흐려지고 "이전 결과" 표시가 붙는지. 1280에서 스크롤하는 동안 판정 단추 줄과 결과가 겹치지 않는지.
  - **사례 상세 화면**(`#/cases/<id>`)에서 결과 표시가 깨지지 않는지.
  - body scrollWidth ≤ 화면 폭, console error 0.
- 가능하면 `/impeccable critique web/src/pages/JudgePage.tsx`를 다시 돌려 점수(이전 23/40)를 기록한다. 못 돌리면 "미실행"으로 적는다.

## 완료 내용 / 테스트 결과
- 구현·테스트 완료(2026-10-04). 승인 설계 `3457154`, PR #20 병합 `c2a998d` 확인 후 `git merge origin/main`. 충돌은 HANDOFF 한 파일뿐이며 이 PR의 작업 정의·승인 상태를 유지하고 이전 과제 상태는 아래 요약으로 보존했다.
- 허용 파일만 변경: 비교 배너/짧은 상태 줄, 한 단계 되돌리기, blur IPv4/CIDR 안내, ACL 점검/수정 후보 접기·표기, h1·단축키·접근성 이름, 이전 결과·스크롤 겹침·저장 단추 위계. `result/comparison/problems/reason`은 엔진 응답 그대로 표시한다.
- 결과에는 판정 당시 받은 답의 복사본을 연결했다. 입력에서 답을 바꾸더라도 이전 결과의 비교 배너와 대결 머리가 새 답으로 바뀌지 않는다. 되돌리기는 원래 입력·실습·제목을 복원하고 이전 결과로 표시하며, 응답 revision도 무효화한다.
- 신규 표시·검사 모듈과 SSR 회귀 포함 웹 테스트 48개 추가(156→204). 숫자 변환 없이 ASCII·길이·문자열 범위로 안내만 검사하고 판정 단추는 막지 않는다. 엔진·서버·API·기존 expect·사례 JSON·새 의존성 변경 없음(`origin/main` 대비).
- 아래는 **최종 코드로 직접 실행한 전체 명령 출력**이다. 모두 exit 0. PowerShell에서는 각 디렉터리를 workdir로 지정해 실행했으며, 기존 ignored .venv/node_modules junction을 사용하고 worktree의 engine/src 및 server를 PYTHONPATH로 지정했다. 테스트는 임시 DB, PostgreSQL 실연결 1건은 기존 skip.

### `cd engine && ../.venv/Scripts/python -m pytest -q`

```text
........................................................................ [ 21%]
........................................................................ [ 43%]
........................................................................ [ 65%]
........................................................................ [ 87%]
......................................xx                                 [100%]
326 passed, 2 xfailed in 4.56s
```

### `cd server && ../.venv/Scripts/python -m pytest -q`

```text
.......................................................................s [ 78%]
....................                                                     [100%]
91 passed, 1 skipped in 33.51s
```

### `npm --prefix web test`

```text
> netproof-web@0.1.0 test
> vitest run


 RUN  v5.0.2 C:/gov/project/skt aleph/netproof-judge-ux/web


 Test Files  15 passed (15)
      Tests  204 passed (204)
   Start at  00:57:39
   Duration  531ms (transform 61%, import 22%, tests 11%, worker 5%)
```

### `npm --prefix web run build`

```text
> netproof-web@0.1.0 build
> tsc --noEmit && vite build

vite v8.3.1 building client environment for production...
transforming...
✓ 47 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                                            0.62 kB │ gzip:  0.45 kB
dist/assets/PretendardVariable.subset.66-C3HqaDeY.woff2    8.25 kB
dist/assets/PretendardVariable.subset.64-CTbrgYF9.woff2    8.26 kB
dist/assets/PretendardVariable.subset.65-B66rjuyf.woff2   11.10 kB
dist/assets/PretendardVariable.subset.68-DS9B48d0.woff2   16.34 kB
dist/assets/PretendardVariable.subset.73-DMrK970F.woff2   18.33 kB
dist/assets/PretendardVariable.subset.72-pYYGrEQR.woff2   19.50 kB
dist/assets/PretendardVariable.subset.75-CxKdrRNf.woff2   19.99 kB
dist/assets/PretendardVariable.subset.90-BF7RiZjm.woff2   20.85 kB
dist/assets/PretendardVariable.subset.67-BmuXdlDy.woff2   21.84 kB
dist/assets/PretendardVariable.subset.89-DOzqWPpX.woff2   21.86 kB
dist/assets/PretendardVariable.subset.74-D4tQnymK.woff2   22.39 kB
dist/assets/PretendardVariable.subset.84-Brb8EsYQ.woff2   24.49 kB
dist/assets/PretendardVariable.subset.87-Lzui2vbK.woff2   24.66 kB
dist/assets/PretendardVariable.subset.76-DhPm2b_q.woff2   24.92 kB
dist/assets/PretendardVariable.subset.85-Byo_x2hf.woff2   25.10 kB
dist/assets/PretendardVariable.subset.88-CqX6JSgh.woff2   25.64 kB
dist/assets/PretendardVariable.subset.86-XG7lTN_6.woff2   25.71 kB
dist/assets/PretendardVariable.subset.77-DwaxqOC8.woff2   26.04 kB
dist/assets/PretendardVariable.subset.79-XpoyPP38.woff2   26.22 kB
dist/assets/PretendardVariable.subset.81-BZzF9Hb3.woff2   26.30 kB
dist/assets/PretendardVariable.subset.82-BgAHe30u.woff2   26.50 kB
dist/assets/PretendardVariable.subset.78-DhqRbBzT.woff2   26.54 kB
dist/assets/PretendardVariable.subset.83-DF-zBLLe.woff2   26.96 kB
dist/assets/PretendardVariable.subset.70-BUXiAGMT.woff2   27.54 kB
dist/assets/PretendardVariable.subset.37-BD6FyOtY.woff2   27.91 kB
dist/assets/PretendardVariable.subset.71-DuPZj8us.woff2   28.32 kB
dist/assets/PretendardVariable.subset.80-DsV9Qp_h.woff2   28.79 kB
dist/assets/PretendardVariable.subset.63-B35xsm4O.woff2   28.81 kB
dist/assets/PretendardVariable.subset.40-BDaOfdUe.woff2   29.84 kB
dist/assets/PretendardVariable.subset.43-DHdpry7N.woff2   30.38 kB
dist/assets/PretendardVariable.subset.7-E2HaA55t.woff2    31.91 kB
dist/assets/PretendardVariable.subset.1-C-__qv6_.woff2    32.04 kB
dist/assets/PretendardVariable.subset.44-qHopVhdd.woff2   32.13 kB
dist/assets/PretendardVariable.subset.24-CmkE8Q8D.woff2   32.30 kB
dist/assets/PretendardVariable.subset.10-DzSWztS8.woff2   33.03 kB
dist/assets/PretendardVariable.subset.41-BUACvzZC.woff2   33.18 kB
dist/assets/PretendardVariable.subset.50-C8IyFH7L.woff2   33.22 kB
dist/assets/PretendardVariable.subset.54-Dt2-cQkx.woff2   33.34 kB
dist/assets/PretendardVariable.subset.5-K_MNGNCe.woff2    33.62 kB
dist/assets/PretendardVariable.subset.6-Bxhohlcm.woff2    33.96 kB
dist/assets/PretendardVariable.subset.9-Btb3bmS6.woff2    34.01 kB
dist/assets/PretendardVariable.subset.55-jFgflYjX.woff2   34.18 kB
dist/assets/PretendardVariable.subset.39-B_7wfth9.woff2   34.25 kB
dist/assets/PretendardVariable.subset.52-CNgqKOOJ.woff2   34.35 kB
dist/assets/PretendardVariable.subset.0-BHUkWNFR.woff2    34.56 kB
dist/assets/PretendardVariable.subset.53-BSRnyb-u.woff2   34.57 kB
dist/assets/PretendardVariable.subset.42-Dp-5mnyL.woff2   34.60 kB
dist/assets/PretendardVariable.subset.45-BniyRFfm.woff2   34.66 kB
dist/assets/PretendardVariable.subset.36-Dn5IBRQB.woff2   34.68 kB
dist/assets/PretendardVariable.subset.34-CaCS33Md.woff2   34.72 kB
dist/assets/PretendardVariable.subset.69-YT16ymcp.woff2   34.78 kB
dist/assets/PretendardVariable.subset.38-D4hu443z.woff2   34.80 kB
dist/assets/PretendardVariable.subset.62-DGSAWCfb.woff2   34.87 kB
dist/assets/PretendardVariable.subset.33--0OT__YQ.woff2   34.91 kB
dist/assets/PretendardVariable.subset.17-BfZSA-Xc.woff2   34.94 kB
dist/assets/PretendardVariable.subset.4-Bvh2YGoc.woff2    35.15 kB
dist/assets/PretendardVariable.subset.56-BwZdvJZQ.woff2   35.18 kB
dist/assets/PretendardVariable.subset.35-DWFYRGLp.woff2   35.35 kB
dist/assets/PretendardVariable.subset.27-CT6nuW9L.woff2   35.42 kB
dist/assets/PretendardVariable.subset.61-PUuTnod4.woff2   35.64 kB
dist/assets/PretendardVariable.subset.15-D04iXIE3.woff2   35.66 kB
dist/assets/PretendardVariable.subset.13-C42mj_j2.woff2   35.70 kB
dist/assets/PretendardVariable.subset.47-B-cWO2pw.woff2   35.72 kB
dist/assets/PretendardVariable.subset.57-BwFDg-Fs.woff2   35.96 kB
dist/assets/PretendardVariable.subset.51-Bxd0gTAs.woff2   36.02 kB
dist/assets/PretendardVariable.subset.49-BblQVys9.woff2   36.05 kB
dist/assets/PretendardVariable.subset.20-Ig1-z3n5.woff2   36.12 kB
dist/assets/PretendardVariable.subset.14-Bl512uUX.woff2   36.51 kB
dist/assets/PretendardVariable.subset.46-BMRq7xC-.woff2   36.54 kB
dist/assets/PretendardVariable.subset.8-CRbJhhyA.woff2    36.69 kB
dist/assets/PretendardVariable.subset.21-yKPEdLXC.woff2   37.26 kB
dist/assets/PretendardVariable.subset.11-CqVmlKJn.woff2   37.40 kB
dist/assets/PretendardVariable.subset.48-Ct-fWrPO.woff2   37.77 kB
dist/assets/PretendardVariable.subset.60-CeHezjjf.woff2   37.77 kB
dist/assets/PretendardVariable.subset.16-BQUnS2GX.woff2   37.91 kB
dist/assets/PretendardVariable.subset.12-BHuZSgT0.woff2   37.94 kB
dist/assets/PretendardVariable.subset.91-Csm0YNoH.woff2   37.99 kB
dist/assets/PretendardVariable.subset.30-CWDM1c0J.woff2   38.44 kB
dist/assets/PretendardVariable.subset.28-CpO0Y96p.woff2   38.46 kB
dist/assets/PretendardVariable.subset.22-CSqxKoOs.woff2   38.68 kB
dist/assets/PretendardVariable.subset.59-CMkWjhdo.woff2   38.97 kB
dist/assets/PretendardVariable.subset.29-D6hjrUWm.woff2   39.28 kB
dist/assets/PretendardVariable.subset.32-CGnFWD2i.woff2   40.21 kB
dist/assets/PretendardVariable.subset.23-DK80wi0t.woff2   40.28 kB
dist/assets/PretendardVariable.subset.26-Sozl8dw8.woff2   40.32 kB
dist/assets/PretendardVariable.subset.3-Dqw33sf4.woff2    40.64 kB
dist/assets/PretendardVariable.subset.58-DlucQts_.woff2   41.56 kB
dist/assets/PretendardVariable.subset.18-CwAxMC3C.woff2   41.60 kB
dist/assets/PretendardVariable.subset.31-CdmyZ5mm.woff2   41.89 kB
dist/assets/PretendardVariable.subset.25-CsoWBIZB.woff2   42.03 kB
dist/assets/PretendardVariable.subset.19-CJu4Zcdo.woff2   42.32 kB
dist/assets/PretendardVariable.subset.2-dCZkyKLw.woff2    43.92 kB
dist/assets/index-CklHE7pC.css                            69.92 kB │ gzip: 20.47 kB
dist/assets/index-CdgSBJvV.js                            317.69 kB │ gzip: 96.33 kB

✓ built in 268ms
```

### 브라우저 확인 — 임시 DB, computer-use 스킬

- Codex IAB(localhost:5184), 실제 viewport **375×812·1280×800 × 라이트·다크**. build 산출물을 제공하는 Flask 서버와 무작위 temp 경로의 SQLite만 사용했다. 합성 계정·합성 사례 1건(예시01 구성, AI PASS 주장)을 만들었으며 운영 DB/기존 사례/expect에는 접근·변경하지 않았다.
- 네 화면 조합에서 일치 ✓ / 불일치 ✕ 배너·중립 결과 상자 확인. 받은 답 없음에서는 배너 없음. AI/종류 없음 배너 확인; 내 예상 및 누락 comparison 등은 순수 테스트로 확인. 실제 기기/타 브라우저 전수 검사는 아니다.
- 배너의 computed RGB로 WCAG 글자 대비 계산: 라이트 불일치 **7.26:1**, 라이트 일치 **5.71:1**, 다크 불일치 **8.39:1**, 다크 일치 **7.62:1**. 기호·문장도 함께 표시.
- 장비 이름 수정→예시 교체→되돌리기로 기존 이름 복원. 예시·처음 구성·JSON(포트443↔444)·실습 시작 덮어쓰기 복원, 같은 입력 재불러오기는 알림 없음. 알림 후 직접 입력 수정 시 되돌리기 사라짐. 장비·인터페이스·정적 경로·ACL 삭제 모두 복원 확인. 시간 자동 소멸은 없으며 × 닫기 제공. 공유 초기 진입의 되돌리기 제외는 코드 확인(별도 공유 링크 브라우저 재진입 미실행).
- 출발지 `10.10.10.300` 및 인터페이스 길이33에서 blur 후 오류 문구·aria-invalid·aria-describedby 확인. 여전히 판정 가능; INVALID 결과는 대결 머리/배너 없이 원인 목록이 엔진 reason 앞에 표시됨. 정상 라벨 이름이 안내 문구와 섞이지 않도록 IP 입력에 명시적 접근성 이름을 유지.
- 정상 ACL(열린 범위 사실만)은 기본 접힘, 합성 중복 permit 줄은 **가려짐1·중복1·열린 범위2줄**로 기본 펼침. 수정 후보는 기본 접힘. 후보 목표 통과/막힘, c1 가는 길·다시 판정 통과를 확인했고 엔진 이유 `정방향 · 복귀 방향 모두 통과`는 그대로였다. 점검 못 함/INVALID 펼침 조건은 SSR·순수 테스트, 모든 한도/서버 오류의 브라우저 지연 주입은 미실행.
- Ctrl+Enter와 Meta+Enter로 판정 확인. h1 판정기 및 ACL 이름·줄 번호 포함 버튼 이름을 접근성 트리로 확인. 결과 전체 live 대신 짧은 status 한 줄만 SSR/트리 확인. 물리 스크린리더 낭독·로딩 중 연타 지연 주입은 미실행.
- 입력 변경·복원 뒤 “이전 결과”와 opacity0.55, 판정 당시 답 유지 확인. 1280 두 테마에서 중간/끝 스크롤 캡처: 단추/결과는 본문 흐름, 간격16px(라이트 중간 judge.bottom32.78125/follow.top48.78125, 다크 중간 -393.21875/-377.21875), 겹침 없음. 모바일 고정 판정 단추 및 숨긴 단축키 안내, 저장 단추 secondary 위계 확인.
- **사례 상세** `#/cases/1`도 두 크기·두 테마에서 원문 구성→AI 받은 답→AI 비교 배너→실제 결과 미정 표시를 확인했다. 기존 상세 파일은 수정하지 않았다. body.scrollWidth ≤ viewport(판정 1265≤1280·360≤375, 상세1280/375), console error/warn=[].
- 캡처(로컬, Git 제외): `C:/Users/dora2/.codex/visualizations/2026/10/04/judge-ux/`의 `judge-1280-light-disagree-final.jpg`, `judge-1280-light-agree.jpg`, `judge-375-{light,dark}-{agree,disagree}.jpg`, `invalid-1280-dark.jpg`, `detail-{375,1280}-{light,dark}.jpg`, `scroll-1280-{light,dark}-{middle,end}.jpg`.
- 정리: 테스트 계정 로그아웃·기기 테마 복원·viewport reset·QA 탭 닫음·서버 종료. 절대 경로를 검증한 temp 폴더 `netproof-judge-ux-5d7f12d4-663f-4251-8934-f7ef665f3a4d` 및 DB를 삭제(Test-Path=False), 캡처는 보존. 시작 전 연결 실패 탭은 종료 요청이 도구 정책에서 막혀 자동 임시 탭 정리에 맡겼다.
- `/impeccable critique`: **미실행**(이 세션에 해당 도구/스킬 없음). 점수 개선을 추정해 쓰지 않는다. 전체 DOM 자동화·실장비·PostgreSQL·지연 주입은 미검증.
- **PR #20의 사용자 G2 및 실제 기본 확인창 삭제 취소는 계속 수동 확인 대기.** 이번 결과로 PASS 처리하지 않는다. 다음 차례는 이 PR **리뷰(Claude)**, 배포·병합하지 않음.

구현·테스트·기록: Codex (GPT-6)

## 현재 과제 리뷰 기록
### PR #21 Claude 독립 리뷰 (2026-10-04, HEAD `fc32549`) — 수정 요청 1건
- 근거: `git diff origin/main...HEAD`(18파일, 엔진·서버 변경 0, 허용 파일 밖 변경 0)와 Claude가 직접 실행한 출력.
  - 엔진 `326 passed, 2 xfailed in 3.81s` · 서버 `91 passed, 1 skipped in 30.53s` · 웹 `15 files, 204 passed` · 빌드 `✓ built in 252ms`(`tsc --noEmit` 포함)
- 브라우저(임시 SQLite, localhost, 1280 라이트)로 직접 확인:
  - Ctrl+Enter 판정, 배너 `✕ 받은 답이 NetProof 계산과 다릅니다`와 상태 줄 `… · NetProof 계산 막힘`, `aria-live`는 결과 구역에서 빠짐.
  - ACL 점검 `문제 없음 · 열린 범위 1줄`은 접힘, 수정 후보 접힘.
  - ACL 101 삭제 → 알림 → 되돌리기로 ACL 복구, "이전 결과"·opacity 0.55·"다시 판정하기". 예시 02 불러오기 → 알림, 직접 입력하면 알림 닫힘.
- 설계 대조 결과: 1)~7) 모두 반영. 배너·비교는 엔진의 `comparison`만 읽고(`verdictView.ts`), 판정 당시 받은 답 복사본(`judgedClaim`)을 써서 입력을 고쳐도 배너가 엔진 비교와 어긋나지 않는다. ADR-001 위반 없음.
- **R1 (수정 요청) — 즉시 검사가 엔진과 반대로 말한다.** 직접 확인함.
  - `010.10.10.10` → 칸 안내 없음, 판정은 `INVALID`("흐름의 src '010.10.10.10'는 올바른 주소가 아닙니다"). `validate.test.ts`가 `001.002.003.004`를 정상으로 고정하고 있다. Python `ipaddress`는 옥텟 앞자리 0을 거절한다.
  - `10.10.10.10 ` → 칸에 "IPv4 주소 형식이 아닙니다", 그러나 엔진은 공백을 떼고 정상 계산(불일치 배너까지 나옴). 인터페이스 주소도 `toNetwork`가 trim한다. **앞뒤 공백 거절은 Claude 설계(테스트 목록)의 잘못**이며 이번에 설계를 고쳤다.
  - 고칠 것(`web/src/validate.ts`, `validate.test.ts`만):
    - 검사 전에 `value.trim()`. 공백만 있는 값은 빈 값처럼 오류 아님.
    - IPv4 옥텟: 두 자리 이상이면서 `0`으로 시작하면 오류(`0`은 정상). 접두사 길이의 앞자리 0(`/08`)은 엔진이 받으므로 그대로 정상.
    - 테스트: `010.0.0.1`·`10.0.0.01`·`1.2.3.010/24` 오류, `" 1.2.3.4"`·`"1.2.3.4/24 "`·`"1.2.3.4/08"` 정상, 기존 유니코드 숫자·긴 문자열 오류 유지.
- 비차단 후속(이번에 고치지 않아도 됨):
  - F5: 처음 들어온 빈 템플릿 상태에서 예시를 눌러도 되돌리기 알림이 뜬다(`hasInput`이 템플릿 장비를 입력으로 본다).
  - F6: 알림 조사 고정 "을" → "예시 02을". 설계대로 `을(를)`로 쓰거나 받침에 따라 고른다.

## 이전 과제 기록 (요약 — 상세는 `decisions/ai-work-log.md`)
- **PR #20 사례 게시판 학습형 UI (사용자 지시로 병합 완료, `c2a998d`)**: 시작 안내·목록/카드·상세 구성 원문·출처 분리, 모바일 필터 F1 해결 확인, PR #19 main 최신화 포함.
  - **사용자 G2·실제 기본 확인창 삭제 취소는 수동 QA 대기 유지.** Claude 조사에서는 confirm을 false로 대체하면 페이지 유지·GET200·DELETE 없음, true면 단일 DELETE·GET404였다. 이는 실제 네이티브 취소 버튼 검증이 아니다. 자동화 timeout 원인 추정과 재현 사실을 구분한다([Claude 조사](https://github.com/myeongjundev/netproof/pull/20#issuecomment-5969258205)).
  - F2 용어 전체 통일은 후속(이번에는 승인된 judge-ux의 수정 후보 표기만 변경). F3 받은 답 종류·답 중복 정리, F4 모바일 네트워크 구성 접기도 후속 설계 대상. 금지된 상세/Badges/CaseNetwork는 이번에 바꾸지 않음.
- **PR #19 수정 후보 (병합 완료, `8be25a8`)**: 엔진 재판정으로 확인한 ACL 삽입 후보·직접 목표 선택. 후보 ≠ 판정·정답·안전 보장, 다른 통신 영향은 미확인. Claude 독립 리뷰 PASS, 6,000회 무작위 probe 불일치0; 기존 엔진/API는 이번에 변경하지 않음.
- **PR #18 ACL 점검 (병합 완료, `c19f554`)**: 엔진 `acl_audit`(정확 상자 합집합 계산)으로 가려짐·중복·일치 불가·점검 못 함과 permit 열린 범위를 계산, `POST /api/acl-audit`, 판정기 "ACL 점검" 섹션. Claude 독립 리뷰 PASS → 재확인 R1(전체 연산 한도 100k→300k 재측정)·R2 → 재리뷰 PASS(`cc5cf96`) → 사용자 병합.
  - 유지되는 합의: **점검 ≠ 판정.** 결론을 못 내면 "점검 못 함"(추측 금지). **과도함은 경고하지 않고 열린 범위를 사실로만 적는다**(사용자 결정).
- **PR #17 오탐·미탐 대시보드 (병합 완료, `6c7c9b1`)**: 기존 `/api/dashboard`에 DENY 양성·세 축(AI 답·사람 예상·NetProof 판정)·네 칸·상호 배타 제외 집계, 목록 필터 `actual`·`claim_kind`·`claim_expected`, 칸 → 목록 링크. Claude 독립 리뷰 PASS(`e0d26b3`, 차단 0) → 사용자 병합. 최종 실행: engine 263 passed·2 xfailed, server 85 passed·1 skipped, web 105 passed, build 성공.
  - 유지되는 합의: **양성은 통신 차단(`DENY`)**(사용자 확정). **집계 ≠ 판정.** 미확인·미정·미지원은 분모에서 빼고 제외 수를 화면에 보인다. 필터 주소 동기화는 주소 → 화면 단방향.
  - 남은 비차단 후속 3건: CasesPage 진입 시 조회 2번, 빈 질의 `#/cases?`의 빈 query 키, 임의 DB `kind` 값과 `claim_kind=none`(NULL만) 차이. PostgreSQL 실연결·DOM 전체 자동 테스트·지연 주입은 미검증.
- **PR #16 실제 결과 붙여넣기 (병합 완료, `309238d`)**: 엔진 `observe` 순수 파서(ping·Nmap 출력 → 실제 결과 **입력 후보**), 상태 없는 `POST /api/observe`. **관측 ≠ 판정**, 무응답·filtered는 DENY 후보를 만들지 않고, 붙여넣은 원문은 저장하지 않는다. 후속 3건(Nmap에 ping 낱줄 혼합, NBSP·전각 공백 거절, 거절 시 `target` 잔존).
- **PR #15 사례 복제·실습 과제 템플릿 (병합 완료, `7b15fde`)**: 앱은 기대값·정답·채점을 만들지 않는다. 후속: 예시 버튼 제목이 풀이 원인을 드러내는 문제, 제목 길이 UTF-16/코드포인트 차이.
- **PR #14 정책 검증 + 도달성 매트릭스 (병합 완료, `c0ab37e`)**: 엔진 `policy_matrix`, `POST /api/policy-matrix`, `#/matrix`. 상한 초과는 잘라 계산하지 않고 거절한다.
- **PR #13 사례 목록 검색·필터·페이지 (병합 완료)**: 비ASCII 검색은 DB 의존.
- **그 전**: PR #2 사례 URL 공유, PR #4 도달 못 한 목적지, PR #6 ACL 줄 하이라이트, PR #8·#11 유니코드/긴 숫자 `int()` 버그 — 모두 병합 완료.

## 남은 작업 — 로드맵 (2026-09-30 확정, ADR-015)
**정체성**: 네트워크 설정에 대한 답(AI·사람)을 계산으로 검증하고, 왜 그런지 보여 주고, 실제 결과로 그 검증까지 검증하는 실습실.
**순환 고리**: ① 입력 → ② 판정·설명 → ③ 보안 점검 → ④ 실제 결과로 확인 → ⑤ 통계·학습 → ①. 모든 기능은 이 중 하나를 강화한다.
**근거**: 강사님 피드백 — 목록 필터·검색·최적화 / 오탐·미탐 감지 / 시각화·하이라이트·색. 사용자가 "전부 넣는다"로 결정.
**원칙**: 판정·점검·수정 후보는 모두 엔진 계산(ADR-001). 앱 안 LLM 설명은 계속 제외(ADR-002). 과제마다 설계 → 구현 → 리뷰 → 병합 한 바퀴. 같은 폴더에서 Codex 작업은 한 번에 하나(병행하려면 별도 worktree).

**끝난 것**
- [x] 협업 파일 도입 · [x] P1 사례 URL 공유(PR #2) · [x] 도달 못 한 목적지 표시(PR #4)
- [x] `plan.md` 목표 변경 기록(ADR-015)

**2주차 전반 (~10-04)**
- [x] ACL 규칙 줄 하이라이트(이슈 #5 · PR #6 병합)
- [x] 이슈 #7 유니코드 숫자 `ValueError`·500 수정(PR #8 병합, 이슈 #7 닫음)
- [x] 이슈 #9 긴 숫자 `int()` 한도(PR #11 병합)
- [x] 사례 목록 검색·필터·페이지(PR #13 병합)

**2주차 (10-05~10-11)**
- [x] 정책 검증 + 도달성 매트릭스 ★대표 — ③ (PR #14 병합 완료)
- [x] 사례 복제·실습 과제 템플릿 — ① (PR #15 병합 완료)
- [ ] Cisco 설정 붙여넣기 ①`interface`/`ip address` ②`ip route` — ① **보류: 수업 ACL이 Cisco인지 확인(사람 트랙) 뒤 착수**

**3주차 (10-12~10-18, 해커톤 1차 주말 — 가볍게)**
- [x] 실제 결과 붙여넣기(ping·Nmap 출력 → 실제 결과 입력 후보) — ④ (PR #16 병합 완료, `309238d`)
- [x] 오탐·미탐 대시보드 — ⑤ (PR #17 병합 완료, `6c7c9b1`)
- [x] ACL 점검(가려진 규칙·중복·열린 범위) — ③ (PR #18 병합 완료, `c19f554`)
- [ ] 판정기 화면 개선(critique 23/40 우선 문제 5개) — ② **구현·네 명령·임시 DB UI 검증 완료 → 리뷰 대기 — 브랜치 codex/judge-ux, 아직 병합 아님**
- [ ] Cisco 설정 붙여넣기 ③`access-list`/`ip access-group`
- [ ] **배포**(사람 트랙과 함께) — 4주차 테스트 전에 공개 URL

**4주차 (10-19~10-25) — 사용자 테스트 주간, 기능은 병행**
- [x] 수정 후보 제안("무엇을 바꾸면 통하나") — ② **PR #19 병합 완료, 8be25a8**
- [ ] 변경 전/후 판정 비교 — ②
- [ ] 원인 태그·통계("가장 많이 틀린 원인 Top 5") — ⑤

**5주차 (10-26~11-01, 해커톤 2차 주말) — 11-01 기능 동결**
- [ ] 연습 문제 모드(판정 숨기고 예측 → 채점, 개인 오탐·미탐) — ⑤
- [ ] 구성도 그림 + 경로 재생 — ②
- [ ] 불일치 사례 → 회귀 테스트 내보내기, 엔진 버전별 재판정 — ④
- [ ] 로그인 실패 → Graylog(GELF, 로컬 시연용) — 운영
- [ ] Batfish 차등 테스트 — ④

**6주차 (11-02~11-08)**: 버그 수정만, 2차 테스트, 발표·제출

**사람 트랙 (동시에, LLM에 넘기지 않음)**
- [ ] 동기 3명 인터뷰 · [ ] 실제 결과가 있는 사례 모으기(붙여넣기 기능의 재료) · [ ] 사례 04 손계산
- [ ] **수업 ACL이 Cisco인지 pfSense인지 확인(Cisco 과제의 선행 조건)** · [x] **오탐·미탐 양성 정의: 통신 차단(DENY)** · [ ] 표어 결정
- [ ] 배포(Vercel·Supabase 가입, 비밀값) · [ ] README 화면 다시 캡처(기능이 늘어난 뒤)

**위험**: 4주차 전에 ①~⑤의 핵심(하이라이트·목록 필터·정책 검증·오탐/미탐·실제 결과 붙여넣기)이 끝나지 않으면 사용자 테스트가 흔들린다. 밀리면 4·5주차 항목부터 미룬다.

- [x] **사례 게시판 학습형 UI 1차(2026-10-03 추가)** — ①②④ PR #20 사용자 지시로 병합(`c2a998d`). **사용자 G2/삭제 취소 수동 QA는 별도 대기 유지.**

## 다음 LLM이 확인할 내용
- **Codex: "현재 과제 리뷰 기록"의 R1만 고친다**(`validate.ts`·`validate.test.ts`). 네 명령 출력을 다시 붙이고 PR #21에 `[Codex]` 코멘트로 재리뷰를 요청한다.
- `git switch codex/judge-ux` 후 `git pull`, `AGENTS.md`와 이 문서를 읽고 main 대상 PR의 diff를 리뷰한다. 설계 `3457154` 승인 및 PR #20 `c2a998d` 병합 후 구현·검증 완료. 아래 실제 출력은 Codex 실행 근거이며 독립 리뷰 PASS를 뜻하지 않는다.
- 리뷰어: 다음 파일과 작업 정의 1)~7)을 대조한다.
  - `web/src/components/ResultPanel.tsx`(`RESULT_TEXT`·`COMPARISON_TEXT`·`claimLabel`·`verdict-line`)
  - `web/src/pages/JudgePage.tsx`(`load`·`judge`·`importPasted`·`stale`·`showAcl`)
  - `web/src/components/NetworkEditor.tsx`(삭제 단추들), `web/src/components/FlowForm.tsx`
  - `web/src/components/{AclEvidence,AclAudit,SuggestPanel}.tsx`, `web/src/{aclAudit,suggest}.ts`
  - `web/src/styles.css`(`.verdict*`·`.judge`·`.follow`·`.stale`)
- 다음을 바꾸고 싶으면 **먼저 요청한다**: 배너 문장, 되돌리기 동작(한 단계·직접 고치면 버림), 즉시 검사가 판정을 막지 않는다는 규칙, ACL 점검 펼침 조건.
- 화면이 판정·비교를 다시 계산하게 되면 **설계 위반이다.** 엔진이 준 값만 표시한다.

## 주의사항 / 미해결 이슈
- 관계없는 줄바꿈 변경 금지.
- **점검 ≠ 판정.** ACL 점검은 PASS/DENY를 만들거나 바꾸지 않는다. PASS/DENY는 `engine/`의 `verify`가 정한다(ADR-001).
- **추측하지 않는다.** 한도 초과·해석 못 한 줄 때문에 결론을 낼 수 없으면 "점검 못 함"이다. "문제 없음"으로 바꾸지 않는다.
- **과도함은 경고하지 않는다**(사용자 결정). 열린 범위를 사실로만 적는다.
- **양성은 통신 차단(`DENY`)이다**(사용자 확정, PR #17). 오탐 = 막힌다고 했는데 실제로 통함, 미탐 = 통한다고 했는데 실제로 막힘.
- **관측 ≠ 판정.** 무응답·filtered는 DENY의 증거가 아니다. 붙여넣은 원문은 저장하지 않는다.
- 앱은 기대값·정답·채점을 만들지 않는다(AGENTS.md). 기존 `expect`·`cases/*.json`을 바꾸지 않는다.
- 유니코드 숫자·긴 숫자로 `int()`를 부르면 이슈 #7·#9가 되돌아온다. 점검은 `parse_acl` 결과만 쓰므로 새 숫자 변환을 만들지 않는다.
- 이전 PR #12의 별도 버그(strict xfail 두 건), Hypothesis 하한 문제는 별도 후속 범위.
- PR #15·#16·#17 후속(위 이전 과제 기록)은 이번 범위가 아니다. 단 PR #15 후속 "예시 버튼 제목이 풀이 원인을 드러냄"은 critique에서도 다시 지적됐고, 사용자가 이번 범위 밖으로 정했다.
- **표시 ≠ 판정.** 판정기 개선은 엔진이 준 `result`·`comparison`·`problems`를 보여 주는 방식만 바꾼다.
- [HOME_HANDOFF.md](HOME_HANDOFF.md)는 2026-10-02 집 인계 시점 기록이다. 현재 상태는 이 문서가 기준이다.

설계: Claude (Claude Opus 5.5), 구현·테스트·기록: Codex (GPT-6)
