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
