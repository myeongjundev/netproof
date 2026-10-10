from datetime import datetime

import pytest
from sqlalchemy import event, inspect
from sqlalchemy.dialects import postgresql
from sqlalchemy import select
from conftest import CASE

from netproof_api.models import Case, User, db, ensure_case_indexes


def test_actual_and_claim_filters_none_and_intersection(api, board):
    a, b, c = board
    with api.client.application.app_context():
        db.session.get(Case, a).claim = {"expected": "PASS", "kind": "ai"}
        db.session.get(Case, b).claim = {"expected": "DENY", "kind": "self"}
        db.session.get(Case, c).claim = None
        db.session.commit()
    for query, expected in (("actual=DENY", [a]), ("actual=PASS", []), ("actual=none", [c, b]),
                            ("claim_kind=ai", [a]), ("claim_kind=self", [b]), ("claim_kind=none", [c]),
                            ("claim_expected=PASS", [a]), ("claim_expected=DENY", [b]),
                            ("actual=DENY&claim_kind=ai&claim_expected=PASS&confirmed=1&mine=1&q=HTTPS", [a]),
                            ("actual=none&result=INVALID", [b])):
        assert ids(api.get(f"/api/cases?page=1&{query}")) == expected, query
    assert [item["id"] for item in api.get("/api/cases?claim_kind=self").get_json()] == [b]
    for query in ("actual=unknown", "claim_kind=human", "claim_expected=none", "actual=pass"):
        assert api.get(f"/api/cases?{query}").status_code == 400


@pytest.fixture
def board(app, api, other, reviewer):
    api.register("Alice")
    other.register("Bob")
    a = api.save_case("HTTPS 100%_safe/").get_json()["id"]
    b = other.save_case("다른 사례", network={"devices": [], "acls": {}}).get_json()["id"]
    c = api.save_case("SSH", flow={**CASE["flow"], "dst": "8.8.8.8"}).get_json()["id"]
    api.patch(f"/api/cases/{a}", {"actual": {"result": "DENY", "source": "ping"}})
    reviewer.post(f"/api/cases/{a}/confirm")
    with app.app_context():
        # 동일 생성 시각에서 id 정렬이 안정적인지 확인한다.
        Case.query.update({Case.created_at: datetime(2026, 10, 2)})
        db.session.commit()
    return a, b, c


def ids(response):
    assert response.status_code == 200
    return [item["id"] for item in response.get_json()["items"]]


def test_pagination_order_and_last_page(api, board):
    a, b, c = board
    first = api.get("/api/cases?page=1&per_page=2")
    assert ids(first) == [c, b]
    assert {key: first.get_json()[key] for key in ("total", "page", "per_page", "pages")} == {"total": 3, "page": 1, "per_page": 2, "pages": 2}
    last = api.get("/api/cases?page=999&per_page=2")
    assert ids(last) == [a]
    assert last.get_json()["page"] == 2
    # 기존 클라이언트의 배열 응답을 유지한다.
    assert [item["id"] for item in api.get("/api/cases").get_json()] == [c, b, a]


def test_search_title_author_and_both_ips(api, board):
    a, b, c = board
    for term, expected in (("https", [a]), ("alice", [c, a]), ("BOB", [b]),
                           ("10.10.10.10", [c, b, a]), ("8.8.8.8", [c]),
                           ("%_", [a]), ("/", [a]), ("不存在", [])):
        assert ids(api.get("/api/cases", query_string={"page": 1, "q": term})) == expected


def test_filters_and_intersection(api, other, board):
    a, b, c = board
    for query, expected in (("result=DENY", [a]), ("result=INVALID", [b]),
                            ("result=UNSUPPORTED", [c]), ("result=PASS", []),
                            ("comparison=DISAGREE", [a]), ("comparison=NOT_COMPARABLE", [c, b]),
                            ("confirmed=1", [a]), ("confirmed=0", [c, b]),
                            ("source=ping", [a]), ("source=none", [c, b]),
                            ("source=nmap", []), ("mine=1", [c, a]),
                            ("mine=1&result=DENY&source=ping&confirmed=1&q=Alice", [a]),
                            ("result=DENY&confirmed=0", [])):
        assert ids(api.get("/api/cases?page=1&" + query)) == expected
    assert ids(other.get("/api/cases?page=1&mine=1")) == [b]


@pytest.mark.parametrize("query", ["page=0", "page=-1", "page=abc", "page=1.5", "page=²", "page=" + "9" * 5000,
                                   "page=1000001", "per_page=0", "per_page=101", "per_page=", "mine=2",
                                   "result=FAIL", "comparison=wrong", "confirmed=yes", "source=bad", "q=" + "a" * 101])
def test_invalid_queries_are_400(api, query):
    api.register("Tester")
    assert api.get("/api/cases?" + query).status_code == 400


def test_empty_and_authentication(api):
    assert api.get("/api/cases?page=1&q=test").status_code == 401
    api.register("Tester")
    assert api.get("/api/cases?page=7").get_json() == {"items": [], "total": 0, "page": 1, "pages": 1, "per_page": 20}


def test_more_than_200_cases_and_bounded_queries(app, api):
    api.register("Tester")
    with app.app_context():
        owner = User.query.filter_by(nickname="Tester").one()
        db.session.add_all([Case(owner_id=owner.id, title=f"item {i}", network={}, flow={},
                                verdict={"result": "INVALID"}, result="INVALID", comparison="NO_CLAIM",
                                engine_version="0.1.4", created_at=datetime(2026, 10, 2)) for i in range(205)])
        db.session.commit()
        statements = []

        def record(conn, cursor, statement, parameters, context, executemany):
            statements.append(statement)

        event.listen(db.engine, "before_cursor_execute", record)
        try:
            response = api.get("/api/cases?page=11")
            assert len(response.get_json()["items"]) == 5
            assert response.get_json()["total"] == 205
            assert ids(api.get("/api/cases?page=1&q=item%20204")) == [205]
        finally:
            event.remove(db.engine, "before_cursor_execute", record)
        # count + 페이지 조회. 로그인 사용자 조회 외 작성자 N+1 SELECT는 없다.
        assert sum("FROM cases" in sql for sql in statements) == 4
        assert sum("FROM users" in sql for sql in statements) <= 2
        # 결과 조회당 users 조인 하나만 사용한다(count/auth 쿼리는 제외).
        list_queries = [sql for sql in statements if "FROM cases" in sql and "LIMIT" in sql]
        assert len(list_queries) == 2
        assert all(sql.count("JOIN users") == 1 for sql in list_queries)


def test_existing_table_index_upgrade_is_idempotent(app):
    with app.app_context():
        index = next(i for i in Case.__table__.indexes if i.name == "ix_cases_created_id")
        index.drop(bind=db.engine)
        ensure_case_indexes()
        ensure_case_indexes()
        assert "ix_cases_created_id" in {i["name"] for i in inspect(db.engine).get_indexes("cases")}
    result = app.test_cli_runner().invoke(args=["init-db"])
    assert result.exit_code == 0


def test_pass_agree_no_claim_and_source_filters(api):
    api.register("Tester")
    case_id = api.save_case("통과", network={**CASE["network"], "acls": {"101": ["permit ip any any"]}}).get_json()["id"]
    assert ids(api.get("/api/cases?page=1&result=PASS&comparison=AGREE")) == [case_id]
    api.patch(f"/api/cases/{case_id}", {"claim": None})
    assert ids(api.get("/api/cases?page=1&comparison=NO_CLAIM")) == [case_id]
    for source in ("nmap", "device", "other"):
        api.patch(f"/api/cases/{case_id}", {"actual": {"result": "PASS", "source": source}})
        assert ids(api.get(f"/api/cases?page=1&source={source}")) == [case_id]


def test_postgresql_json_search_compiles_without_sqlite_functions():
    stmt = select(Case.id).where(Case.flow["src"].as_string().ilike("%10.10%", escape="/"))
    sql = str(stmt.compile(dialect=postgresql.dialect()))
    assert "->>" in sql and "ILIKE" in sql
    assert "JSON_EXTRACT" not in sql


def test_sqlite_search_guarantees_ascii_case_insensitivity_only(app, api):
    with app.app_context():
        if db.engine.dialect.name != "sqlite":
            pytest.skip("SQLite Unicode lower 제한을 고정하는 테스트")
    api.register("Tester")
    case_id = api.save_case("Unicode ÄÖ UPPER").get_json()["id"]
    for text, expected in (("upper", [case_id]), ("ÄÖ", [case_id]), ("äö", [])):
        assert ids(api.get("/api/cases", query_string={"page": 1, "q": text})) == expected


def test_number_format_errors_explain_digit_limit(api):
    api.register("Tester")
    for query in ("page=00000001", "per_page=00000100", "page=" + "9" * 5000):
        response = api.get("/api/cases?" + query)
        assert response.status_code == 400
        assert "7자리 이하 ASCII 숫자" in response.get_json()["detail"]
    assert "1~100" in api.get("/api/cases?per_page=101").get_json()["detail"]


@pytest.fixture
def mismatch_board(app, api, other, reviewer):
    """필터 입력은 저장된 값이다. 서로 다른 축·제외값·소유자·확인 상태를 섞는다."""
    api.register("Alice")
    other.register("Bob")
    with app.app_context():
        alice = User.query.filter_by(nickname="Alice").one().id
        bob = User.query.filter_by(nickname="Bob").one().id
        reviewer_id = User.query.filter_by(nickname="검토자").one().id
        rows = [
            ("alice_deny_pass", alice, "DENY", "PASS", True, "AGREE"),
            ("alice_pass_deny", alice, "PASS", "DENY", False, "AGREE"),
            ("alice_pass_pass", alice, "PASS", "PASS", True, "DISAGREE"),
            ("bob_deny_deny", bob, "DENY", "DENY", True, "DISAGREE"),
            ("unsupported", alice, "UNSUPPORTED", "PASS", True, "NOT_COMPARABLE"),
            ("invalid", bob, "INVALID", "DENY", True, "NOT_COMPARABLE"),
            ("no_actual", alice, "PASS", None, True, "DISAGREE"),
            ("bob_deny_pass", bob, "DENY", "PASS", True, "AGREE"),
        ]
        saved = {}
        for name, owner, result, actual, confirmed, comparison in rows:
            item = Case(owner_id=owner, title=name, network={}, flow={}, verdict={"result": result},
                        result=result, comparison=comparison, engine_version="test", actual_result=actual,
                        actual_source="ping" if actual else None, created_at=datetime(2026, 10, 8),
                        confirmed_at=datetime(2026, 10, 8) if confirmed else None,
                        confirmed_by=reviewer_id if confirmed else None)
            db.session.add(item)
            db.session.flush()
            saved[name] = item.id
        db.session.commit()
        return saved


def test_actual_mismatch_excludes_matches_unknown_actual_and_out_of_scope(api, mismatch_board):
    cases = mismatch_board
    response = api.get("/api/cases?page=1&actual_mismatch=1")
    assert ids(response) == [cases["bob_deny_pass"], cases["alice_pass_deny"], cases["alice_deny_pass"]]
    assert response.get_json()["total"] == 3
    # AGREE/DISAGREE compares the received claim, not the observed actual result.
    assert ids(api.get("/api/cases?page=1&actual_mismatch=1&comparison=AGREE")) == ids(response)
    assert ids(api.get("/api/cases?page=1&actual_mismatch=1&comparison=DISAGREE")) == []
    assert ids(api.get("/api/cases?page=1&actual_mismatch=1&actual=none")) == []


def test_actual_mismatch_combines_owner_confirmed_result_and_search(api, other, mismatch_board):
    cases = mismatch_board
    assert ids(api.get("/api/cases?page=1&actual_mismatch=1&mine=1")) == [cases["alice_pass_deny"], cases["alice_deny_pass"]]
    assert ids(other.get("/api/cases?page=1&actual_mismatch=1&mine=1")) == [cases["bob_deny_pass"]]
    assert ids(api.get("/api/cases?page=1&actual_mismatch=1&mine=1&confirmed=1&result=DENY&q=alice")) == [cases["alice_deny_pass"]]
    assert ids(api.get("/api/cases?page=1&actual_mismatch=1&confirmed=0")) == [cases["alice_pass_deny"]]


@pytest.mark.parametrize("value", ["0", "x", "true", "１"])
def test_invalid_actual_mismatch_is_400(api, value):
    api.register("Tester")
    response = api.get(f"/api/cases?actual_mismatch={value}")
    assert response.status_code == 400
    assert response.get_json()["detail"] == "알 수 없는 actual_mismatch 필터입니다"


def test_confirmed_actual_mismatch_count_matches_dashboard(api, reviewer, mismatch_board):
    response = api.get("/api/cases?page=1&per_page=1&actual_mismatch=1&confirmed=1")
    board = reviewer.get("/api/dashboard").get_json()
    assert response.get_json()["total"] == board["mismatches_total"] == 2
    assert len(response.get_json()["items"]) == 1
    assert api.get("/api/dashboard").status_code == 403


def test_actual_mismatch_also_filters_legacy_array(api, mismatch_board):
    cases = mismatch_board
    response = api.get("/api/cases?actual_mismatch=1&mine=1")
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)
    assert [item["id"] for item in response.get_json()] == [cases["alice_pass_deny"], cases["alice_deny_pass"]]
