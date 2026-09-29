"""설정: 비밀번호 변경·모든 기기 로그아웃·닉네임 변경·계정 삭제. 모두 자기 계정만, 로그인한 요청만."""

from netproof_api.models import Case, Session, User, db

ACTUAL = {"result": "DENY", "source": "ping", "note": "실습망에서 443 접속 실패"}

PW = "correct horse 1"


def test_settings_need_login(api):
    for path in ("/api/auth/password", "/api/auth/logout-all", "/api/auth/nickname", "/api/auth/delete-account"):
        assert api.post(path, {}).status_code == 401


def test_password_change_needs_current_password_and_logs_out_other_devices(api, other):
    api.register("동기A")
    other.login("동기A")  # 다른 기기
    assert api.post("/api/auth/password", {"current_password": "wrong pass 1", "new_password": "new horse 22"}).status_code == 400
    assert api.post("/api/auth/password", {"current_password": PW, "new_password": "short"}).status_code == 400
    assert api.post("/api/auth/password", {"current_password": PW, "new_password": "new horse 22"}).status_code == 200
    assert api.get("/api/auth/me").get_json()["user"]["nickname"] == "동기A"  # 지금 기기는 그대로
    assert other.get("/api/auth/me").get_json()["user"] is None  # 다른 기기는 끊김
    assert other.login("동기A").status_code == 401
    assert other.login("동기A", "new horse 22").status_code == 200


def test_wrong_current_password_locks_like_login(api):
    api.register("동기A")
    for _ in range(5):
        api.post("/api/auth/password", {"current_password": "wrong pass 1", "new_password": "new horse 22"})
    assert api.post("/api/auth/password", {"current_password": PW, "new_password": "new horse 22"}).status_code == 429


def test_logout_all_kills_every_session(api, other, app):
    api.register("동기A")
    other.login("동기A")
    assert api.post("/api/auth/logout-all").status_code == 200
    assert api.get("/api/auth/me").get_json()["user"] is None
    assert other.get("/api/auth/me").get_json()["user"] is None
    with app.app_context():
        assert Session.query.count() == 0


def test_nickname_change_rules(api, other):
    api.register("동기A")
    other.register("동기B")
    assert api.post("/api/auth/nickname", {"nickname": "동기b"}).status_code == 409  # 대소문자 무시 중복
    assert api.post("/api/auth/nickname", {"nickname": "a"}).status_code == 400
    assert api.post("/api/auth/nickname", {"nickname": "동기a"}).status_code == 200  # 자기 이름의 대소문자만 바꿈
    api.save_case()
    assert api.post("/api/auth/nickname", {"nickname": "새이름"}).get_json()["user"]["nickname"] == "새이름"
    assert api.get("/api/cases").get_json()[0]["author"] == "새이름"
    assert api.login("새이름").status_code == 200


def test_delete_account_removes_own_cases_but_keeps_confirmations_on_others(api, reviewer, app):
    api.register("동기A")
    case_id = api.save_case().get_json()["id"]
    api.patch(f"/api/cases/{case_id}", {"actual": ACTUAL})
    reviewer.post(f"/api/cases/{case_id}/confirm")
    reviewer.save_case("검토자 사례")
    assert reviewer.post("/api/auth/delete-account", {"current_password": "wrong pass 1"}).status_code == 400
    assert reviewer.post("/api/auth/delete-account", {"current_password": PW}).status_code == 200
    assert reviewer.get("/api/auth/me").get_json()["user"] is None
    assert reviewer.login("검토자").status_code == 401
    with app.app_context():
        assert User.query.filter_by(nickname_key="검토자").first() is None
        assert [c.title for c in Case.query.all()] == ["HTTPS 막힘"]  # 검토자 사례는 지워짐
        kept = db.session.get(Case, case_id)
        assert kept.confirmed_at is not None and kept.confirmed_by is None  # 확인은 남고 확인한 사람만 비움
    assert api.get(f"/api/cases/{case_id}").get_json()["confirmed"]
