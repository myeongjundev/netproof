# 배포: Vercel + Supabase

화면(`web/dist`)은 Vercel이 정적 파일로 내보내고, `/api/*`는 서버리스 함수 하나(`api/index.py` → `server/netproof_api`)가 받는다.
DB는 Supabase PostgreSQL을 **데이터베이스로만** 쓴다. 로그인은 직접 만든 것(Argon2id·서버 세션·CSRF)을 쓰고 Supabase Auth는 쓰지 않는다.

```
브라우저 ──▶ Vercel CDN: index.html, assets/*          (보안 헤더: vercel.json)
        └──▶ Vercel 함수: /api/*  ──▶ Supabase 연결 풀러(transaction, 6543) ──▶ PostgreSQL
                 Flask + 판정 엔진        NullPool, prepare 끔, sslmode=require
```

## 누가 무엇을 하나

가입과 비밀값 입력은 본인이 한다. 비밀값(DB 비밀번호, 연결 주소)은 저장소·채팅·스크린샷에 남기지 않는다.

| 순서 | 누가 | 할 일 |
|---|---|---|
| 1 | 본인 | Supabase 가입 → New project. 지역은 Northeast Asia (Seoul). DB 비밀번호는 비밀번호 관리자에 저장 |
| 2 | 본인 | Project → Connect → **Transaction pooler** 연결 주소(포트 6543)를 복사 |
| 3 | 본인 | 아래 "표 만들기"를 본인 터미널에서 실행 |
| 4 | 본인 | Supabase → Table Editor에서 `users`·`sessions`·`cases`에 RLS가 켜졌는지, Security Advisor에 "RLS disabled" 경고가 없는지 확인 |
| 5 | 본인 | Vercel 가입(GitHub로) → Add New → Project → `myeongjundev/netproof` 가져오기 → Environment Variables에 아래 두 값 → Deploy |
| 6 | 함께 | 배포 로그와 공개 주소 확인(판정기 · 가입 · 사례 저장 · 로그아웃) |
| 7 | 본인 | "검토자 지정" 실행 |

### 표 만들기 (3)

PowerShell, `netproof` 폴더에서. 주소는 이 창에만 잠깐 두고 지운다.

```powershell
$env:DATABASE_URL = "여기에 Transaction pooler 주소"
.venv\Scripts\python -m flask --app server/wsgi.py init-db
Remove-Item Env:DATABASE_URL
```

`표 3개 준비 (postgresql)`가 나오면 된다. `init-db`는 표를 만들고 세 표에 RLS를 켠다(정책은 만들지 않는다).
Supabase는 `public` 스키마의 표를 REST API(anon·authenticated 역할)로 자동으로 연다. RLS를 켜 두면 그 길로는 행을 하나도 읽거나 쓸 수 없고,
표 소유자로 접속하는 이 서버만 쓴다. 2026-09-26에 PostgreSQL 17 컨테이너에서 확인한 결과: 소유자는 행 1개를 보고, 표 권한까지 받은 anon은 0행을 보며,
검토자 계정 추가는 `new row violates row-level security policy`로 거절됐다. 쓰지 않는 Data API는 Supabase 설정에서 꺼 두면 한 겹 더 막힌다.

### Vercel 환경 변수 (5)

| 이름 | 값 |
|---|---|
| `DATABASE_URL` | Transaction pooler 주소(2번). `postgresql://`로 시작하는 그대로 넣는다. 서버가 psycopg 주소로 바꾸고 `sslmode=require`를 붙인다 |
| `NETPROOF_SECURE_COOKIES` | `1` (세션 쿠키에 Secure) |

빌드 설정은 `vercel.json`에 있어 Framework Preset은 Other 그대로 둔다.

### 검토자 지정 (7)

웹에는 등급을 올리는 길이 없다. 먼저 배포된 사이트에서 가입한 뒤, 본인 터미널에서:

```powershell
$env:DATABASE_URL = "여기에 Transaction pooler 주소"
.venv\Scripts\python -m flask --app server/wsgi.py make-reviewer 내닉네임
Remove-Item Env:DATABASE_URL
```

## 운영 주의

- **Supabase 무료 프로젝트는 한동안 쓰지 않으면 일시 정지될 수 있다.** 사용자 테스트 기간에는 주기적으로 접속하고, 정지되면 대시보드에서 다시 켠다(현재 정책은 가입할 때 확인).
- **첫 배포는 로그를 꼭 본다.** `vercel.json`의 `includeFiles`(서버·엔진·사례 폴더를 함수에 싣는 설정)는 로컬에서 흉내 낼 수 없어, 함수가 `netproof_api`를 못 찾으면 여기부터 본다.
- DB 비밀번호를 바꾸면 Vercel의 `DATABASE_URL`도 바꾸고 다시 배포한다.
- 서버리스라 요청마다 DB에 새로 연결한다(NullPool). 동시 접속이 많아지면 Supabase 풀러가 연결 수를 맞춘다.

## 로컬에서 같은 조건으로 시험

PostgreSQL 컨테이너를 띄우고 서버 테스트 전체를 돌릴 수 있다(SSL 없는 로컬이면 주소에 `sslmode=disable`).

```bash
cd server && NETPROOF_TEST_DATABASE_URL="postgresql://user:pw@127.0.0.1:55432/db?sslmode=disable" ../.venv/Scripts/python -m pytest -q
```
