from conftest import CASE
from netproof_engine import acl_audit


def test_anonymous_response_engine_and_no_db(api, app):
    from sqlalchemy import event
    from netproof_api.models import db
    with app.app_context():
        queries = []
        def record(*args):
            queries.append(args[2])
        event.listen(db.engine, "before_cursor_execute", record)
        try:
            response = api.post("/api/acl-audit", {"network": CASE["network"]})
        finally:
            event.remove(db.engine, "before_cursor_execute", record)
    assert response.status_code == 200
    assert response.get_json() == acl_audit(CASE["network"])
    assert response.headers["Cache-Control"] == "no-store"
    assert not queries


def test_invalid_and_limits(api):
    assert api.post("/api/acl-audit", {"network": None}).get_json()["status"] == "INVALID"
    response = api.post("/api/acl-audit", {"network": {"acls": {"a": ["permit ip any any"] * 501}}})
    assert response.status_code == 422 and "500" in response.get_json()["detail"]
    assert api.post("/api/acl-audit", {"network": {"devices": [{}] * 41}}).status_code == 422


def test_guards_and_request_size(api):
    assert api.client.post("/api/acl-audit", json={"network": {}}).status_code == 403
    api.register("audit-user")
    assert api.post("/api/acl-audit", {"network": {}}, headers={"X-CSRF-Token": "bad"}).status_code == 403
    assert api.post("/api/acl-audit", {"network": {}}).status_code == 200
    assert api.post("/api/acl-audit", {"network": {}, "padding": "x" * 65536}).status_code == 413
