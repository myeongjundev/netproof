"""NetProof 서버(Flask). 판정은 엔진만 하고(ADR-001), 이 층은 로그인·사례·크기 제한·보안 헤더를 맡는다."""

from __future__ import annotations

import os
from pathlib import Path

import click
from flask import Flask, jsonify, request, send_from_directory
from sqlalchemy import text
from sqlalchemy.pool import NullPool
from werkzeug.exceptions import HTTPException

from . import auth, cases
from .models import ROLE_REVIEWER, ROLE_USER, User, db, ensure_case_indexes

ROOT = Path(__file__).resolve().parents[2]

SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; "
        "script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    ),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
}


def database_url(raw: str) -> str:
    """Supabase가 주는 postgres(ql):// 주소를 psycopg 3 드라이버 주소로 바꾸고 SSL을 강제한다."""
    for prefix in ("postgres://", "postgresql://"):
        if raw.startswith(prefix):
            raw = "postgresql+psycopg://" + raw[len(prefix):]
    if raw.startswith("postgresql+psycopg://") and "sslmode=" not in raw:
        raw += ("&" if "?" in raw else "?") + "sslmode=require"
    return raw


def engine_options(url: str) -> dict:
    """서버리스(Vercel)에서는 요청마다 프로세스가 새로 뜬다. 연결을 붙잡아 두지 않고(NullPool),
    Supabase 연결 풀러(transaction 모드)가 준비된 문장을 못 쓰므로 prepare를 끈다."""
    if url.startswith("postgresql+psycopg://"):
        return {"poolclass": NullPool, "connect_args": {"prepare_threshold": None}}
    return {}


def create_app(overrides: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    url = database_url(os.environ.get("DATABASE_URL", f"sqlite:///{ROOT / 'instance' / 'netproof.db'}"))
    app.config.update(
        SQLALCHEMY_DATABASE_URI=url,
        SQLALCHEMY_ENGINE_OPTIONS=engine_options(url),
        MAX_CONTENT_LENGTH=64 * 1024,
        SECURE_COOKIES=os.environ.get("NETPROOF_SECURE_COOKIES", "0") == "1",
        CASES_DIR=str(ROOT / "cases"),
        WEB_DIST=str(ROOT / "web" / "dist"),
    )
    if overrides:
        app.config.update(overrides)
    local_sqlite = app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:///")
    if local_sqlite:
        Path(app.config["SQLALCHEMY_DATABASE_URI"].removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    if local_sqlite:  # 로컬 개발 편의. 배포 DB는 flask init-db로 한 번만 만든다.
        with app.app_context():
            db.create_all()
            ensure_case_indexes()

    app.before_request(auth.csrf_guard)
    app.register_blueprint(auth.bp)
    app.register_blueprint(cases.bp)

    @app.after_request
    def headers(response):
        for name, value in SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)
        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.errorhandler(HTTPException)
    def http_error(exc: HTTPException):
        if request.path.startswith("/api/"):
            message = "입력이 너무 큽니다(64KB 제한)" if exc.code == 413 else (exc.description or exc.name)
            return jsonify({"detail": message}), exc.code
        return exc

    dist = Path(app.config["WEB_DIST"])

    @app.get("/")
    def index():
        return send_from_directory(dist, "index.html")

    @app.get("/assets/<path:name>")
    def assets(name: str):
        return send_from_directory(dist / "assets", name)

    @app.cli.command("init-db")
    def init_db():
        """표를 만든다. PostgreSQL(Supabase)이면 행 수준 보안(RLS)을 켜서
        Supabase가 자동으로 여는 REST API(anon·authenticated 역할)로는 아무 행도 읽고 쓸 수 없게 한다.
        이 서버는 소유자 역할로 접속하므로 RLS의 영향을 받지 않는다."""
        db.create_all()
        ensure_case_indexes()
        if db.engine.dialect.name == "postgresql":
            for table in db.metadata.sorted_tables:
                # FORCE는 걸지 않는다. 걸면 소유자인 이 서버도 막힌다. 정책을 만들지 않으니 다른 역할은 전부 거절된다.
                db.session.execute(text(f'ALTER TABLE "{table.name}" ENABLE ROW LEVEL SECURITY'))
            db.session.commit()
        click.echo(f"표 {len(db.metadata.sorted_tables)}개 준비 ({db.engine.dialect.name})")

    @app.cli.command("make-reviewer")
    @click.argument("nickname")
    def make_reviewer(nickname: str):
        """닉네임의 등급을 검토자로 바꾼다. 웹에는 등급을 올리는 길이 없다."""
        _set_role(nickname, ROLE_REVIEWER)

    @app.cli.command("make-user")
    @click.argument("nickname")
    def make_user(nickname: str):
        """검토자 등급을 거둔다."""
        _set_role(nickname, ROLE_USER)

    return app


def _set_role(nickname: str, role: str) -> None:
    user = User.query.filter_by(nickname_key=nickname.lower()).first()
    if user is None:
        raise click.ClickException(f"없는 닉네임: {nickname}")
    user.role = role
    db.session.commit()
    click.echo(f"{user.nickname} → {role}")
