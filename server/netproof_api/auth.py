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

from .models import ROLE_USER, Case, Session, User, db, utcnow

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


# ── 설정: 로그인한 사람이 자기 계정만 바꾼다 ──────────────────────────────


def _check_current_password(user: User):
    """비밀번호를 다시 묻는 설정 요청. 틀리면 로그인과 같은 횟수로 잠근다(세션을 훔친 사람의 추측 방지)."""
    password = str((request.get_json(silent=True) or {}).get("current_password") or "")
    now = utcnow()
    if user.locked_until and user.locked_until > now:
        return error(429, "비밀번호가 여러 번 틀려 잠시 잠겼습니다. 잠시 뒤에 다시 하세요")
    try:
        hasher.verify(user.password_hash, password)
    except (VerificationError, InvalidHashError):
        user.failed_logins += 1
        if user.failed_logins >= MAX_FAILED:
            user.locked_until = now + timedelta(minutes=LOCK_MINUTES)
            user.failed_logins = 0
        db.session.commit()
        return error(400, "지금 비밀번호가 맞지 않습니다")
    user.failed_logins = 0
    return None


@bp.post("/password")
@login_required
def change_password():
    user = current_user()
    failed = _check_current_password(user)
    if failed:
        return failed
    new = str((request.get_json(silent=True) or {}).get("new_password") or "")
    if not 8 <= len(new) <= 128:
        return error(400, "새 비밀번호는 8~128자여야 합니다")
    user.password_hash = hasher.hash(new)
    # 다른 기기의 로그인은 끊고 지금 기기만 남긴다.
    Session.query.filter(Session.user_id == user.id, Session.id != current_session().id).delete()
    db.session.commit()
    return jsonify({"ok": True})


@bp.post("/logout-all")
@login_required
def logout_all():
    Session.query.filter_by(user_id=current_user().id).delete()
    db.session.commit()
    response = jsonify({"ok": True})
    response.delete_cookie(COOKIE, path="/")
    return response


@bp.post("/nickname")
@login_required
def change_nickname():
    user = current_user()
    nickname = str((request.get_json(silent=True) or {}).get("nickname") or "").strip()
    if not NICKNAME.match(nickname):
        return error(400, "닉네임은 2~20자의 한글·영문·숫자·_·-만 됩니다. 실명은 쓰지 마세요")
    taken = User.query.filter_by(nickname_key=nickname.lower()).first()
    if taken is not None and taken.id != user.id:
        return error(409, "이미 쓰는 닉네임입니다")
    user.nickname, user.nickname_key = nickname, nickname.lower()
    db.session.commit()
    return jsonify({"user": user.public()})


@bp.post("/delete-account")
@login_required
def delete_account():
    user = current_user()
    failed = _check_current_password(user)
    if failed:
        return failed
    # SQLite는 외래 키 CASCADE를 기본으로 끄므로 직접 지운다(PostgreSQL에서도 같은 결과).
    Case.query.filter_by(confirmed_by=user.id).update({"confirmed_by": None})  # 남의 사례 확인은 남긴다
    Case.query.filter_by(owner_id=user.id).delete()
    Session.query.filter_by(user_id=user.id).delete()
    db.session.delete(user)
    db.session.commit()
    response = jsonify({"ok": True})
    response.delete_cookie(COOKIE, path="/")
    return response
