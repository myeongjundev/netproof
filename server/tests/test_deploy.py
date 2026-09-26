"""배포(Vercel + Supabase) 설정이 코드와 맞는지."""

import json
import runpy
from pathlib import Path

from sqlalchemy.pool import NullPool

from netproof_api import database_url, engine_options

ROOT = Path(__file__).resolve().parents[2]


def test_supabase_url_becomes_psycopg_with_ssl():
    url = database_url("postgresql://postgres.abc:pw@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres")
    assert url.startswith("postgresql+psycopg://") and url.endswith("?sslmode=require")
    assert database_url("postgres://u:p@h/db?application_name=x") == "postgresql+psycopg://u:p@h/db?application_name=x&sslmode=require"
    assert database_url("postgresql://u:p@h/db?sslmode=verify-full").endswith("sslmode=verify-full")


def test_serverless_postgres_does_not_pool_or_prepare():
    options = engine_options(database_url("postgresql://u:p@h/db"))
    assert options["poolclass"] is NullPool
    assert options["connect_args"] == {"prepare_threshold": None}
    assert engine_options("sqlite:///x.db") == {}


def test_vercel_entry_builds_the_app(monkeypatch, tmp_path):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'entry.db'}")
    app = runpy.run_path(str(ROOT / "api" / "index.py"))["app"]
    rules = {rule.rule for rule in app.url_map.iter_rules()}
    assert {"/api/verify", "/api/auth/login", "/api/cases", "/api/dashboard"} <= rules


def test_api_folder_has_only_the_entry_file():
    # Vercel은 api/ 안의 파이썬 파일을 하나하나 함수로 만든다.
    assert [p.name for p in (ROOT / "api").glob("**/*.py")] == ["index.py"]


def test_vercel_config_matches_layout():
    config = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
    assert config["outputDirectory"] == "web/dist"
    assert config["regions"] == ["icn1"]  # 서울 Supabase와 같은 지역
    assert config["rewrites"] == [{"source": "/api/(.*)", "destination": "/api/index"}]
    include = config["functions"]["api/index.py"]["includeFiles"]
    for folder in ("server/netproof_api", "engine/src", "cases"):
        assert folder in include and (ROOT / folder).is_dir()
    csp = next(h["value"] for h in config["headers"][0]["headers"] if h["key"] == "Content-Security-Policy")
    assert "frame-ancestors 'none'" in csp


def test_requirements_cover_server_imports():
    names = (ROOT / "requirements.txt").read_text(encoding="utf-8").lower()
    for package in ("flask==", "flask-sqlalchemy==", "argon2-cffi==", "psycopg[binary]=="):
        assert package in names


def test_init_db_on_sqlite(app):
    result = app.test_cli_runner().invoke(args=["init-db"])
    assert "표 3개 준비" in result.output


def test_postgres_tables_have_row_level_security(app):
    """PostgreSQL(Supabase)에서만 의미가 있다. NETPROOF_TEST_DATABASE_URL로 돌릴 때 확인된다."""
    import pytest
    from sqlalchemy import text

    from netproof_api.models import db

    with app.app_context():
        if db.engine.dialect.name != "postgresql":
            pytest.skip("SQLite에는 RLS가 없다")
        rows = db.session.execute(
            text("SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname IN ('users','sessions','cases')")
        ).all()
    assert sorted(rows) == [("cases", True, False), ("sessions", True, False), ("users", True, False)]
