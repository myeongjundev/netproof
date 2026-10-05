# 배포: Vercel + Supabase

화면(`web/dist`)은 Vercel이 정적 파일로 내보내고, `/api/*`는 서버리스 함수 하나(`api/index.py` → `server/netproof_api`)가 받는다.
DB는 Supabase PostgreSQL을 **데이터베이스로만** 쓴다. 로그인은 직접 만든 것(Argon2id·서버 세션·CSRF)을 쓰고 Supabase Auth는 쓰지 않는다.

```
브라우저 ──▶ Vercel CDN: index.html, assets/*          (보안 헤더: vercel.json)
        └──▶ Vercel 함수: /api/*  ──▶ Supabase 연결 풀러(transaction, 6543) ──▶ PostgreSQL
                 Flask + 판정 엔진        NullPool, prepare 끔, sslmode=require
```

## 지금 배포 상태 (2026-10-06)

- 공개 주소: https://netproof-vert.vercel.app. `main`에 병합하면 Vercel이 바로 다시 배포한다.
- DB: Supabase 무료 한도가 **사람 한 명당 켜진 무료 프로젝트 2개**라서 새 프로젝트를 만들지 못했다(조직을 새로 만들어도 같다). 그래서 아래 1~4단계 대신 8번 과제 프로젝트(t08, 서울) 안에 NetProof 전용 계정과 스키마를 두었다. 아래 "공유 프로젝트에 두기"를 본다.
- Vercel 환경 변수 `DATABASE_URL`은 이 전용 계정의 주소다. Production에만 두기를 권한다(5).

## 누가 무엇을 하나

가입과 비밀값 입력은 본인이 한다. 비밀값(DB 비밀번호, 연결 주소)은 저장소·채팅·스크린샷에 남기지 않는다.

| 순서 | 누가 | 할 일 |
|---|---|---|
| 1 | 본인 | Supabase(8번 과제 때 가입한 계정) → New project. 지역은 Northeast Asia (Seoul). DB 비밀번호는 비밀번호 관리자에 저장. 무료 요금제는 동시에 켜 둘 수 있는 프로젝트 수에 제한이 있으니 8번 과제 프로젝트와 함께 둘 수 있는지 확인. 한도가 찼으면 아래 "공유 프로젝트에 두기" |
| 2 | 본인 | Project → Connect → **Transaction pooler** 연결 주소(포트 6543)를 복사 |
| 3 | 본인 | 아래 "표 만들기"를 본인 터미널에서 실행 |
| 4 | 본인 | Supabase → Table Editor에서 `users`·`sessions`·`cases`에 RLS가 켜졌는지, Security Advisor에 "RLS disabled" 경고가 없는지 확인. 8번 과제처럼 **Data API를 끈다**(이 앱은 쓰지 않는다) |
| 5 | 본인 | Vercel(8번 과제와 같은 계정) → Add New → Project → `myeongjundev/netproof` 가져오기 → Environment Variables에 아래 두 값 → Deploy |
| 6 | 함께 | 배포 로그와 공개 주소 확인(판정기 · 가입 · 사례 저장 · 로그아웃) |
| 7 | 본인 | "검토자 지정" 실행 |

### 표 만들기 (3)

PowerShell, `netproof` 폴더에서. 주소는 첫 줄이 띄우는 가려진 입력 칸에 붙여넣는다. 명령 기록(PSReadLine)에 남지 않게 하려는 것이다. 끝나면 지운다.

```powershell
$env:DATABASE_URL = [System.Net.NetworkCredential]::new('', (Read-Host 'DATABASE_URL' -AsSecureString)).Password
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

- 가져오기 화면이 폴더(engine·server·web)를 보고 Application Preset을 `Services`로 고를 수 있다. **`Other`로 바꾼다.** 폴더별 `Import single project`는 누르지 않는다.
- `netproof.vercel.app`은 이미 다른 사람이 쓰고 있어서 Vercel이 `netproof-vert.vercel.app`을 붙였다. 프로젝트 화면의 Domains에 나오는 주소가 공개 주소다. `…-myeongjundev.vercel.app`과 배포별 주소는 Vercel 로그인으로 보호된다.
- `DATABASE_URL`은 **Production에만** 둔다(Settings → Environment Variables → Edit). Preview에도 있으면 브랜치마다 만들어지는 미리보기 배포가 운영 DB에 붙는다. 미리보기에서도 API를 쓰려면 Preview에만 `sqlite:////tmp/netproof.db`를 넣는다(함수는 `/tmp`에만 쓸 수 있다). 이 설정은 시험하지 않았다.

빌드 설정은 `vercel.json`에 있어 Framework Preset은 Other 그대로 둔다. 함수 지역은 `vercel.json`의 `regions`로 서울(`icn1`)에 고정했다 — 기본값(미국 `iad1`)이면 서울 Supabase까지 요청마다 태평양을 건넌다(8번 과제 `docs/evidence/11-production-startup.md`에서 겪은 일). 배포 뒤 Settings → Functions에서 지역이 Seoul인지 본다.

### 검토자 지정 (7)

웹에는 등급을 올리는 길이 없다. 먼저 배포된 사이트에서 가입한 뒤, 본인 터미널에서 실행한다. 주소는 `DATABASE_URL`과 같다(공유 프로젝트 방식이면 `netproof` 계정 주소).

```powershell
$env:DATABASE_URL = [System.Net.NetworkCredential]::new('', (Read-Host 'DATABASE_URL' -AsSecureString)).Password
.venv\Scripts\python -m flask --app server/wsgi.py make-reviewer 내닉네임
Remove-Item Env:DATABASE_URL
```

## 공유 프로젝트에 두기 (무료 한도가 찼을 때)

2026-10-06 실제 배포가 이 방식이다. 이미 있는 Supabase 프로젝트(t08) 안에 NetProof 전용 계정과 스키마를 만든다. 그 프로젝트의 표·비밀번호·설정은 바꾸지 않는다.

| 항목 | 내용 |
|---|---|
| 계정 | `netproof`. 로그인 전용이고 자기 비밀번호를 쓴다. 풀러 사용자 이름은 `netproof.<프로젝트ID>`다(Supabase 풀러는 직접 만든 계정도 받는다) |
| 스키마 | `netproof`. 소유는 `postgres`이고 `netproof`에 USAGE·CREATE를 준다. 계정 기본 `search_path = netproof` |
| 표 | `netproof` 계정으로 `init-db`를 하면 표 3개가 `netproof` 소유로 생기고 RLS가 켜진다 |
| 격리 | `netproof` 계정은 `public`의 다른 표를 읽지 못한다(권한 없음). Data API는 노출하기로 고른 스키마(기본 `public`)만 열고, t08은 Data API도 꺼져 있다 |

1. **비밀번호와 확인값.** 비밀번호 관리자에서 영문·숫자 비밀번호를 만든다(특수문자는 연결 주소를 깨뜨릴 수 있다). SQL에는 원문 대신 SCRAM-SHA-256 확인값을 넣는다. SQL Editor 기록과 DB 로그에 원문이 남지 않게 하려는 것이다. 아래 코드를 **저장소 밖에** `scram.py`로 저장하고 `.venv\Scripts\python <경로>\scram.py`로 실행한다. 비밀번호는 가려서 받고 확인값만 출력한다.

   ```python
   import base64, getpass, hashlib, hmac, secrets
   password = getpass.getpass("netproof 비밀번호(입력은 보이지 않음): ").encode()
   salt = secrets.token_bytes(16)
   salted = hashlib.pbkdf2_hmac("sha256", password, salt, 4096)
   key = lambda name: hmac.new(salted, name, "sha256").digest()
   b64 = lambda raw: base64.b64encode(raw).decode()
   print(f"SCRAM-SHA-256$4096:{b64(salt)}${b64(hashlib.sha256(key(b'Client Key')).digest())}:{b64(key(b'Server Key'))}")
   ```

2. **그 프로젝트의 SQL Editor에서 실행.** 여러 번 실행해도 된다. 계정이 있으면 비밀번호만 바꾼다. `GRANT netproof TO postgres`처럼 계정을 `postgres`에게 다시 넘기는 문장은 넣지 않는다(Supabase PostgreSQL 17.6에서 막힐 수 있다).

   ```sql
   DO $$
   BEGIN
     IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'netproof') THEN
       ALTER ROLE netproof WITH LOGIN PASSWORD '<1번 확인값>';
     ELSE
       CREATE ROLE netproof WITH LOGIN PASSWORD '<1번 확인값>';
     END IF;
   END
   $$;
   CREATE SCHEMA IF NOT EXISTS netproof;
   GRANT USAGE, CREATE ON SCHEMA netproof TO netproof;
   ```

3. **연결 주소.** Connect → Direct → Transaction pooler 주소에서 사용자 이름의 `postgres.`를 `netproof.`로, `[YOUR-PASSWORD]`를 1번 비밀번호로 바꾼다. 모양은 `postgresql://netproof.<프로젝트ID>:<비밀번호>@<풀러 호스트>:6543/postgres`다.
4. **표 만들기.** 위 "표 만들기 (3)"를 이 주소로 실행한다. 스키마 이름이 계정 이름과 같아서 기본 경로(`"$user", public, extensions`)만으로도 표가 `netproof` 스키마에 생긴다. 2026-10-06에는 `netproof` 계정으로 `ALTER ROLE CURRENT_USER SET search_path = netproof`도 실행해 두었다.
5. **확인(SQL Editor).** 표 3개, 소유 `netproof`, `rls` true가 나오면 된다.

   ```sql
   select c.relname, pg_get_userbyid(c.relowner) as owner, c.relrowsecurity as rls
   from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'netproof' and c.relkind = 'r' order by 1;
   ```

- 그 프로젝트를 멈추거나 지우면 NetProof도 멈춘다. 그 프로젝트의 DB 비밀번호를 바꿔도 NetProof는 영향이 없다.
- `netproof` 비밀번호를 바꿀 때는 1~3을 다시 하고 Vercel `DATABASE_URL`을 바꾼 뒤 다시 배포한다. 바꾼 직후에는 풀러가 옛 자격 정보를 잠깐 쓸 수 있다.

## 운영 주의

- **Supabase 무료 프로젝트는 한동안 쓰지 않으면 일시 정지될 수 있다.** 사용자 테스트 기간에는 주기적으로 접속하고, 정지되면 대시보드에서 다시 켠다(현재 정책은 가입할 때 확인).
- **첫 배포는 로그를 꼭 본다.** `vercel.json`의 `includeFiles`(서버·엔진·사례 폴더를 함수에 싣는 설정)는 로컬에서 흉내 낼 수 없어, 함수가 `netproof_api`를 못 찾으면 여기부터 본다.
- DB 비밀번호를 바꾸면 Vercel의 `DATABASE_URL`도 바꾸고 다시 배포한다.
- 8번 과제(Java·Hibernate)는 준비된 문장 때문에 Session pooler(5432)를 썼다. 이 앱은 prepare를 꺼서 Transaction pooler(6543)로 된다. 둘 중 무엇이든 동작하지만 서버리스에는 Transaction pooler가 맞다.
- 서버리스라 요청마다 DB에 새로 연결한다(NullPool). 동시 접속이 많아지면 Supabase 풀러가 연결 수를 맞춘다.

## 로컬에서 같은 조건으로 시험

PostgreSQL 컨테이너를 띄우고 서버 테스트 전체를 돌릴 수 있다(SSL 없는 로컬이면 주소에 `sslmode=disable`).

```bash
cd server && NETPROOF_TEST_DATABASE_URL="postgresql://user:pw@127.0.0.1:55432/db?sslmode=disable" ../.venv/Scripts/python -m pytest -q
```
