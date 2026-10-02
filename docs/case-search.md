# 사례 목록 검색·필터·페이지

사례 게시판에서 제목·작성자·통신의 출발지/목적지 IP를 부분 검색한다. 네트워크 장비 내부 주소는 검색 대상이 아니다. 판정, 받은 답과 판정의 비교, 검토 확인, 실제 결과 출처, 내 사례 조건은 모두 함께 적용된다. 비교 필터는 실제 결과와의 비교가 아니라 저장된 `comparison`이다.

`GET /api/cases?page=1&per_page=20&q=HTTPS&result=DENY`는 로그인 후 사용할 수 있다. 응답은 `{items,total,page,per_page,pages}`다. 페이지당 기본 20개, 최대 100개이며 범위를 벗어난 페이지는 마지막 페이지로 보정한다. 결과가 없으면 `items=[]`, `total=0`, `page=pages=1`이다. 생성 시각 내림차순, 같은 시각에서는 id 내림차순이다.

| 인자 | 허용 값 |
|---|---|
| q | 최대 100자, 제목/작성자/flow src·dst 부분 검색. `%`, `_`, `/`는 문자 그대로 |
| mine | 0, 1 |
| result | PASS, DENY, UNSUPPORTED, INVALID |
| comparison | AGREE, DISAGREE, NOT_COMPARABLE, NO_CLAIM |
| confirmed | 0(미확인), 1(확인됨) |
| source | nmap, ping, device, other, none(출처 없음) |
| page | 1~1,000,000 |
| per_page | 1~100 |

빈 필터는 전체다. 잘못된 필터·페이지·너무 긴 검색어는 400이다. `page`와 `per_page`가 모두 없으면 기존 클라이언트용 배열 응답(최대 200개)을 유지한다.

새 DB와 기존 로컬 SQLite 모두 인덱스가 적용된다. 기존 배포 DB는 `.venv/Scripts/python -m flask --app server/wsgi.py init-db`를 다시 실행하면 된다. 데이터는 바꾸지 않고 없는 인덱스만 생성한다. 추가 인덱스는 생성 시각/id, 작성자/생성 시각/id, 판정/생성 시각/id다.

필터링·건수 계산·페이지 조회는 DB에서 수행하며 작성자도 함께 가져온다. 제목/작성자/IP 부분 검색과 임의의 복합 필터는 전체 스캔이 필요할 수 있다. OFFSET 페이지는 동시에 사례가 추가/삭제되면 중복·누락이 생길 수 있다. 페이지 간 스냅샷은 보장하지 않는다.

JSON 문자열 검색과 기존 인덱스 생성은 [SQLAlchemy JSON 문서](https://docs.sqlalchemy.org/en/20/core/type_basics.html#sqlalchemy.types.JSON.Comparator.as_string)와 [Index.create 문서](https://docs.sqlalchemy.org/en/20/core/metadata.html#sqlalchemy.schema.Index.create)를 참고했다. SQLite 실제 테스트와 PostgreSQL SQL 컴파일 확인을 구분하며, 배포 DB 연결 테스트는 별도로 필요하다.
