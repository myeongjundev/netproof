"""NetProof 서버(Flask). 판정은 엔진만 하고(ADR-001), 이 층은 로그인·사례·크기 제한·보안 헤더를 맡는다."""

from __future__ import annotations

import os
from pathlib import Path

import click
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException

from . import auth, cases
from .models import ROLE_REVIEWER, ROLE_USER, User, db

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


def create_app(overrides: dict | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config.update(
        SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL", f"sqlite:///{ROOT / 'instance' / 'netproof.db'}"),
        MAX_CONTENT_LENGTH=64 * 1024,
        SECURE_COOKIES=os.environ.get("NETPROOF_SECURE_COOKIES", "0") == "1",
        CASES_DIR=str(ROOT / "cases"),
        WEB_DIST=str(ROOT / "web" / "dist"),
    )
    if overrides:
        app.config.update(overrides)
    if app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:///"):
        Path(app.config["SQLALCHEMY_DATABASE_URI"].removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    with app.app_context():
        db.create_all()

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
