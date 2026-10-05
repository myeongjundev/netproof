import json
import os
from pathlib import Path

import pytest

from netproof_api import create_app, database_url, engine_options
from netproof_api.models import ROLE_REVIEWER, User, db

CASE = json.loads((Path(__file__).resolve().parents[2] / "cases" / "synthetic-01-https-acl.json").read_text(encoding="utf-8"))


class Api:
    """브라우저처럼 쿠키를 들고 다니고, 화면이 붙이는 두 헤더를 붙인다."""

    def __init__(self, app):
        self.client = app.test_client()
        self.csrf = None

    def _headers(self, extra):
        headers = {"X-NetProof": "1"}
        if self.csrf:
            headers["X-CSRF-Token"] = self.csrf
        headers.update(extra or {})
        return headers

    def get(self, path, **kw):
        return self.client.get(path, **kw)

    def send(self, method, path, json=None, headers=None):
        response = self.client.open(path, method=method, json=json, headers=self._headers(headers))
        body = response.get_json(silent=True) or {}
        if isinstance(body, dict) and "csrf" in body:
            self.csrf = body["csrf"]
        return response

    def post(self, path, json=None, headers=None):
        return self.send("POST", path, json, headers)

    def patch(self, path, json=None, headers=None):
        return self.send("PATCH", path, json, headers)

    def delete(self, path, headers=None):
        return self.send("DELETE", path, None, headers)

    def register(self, nickname, password="correct horse 1"):
        return self.post("/api/auth/register", {"nickname": nickname, "password": password})

    def login(self, nickname, password="correct horse 1"):
        return self.post("/api/auth/login", {"nickname": nickname, "password": password})

    def save_case(self, title="HTTPS 막힘", claim=None, **extra):
        body = {"title": title, "network": CASE["network"], "flow": CASE["flow"], "claim": claim or CASE["claim"], **extra}
        return self.post("/api/cases", body)


@pytest.fixture(autouse=True)
def disable_inherited_security_log_environment(monkeypatch):
    """QA 도구를 직접 만드는 테스트도 외부 로그 대상으로 쓰지 않는다."""
    monkeypatch.delenv("NETPROOF_SECURITY_LOG", raising=False)
    monkeypatch.delenv("NETPROOF_SYSLOG", raising=False)


@pytest.fixture
def app(tmp_path):
    """기본은 임시 SQLite. NETPROOF_TEST_DATABASE_URL을 주면 같은 테스트를 PostgreSQL에서 돌린다(매번 표를 새로 만든다)."""
    url = os.environ.get("NETPROOF_TEST_DATABASE_URL")
    if not url:
        return create_app({"SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'test.db'}", "TESTING": True, "SECURITY_LOG": None, "SECURITY_SYSLOG": None})
    url = database_url(url)
    app = create_app({"SQLALCHEMY_DATABASE_URI": url, "SQLALCHEMY_ENGINE_OPTIONS": engine_options(url), "TESTING": True, "SECURITY_LOG": None, "SECURITY_SYSLOG": None})
    with app.app_context():
        db.drop_all()
    app.test_cli_runner().invoke(args=["init-db"])
    return app


@pytest.fixture
def api(app):
    return Api(app)


@pytest.fixture
def other(app):
    return Api(app)


@pytest.fixture
def reviewer(app):
    client = Api(app)
    client.register("검토자")
    with app.app_context():
        user = User.query.filter_by(nickname_key="검토자").first()
        user.role = ROLE_REVIEWER
        db.session.commit()
    return client
