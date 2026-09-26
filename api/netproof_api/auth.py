"""인증(누구인가)과 인가(무엇을 할 수 있나). 인증 실패는 401, 등급 부족은 403.

- 비밀번호: Argon2id
- 세션: 서버 세션. 쿠키에는 무작위 토큰, DB에는 그 SHA-256만. 로그아웃하면 즉시 무효
- CSRF: 상태를 바꾸는 요청은 모두 X-NetProof 헤더가 있어야 하고(교차 사이트 폼 차단),
  로그인한 요청은 세션에 묶인 CSRF 토큰(X-CSRF-Token)까지 맞아야 한다
- 로그인 실패: 없는 닉네임·틀린 비밀번호·잠김 모두 같은 메시지(계정 존재 여부를 알려 주지 않음)
"""

from __future__ import annotations

import hashlib
import re
import secrets
from datetime import timedelta
from functools import wraps

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from flask import Blueprint, current_app, g, jsonify, request

from .models import ROLE_USER, Session, User, db, utcnow

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

COOKIE = "np_session"
SESSION_DAYS = 7
MAX_FAILED = 5
LOCK_MINUTES = 10
NICKNAME = re.compile(r"^[0-9A-Za-z가-힣_-]{2,20}$")
LOGIN_FAILED = "닉네임 또는 비밀번호가 맞지 않거나, 실패가 반복돼 잠시 잠겼습니다"
UNSAFE = ("POST", "PUT", "PATCH", "DELETE")
CSRF_EXEMPT = ("/api/auth/login", "/api/auth/register")

hasher = PasswordHasher()  # 기본값이 Argon2id
_DUMMY_HASH = hasher.hash("netproof-timing-equalizer")


def error(status: int, message: str, **extra):
    return jsonify({"detail": message, **extra}), status


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def current_session() -> Session | None:
    if "np_session" not in g:
        g.np_session = None
        token = request.cookies.get(COOKIE)
        if token:
            found = Session.query.filter_by(token_hash=_token_hash(token)).first()
            if found is not None and found.expires_at > utcnow():
                g.np_session = found
    return g.np_session


def current_user() -> User | None:
    session = current_session()
    return session.user if session else None


def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if current_user() is None:
            return error(401, "로그인이 필요합니다", reason="unauthenticated")
        return view(*args, **kwargs)

    return wrapper


def reviewer_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        user = current_user()
        if user is None:
            return error(401, "로그인이 필요합니다", reason="unauthenticated")
        if not user.is_reviewer:
            return error(403, "검토자만 할 수 있습니다", reason="insufficient_role", current_role=user.role)
        return view(*args, **kwargs)

    return wrapper


def csrf_guard():
    """앱 전체 before_request. 상태를 바꾸는 API 요청만 검사한다."""
    if request.method not in UNSAFE or not request.path.startswith("/api/"):
        return None
    if request.headers.get("X-NetProof") != "1":
        return error(403, "허용되지 않은 요청입니다(X-NetProof 헤더 없음)", reason="csrf")
    session = current_session()
    if session is not None and request.path not in CSRF_EXEMPT:
        sent = request.headers.get("X-CSRF-Token", "")
        if not secrets.compare_digest(sent, session.csrf_token):
            return error(403, "요청 확인 토큰이 맞지 않습니다. 새로고침 후 다시 시도하세요", reason="csrf")
    return None


def _start_session(user: User):
    now = utcnow()
    Session.query.filter(Session.expires_at <= now).delete()
    token = secrets.token_urlsafe(32)
    session = Session(
        token_hash=_token_hash(token),
        csrf_token=secrets.token_urlsafe(32),
        user_id=user.id,
        expires_at=now + timedelta(days=SESSION_DAYS),
    )
    db.session.add(session)
    db.session.commit()
    response = jsonify({"user": user.public(), "csrf": session.csrf_token})
    response.set_cookie(
        COOKIE, token, max_age=SESSION_DAYS * 86400, httponly=True, samesite="Lax",
        secure=current_app.config["SECURE_COOKIES"], path="/",
    )
    return response


def _credentials() -> tuple[str, str]:
    data = request.get_json(silent=True) or {}
    return str(data.get("nickname") or "").strip(), str(data.get("password") or "")


@bp.post("/register")
def register():
    nickname, password = _credentials()
    if not NICKNAME.match(nickname):
        return error(400, "닉네임은 2~20자의 한글·영문·숫자·_·-만 됩니다. 실명은 쓰지 마세요")
    if not 8 <= len(password) <= 128:
        return error(400, "비밀번호는 8~128자여야 합니다")
    if User.query.filter_by(nickname_key=nickname.lower()).first():
        return error(409, "이미 쓰는 닉네임입니다")
    user = User(nickname=nickname, nickname_key=nickname.lower(), password_hash=hasher.hash(password), role=ROLE_USER)
    db.session.add(user)
    db.session.commit()
    response = _start_session(user)
    response.status_code = 201
    return response


@bp.post("/login")
def login():
    nickname, password = _credentials()
    user = User.query.filter_by(nickname_key=nickname.lower()).first()
    now = utcnow()
    if user is None or (user.locked_until and user.locked_until > now):
        try:  # 없는 닉네임·잠긴 계정도 같은 시간이 걸리게 한다
            hasher.verify(_DUMMY_HASH, password)
        except VerificationError:
            pass
        return error(401, LOGIN_FAILED)
    try:
        hasher.verify(user.password_hash, password)
    except (VerificationError, InvalidHashError):
        user.failed_logins += 1
        if user.failed_logins >= MAX_FAILED:
            user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
            user.failed_logins = 0
        db.session.commit()
        return error(401, LOGIN_FAILED)
    user.failed_logins = 0
    user.locked_until = None
    if hasher.check_needs_rehash(user.password_hash):
        user.password_hash = hasher.hash(password)
    db.session.commit()
    return _start_session(user)


@bp.post("/logout")
def logout():
    session = current_session()
    if session is not None:
        db.session.delete(session)
        db.session.commit()
    response = jsonify({"ok": True})
    response.delete_cookie(COOKIE, path="/")
    return response


@bp.get("/me")
def me():
    session = current_session()
    if session is None:
        return jsonify({"user": None, "csrf": None})
    return jsonify({"user": session.user.public(), "csrf": session.csrf_token})
