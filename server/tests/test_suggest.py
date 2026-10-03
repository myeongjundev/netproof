from conftest import CASE
from netproof_engine import suggest


def test_anonymous_response_no_db(api, app):
    from sqlalchemy import event
    from netproof_api.models import db
    with app.app_context():
        queries = []
        def record(*args):
            queries.append(args[2])
        event.listen(db.engine, "before_cursor_execute", record)
        try:
            response = api.post("/api/suggest", {"network": CASE["network"], "flow": CASE["flow"], "target": "PASS"})
        finally:
            event.remove(db.engine, "before_cursor_execute", record)
    assert response.status_code == 200 and response.get_json() == suggest(CASE["network"], CASE["flow"], "PASS")
    assert response.headers["Cache-Control"] == "no-store" and not queries


def test_target_shape_and_limits(api):
    assert api.post("/api/suggest", {}).get_json()["status"] == "INVALID"
    wrong_target = api.post("/api/suggest", {"target": "pass"})
    assert wrong_target.status_code == 200 and wrong_target.get_json()["status"] == "INVALID"
    assert api.post("/api/suggest", {"target": "PASS", "network": [], "flow": []}).status_code == 200
    assert api.post("/api/suggest", {"network": {"acls": {"a": ["remark"] * 501}}}).status_code == 422
    assert api.post("/api/suggest", {"network": {"devices": [{}] * 41}}).status_code == 422


def test_headers_csrf_and_size(api):
    assert api.client.post("/api/suggest", json={}).status_code == 403
    api.register("suggest-user")
    assert api.post("/api/suggest", {}, headers={"X-CSRF-Token": "bad"}).status_code == 403
    assert api.client.post("/api/suggest", json={}, headers={"X-NetProof": "1"}).status_code == 403
    assert api.post("/api/suggest", {"padding": "x" * 65536}).status_code == 413
