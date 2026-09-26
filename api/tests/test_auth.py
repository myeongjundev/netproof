from datetime import datetime

from netproof_api.models import Session, User, db


def test_register_logs_in_as_plain_user_even_if_role_is_sent(api):
    response = api.post("/api/auth/register", {"nickname": "동기A", "password": "correct horse 1", "role": "reviewer"})
    assert response.status_code == 201
    assert response.get_json()["user"]["role"] == "user"
    assert api.get("/api/auth/me").get_json()["user"]["nickname"] == "동기A"


def test_password_is_stored_as_argon2id(api, app):
    api.register("동기A")
    with app.app_context():
        assert User.query.one().password_hash.startswith("$argon2id$")


def test_session_cookie_is_httponly_and_token_not_stored_raw(api, app):
    response = api.register("동기A")
    cookie = response.headers["Set-Cookie"]
    assert "HttpOnly" in cookie and "SameSite=Lax" in cookie
    token = cookie.split("np_session=")[1].split(";")[0]
    with app.app_context():
        assert Session.query.one().token_hash != token


def test_duplicate_nickname_ignores_case(api, other):
    api.register("Alpha")
    assert other.register("alpha").status_code == 409


def test_nickname_and_password_rules(api):
    assert api.register("a").status_code == 400
    assert api.register("이름 공백").status_code == 400
    assert api.register("동기A", password="short").status_code == 400


def test_login_failure_message_does_not_reveal_account(api, other):
    api.register("동기A")
    unknown = other.login("없는사람").get_json()["detail"]
    wrong = other.login("동기A", password="wrong password").get_json()["detail"]
    assert unknown == wrong


def test_lock_after_five_failures_even_with_right_password(api, other):
    api.register("동기A")
    for _ in range(5):
        assert other.login("동기A", password="wrong password").status_code == 401
    assert other.login("동기A").status_code == 401


def test_logout_kills_the_session_on_the_server(api, app):
    api.register("동기A")
    old_cookie = api.client.get_cookie("np_session").value
    assert api.post("/api/auth/logout").status_code == 200
    api.client.set_cookie("np_session", old_cookie)  # 훔쳐 둔 쿠키를 다시 써도
    assert api.get("/api/auth/me").get_json()["user"] is None
    with app.app_context():
        assert Session.query.count() == 0


def test_expired_session_is_not_accepted(api, app):
    api.register("동기A")
    with app.app_context():
        session = Session.query.one()
        session.expires_at = datetime(2000, 1, 1)
        db.session.commit()
    assert api.get("/api/auth/me").get_json()["user"] is None
    assert api.save_case().status_code == 401


def test_lock_expires(api, other, app):
    api.register("동기A")
    for _ in range(5):
        other.login("동기A", password="wrong password")
    with app.app_context():
        user = User.query.one()
        user.locked_until = datetime(2000, 1, 1)
        db.session.commit()
    assert other.login("동기A").status_code == 200


def test_state_changing_request_without_custom_header_is_rejected(api):
    response = api.client.post("/api/auth/register", json={"nickname": "동기A", "password": "correct horse 1"})
    assert response.status_code == 403


def test_logged_in_request_needs_matching_csrf_token(api):
    api.register("동기A")
    api.csrf = "forged"
    assert api.save_case().status_code == 403


def test_security_headers(api):
    headers = api.get("/api/auth/me").headers
    assert "frame-ancestors 'none'" in headers["Content-Security-Policy"]
    assert headers["X-Content-Type-Options"] == "nosniff"
    assert headers["Cache-Control"] == "no-store"
