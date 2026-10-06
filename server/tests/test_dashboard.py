from datetime import datetime

import pytest
from sqlalchemy import event

from netproof_api.models import Case, User, db


@pytest.fixture
def samples(app, reviewer):
    # 통계용 저장 행. 네트워크를 다시 판정하는 테스트가 아니다.
    rows = [(kind, predicted, predicted, actual, True)
            for kind in ("ai", "self")
            for predicted, actual in (("DENY", "DENY"), ("DENY", "PASS"), ("PASS", "DENY"), ("PASS", "PASS"))]
    rows += [("ai", "DENY", "UNSUPPORTED", "PASS", True),
             ("ai", "PASS", "INVALID", "DENY", True),
             (None, "DENY", "PASS", "PASS", True),
             ("ai", "DENY", "DENY", None, True),
             ("ai", "DENY", "DENY", "DENY", False),
             (None, None, "INVALID", None, False)]
    with app.app_context():
        owner = User.query.first()
        for i, (kind, predicted, result, actual, confirmed) in enumerate(rows):
            db.session.add(Case(owner_id=owner.id, title=f"통계 {i}", network={}, flow={},
                                claim={"kind": kind, "expected": predicted}, verdict={"result": result},
                                result=result, comparison="NO_CLAIM", engine_version="0.1.4",
                                actual_result=actual, actual_source="other" if actual else None,
                                confirmed_at=datetime(2026, 10, 2) if confirmed else None))
        db.session.commit()
    return rows


def test_axes_direction_denominators_exclusions_and_compatibility(reviewer, samples):
    board = reviewer.get("/api/dashboard").get_json()
    assert board["confusion"]["positive"] == "DENY"
    ai, human, engine = board["confusion"]["axes"]
    assert [axis["axis"] for axis in (ai, human, engine)] == ["ai", "self", "engine"]
    assert [ai[key] for key in ("tp", "fp", "fn", "tn", "total")] == [1, 2, 2, 1, 6]
    assert [human[key] for key in ("tp", "fp", "fn", "tn", "total")] == [1, 1, 1, 1, 4]
    assert [engine[key] for key in ("tp", "fp", "fn", "tn", "total")] == [2, 2, 2, 3, 9]
    for axis, missing in ((ai, 5), (human, 7), (engine, 2)):
        assert axis["excluded"] == {"not_confirmed": 2, "no_actual": 1, "no_prediction": missing}
        assert sum(axis[key] for key in ("tp", "fp", "fn", "tn")) == axis["total"]
        assert axis["total"] + sum(axis["excluded"].values()) == board["total"] == 14
    assert (board["confirmed"], board["unsupported"], board["invalid"]) == (12, 1, 2)
    assert board["agree"] == engine["tp"] + engine["tn"] == 5
    assert board["confirmed_in_scope"] == engine["total"]
    assert board["ai_confirmed"] == ai["total"]
    assert board["ai_wrong"] == ai["fp"] + ai["fn"]
    assert board["mismatches_total"] == 4
    assert len(board["mismatches"]) == 4


def test_every_cell_matches_filtered_list(reviewer, samples):
    axes = reviewer.get("/api/dashboard").get_json()["confusion"]["axes"]
    for axis in axes:
        for key, predicted, actual in (("tp", "DENY", "DENY"), ("fp", "DENY", "PASS"),
                                       ("fn", "PASS", "DENY"), ("tn", "PASS", "PASS")):
            query = {"page": "1", "confirmed": "1", "actual": actual}
            query.update({"result": predicted} if axis["axis"] == "engine" else
                         {"claim_kind": axis["axis"], "claim_expected": predicted})
            response = reviewer.get("/api/cases", query_string=query)
            assert response.status_code == 200
            assert response.get_json()["total"] == axis[key], (axis["axis"], key)


def test_empty_and_access(api, reviewer):
    assert api.get("/api/dashboard").status_code == 401
    api.register("일반")
    assert api.get("/api/dashboard").status_code == 403
    board = reviewer.get("/api/dashboard").get_json()
    assert board["total"] == board["mismatches_total"] == 0
    assert board["mismatches"] == []
    assert len(board["confusion"]["axes"]) == 3
    for axis in board["confusion"]["axes"]:
        assert axis["total"] == sum(axis["excluded"].values()) == 0


def test_mismatches_cap_order_and_fixed_query_count(app, reviewer):
    def add(count):
        with app.app_context():
            owner = User.query.first()
            db.session.add_all([Case(owner_id=owner.id, title=f"오탐 {i}", network={}, flow={}, claim=None,
                                     verdict={"result": "DENY"}, result="DENY", comparison="NO_CLAIM",
                                     engine_version="0.1.4", actual_result="PASS", actual_source="other",
                                     confirmed_at=datetime(2026, 10, 2), created_at=datetime(2026, 10, 2))
                                for i in range(count)])
            db.session.commit()

    def request():
        statements = []
        def record(conn, cursor, statement, parameters, context, executemany):
            statements.append(statement)
        with app.app_context():
            event.listen(db.engine, "before_cursor_execute", record)
            try:
                board = reviewer.get("/api/dashboard").get_json()
            finally:
                event.remove(db.engine, "before_cursor_execute", record)
        return board, statements

    add(3)
    first, small = request()
    add(27)
    board, large = request()
    assert len(small) == len(large) <= 5
    assert first["mismatches_total"] == 3
    assert board["mismatches_total"] == 30 and len(board["mismatches"]) == 20
    ids = [item["id"] for item in board["mismatches"]]
    assert ids == list(range(30, 10, -1))
    # 집계는 무거운 JSON을 선택하지 않으며 목록은 LIMIT와 owner 조인을 쓴다.
    aggregate = next(sql for sql in large if "GROUP BY" in sql)
    assert all(f"cases.{key}" not in aggregate for key in ("network", "flow", "verdict"))
    assert any("LIMIT" in sql and "JOIN users" in sql for sql in large)


def add_cause_rows(app, verdicts, comparison="DISAGREE", kind="ai", created_at=None):
    with app.app_context():
        owner = User.query.first()
        db.session.add_all([Case(owner_id=owner.id, title=f"원인 {i}", network={}, flow={},
                                claim={"kind": kind, "expected": "PASS"}, verdict=verdict,
                                result=verdict.get("result", "DENY") if isinstance(verdict, dict) else "DENY",
                                comparison=comparison, engine_version="0.1.4",
                                created_at=created_at or datetime(2026, 10, 6))
                           for i, verdict in enumerate(verdicts)])
        db.session.commit()


def blocked(reason=None, direction="forward", step=None, seq=None):
    return {"result": "DENY", direction: {"delivered": False, "reason": reason},
            "decisive": {"step": step, "rule_seq": seq} if step else None}


def assert_cause_partition(board):
    stats = board["causes"]
    assert stats["disagree_total"] + sum(stats["excluded"].values()) == board["total"]
    assert sum(row["count"] for row in stats["top"]) + stats["rest"] + stats["other"]["count"] == stats["denominator"]
    assert sum(stats["claim_kinds"].values()) == stats["disagree_total"]


def test_causes_sort_ties_rest_other_and_exclusions(app, reviewer):
    # 8 known tags, 2 unclassified; no actual result or review confirmation.
    verdicts = [blocked(step="acl_in", seq=1), blocked(step="acl_out"),
                blocked("경로 없음", "return"), blocked("기본 게이트웨이 없음"),
                blocked("다음 홉 없음"), blocked("호스트가 전달하지 않음"),
                blocked("라우팅 루프"), {"result": "PASS"}, {}, []]
    add_cause_rows(app, verdicts)
    add_cause_rows(app, [blocked("라우팅 루프", "return")] * 2, kind="self")
    add_cause_rows(app, [blocked("경로 없음", "return")], kind=None)
    for comparison in ("AGREE", "NO_CLAIM", "NOT_COMPARABLE"):
        add_cause_rows(app, [{"result": "UNSUPPORTED"}], comparison=comparison)
    board = reviewer.get("/api/dashboard").get_json()
    stats = board["causes"]
    assert_cause_partition(board)
    assert stats["denominator"] == stats["disagree_total"] == 13
    assert stats["excluded"] == {"agree": 1, "no_claim": 1, "not_comparable": 1}
    assert stats["claim_kinds"] == {"ai": 10, "self": 2, "unknown": 1}
    assert [row["tag"] for row in stats["top"]] == ["routing_loop", "no_route", "acl_rule", "acl_implicit", "no_gateway"]
    assert stats["top"][:2] == [{"tag": "routing_loop", "count": 3, "return_count": 2},
                                {"tag": "no_route", "count": 2, "return_count": 2}]
    assert stats["rest"] == 3 and stats["other"]["count"] == 2
    assert stats["limited"] is False
    assert board["confirmed"] == board["confusion"]["axes"][2]["total"] == 0


def test_causes_empty(reviewer):
    board = reviewer.get("/api/dashboard").get_json()
    assert_cause_partition(board)
    stats = board["causes"]
    assert stats["denominator"] == stats["disagree_total"] == stats["rest"] == stats["other"]["count"] == 0
    assert stats["top"] == [] and stats["limited"] is False


@pytest.mark.parametrize("count,limited", [(2000, False), (2001, True)])
def test_causes_limit_recent_timestamp_then_id_and_projection(app, reviewer, count, limited):
    # Newer timestamp beats larger id. At equal timestamps, larger id wins.
    add_cause_rows(app, [blocked("경로 없음", "return")], created_at=datetime(2026, 10, 7))
    add_cause_rows(app, [blocked(step="acl_in", seq=1)] * (count - 1))
    statements = []
    with app.app_context():
        def record(conn, cursor, statement, parameters, context, executemany):
            statements.append((statement, parameters))
        event.listen(db.engine, "before_cursor_execute", record)
        try:
            board = reviewer.get("/api/dashboard").get_json()
        finally:
            event.remove(db.engine, "before_cursor_execute", record)
    stats = board["causes"]
    assert_cause_partition(board)
    assert stats["denominator"] == stats["limit"] == 2000
    assert stats["disagree_total"] == count and stats["limited"] is limited
    assert stats["top"] == [{"tag": "acl_rule", "count": 1999, "return_count": 0},
                            {"tag": "no_route", "count": 1, "return_count": 1}]
    sql, parameters = next((sql, params) for sql, params in statements if sql.startswith("SELECT cases.id AS cases_id, cases.result"))
    assert "cases.verdict" in sql and "LIMIT" in sql and "2000" in str(parameters)
    assert all(f"cases.{key}" not in sql for key in ("network", "flow", "claim"))
    assert "cases.comparison =" in sql and "DISAGREE" in parameters
    assert "cases.created_at DESC, cases.id DESC" in sql


def test_causes_equal_timestamp_boundary_uses_latest_ids(app, reviewer):
    add_cause_rows(app, [blocked("경로 없음", "return")])
    add_cause_rows(app, [blocked(step="acl_in", seq=1)] * 2000)
    board = reviewer.get("/api/dashboard").get_json()
    assert_cause_partition(board)
    assert board["causes"]["top"] == [{"tag": "acl_rule", "count": 2000, "return_count": 0}]


def test_detail_cause_from_saved_verdict_and_list_unchanged(api):
    assert api.register("원인작성자").status_code == 201
    response = api.save_case(claim={"expected": "PASS", "kind": "ai"})
    assert response.status_code == 201
    detail = response.get_json()
    assert detail["cause"] == {"tag": "acl_rule", "direction": "forward"}
    assert api.get(f"/api/cases/{detail['id']}").get_json()["cause"] == detail["cause"]
    assert "cause" not in api.get("/api/cases").get_json()[0]


def test_causes_use_saved_comparison_without_rejudging(app, reviewer, monkeypatch):
    add_cause_rows(app, [{"result": "PASS"}])
    monkeypatch.setattr("netproof_api.cases.verify", lambda *args: pytest.fail("must not rejudge"))
    board = reviewer.get("/api/dashboard").get_json()
    assert board["causes"]["top"] == [{"tag": "no_block", "count": 1, "return_count": 0}]


def test_legacy_verdict_missing_result_is_other_in_dashboard_and_detail(app, reviewer):
    add_cause_rows(app, [{"decisive": {"step": "acl_in", "rule_seq": 1}}])
    board = reviewer.get("/api/dashboard").get_json()
    assert_cause_partition(board)
    assert board["causes"]["top"] == []
    assert board["causes"]["other"]["count"] == 1
    assert reviewer.get("/api/cases/1").get_json()["cause"] == {"tag": "other", "direction": "forward"}


def test_qa_cause_example_and_cleanup():
    from test_qa_local import qa

    with qa.seeded_qa() as environment:
        directory = environment.directory
        qa.seed_cause_example(environment)
        client = environment.app.test_client()
        response = qa._request(client, "POST", "/api/auth/login", {
            "nickname": "qa_reviewer", "password": environment.passwords["qa_reviewer"],
        })
        assert response["user"]["role"] == "reviewer"
        board = client.get("/api/dashboard").get_json()
        assert_cause_partition(board)
        assert board["total"] == 5 and board["causes"]["denominator"] == 2
        assert board["causes"]["top"] == [{"tag": "acl_rule", "count": 1, "return_count": 0},
                                            {"tag": "no_route", "count": 1, "return_count": 1}]
        assert board["causes"]["excluded"] == {"agree": 1, "no_claim": 2, "not_comparable": 0}
        assert board["causes"]["claim_kinds"] == {"ai": 2, "self": 0, "unknown": 0}
    assert not directory.exists()
