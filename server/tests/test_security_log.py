import json
import logging
import re
import socket

import pytest

from conftest import Api
from netproof_api import create_app
from netproof_api import security_log
from netproof_api.auth import LOGIN_FAILED


@pytest.fixture
def logged(tmp_path):
    path = tmp_path / "logs" / "security.jsonl"
    app = create_app({"SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'db.sqlite'}",
                      "SECURITY_LOG": str(path), "SECURITY_SYSLOG": None, "TESTING": True})
    yield app, path
    security_log.configure(type("Off", (), {"config": {}})())


def records(path):
    raw = path.read_text(encoding="utf-8")
    lines = raw.splitlines()
    for line in lines:
        assert line.startswith('{"app":"netproof",')
        assert ": " not in line
        value = json.loads(line)
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", value["time"])
        assert None not in value.values()
    return [json.loads(line) for line in lines], raw


def test_login_records_and_credentials_absent(logged):
    app, path = logged
    api = Api(app)
    password = "synthetic-only-password-123"
    wrong = "synthetic-wrong-password-456"
    unknown = "not-an-account-789"
    assert api.register("기록계정", password).status_code == 201
    assert records(path)[0] == []  # registration is outside the event scope
    assert api.login("기록계정", password).status_code == 200
    failures = [api.login(unknown, wrong)]
    failures += [api.login("기록계정", wrong) for _ in range(5)]
    failures += [api.login("기록계정", password)]
    for response in failures:
        assert response.status_code == 401
        assert response.get_json() == {"detail": LOGIN_FAILED}
    rows, raw = records(path)
    assert len(rows) == 9
    assert rows[0]["event"] == "login_success"
    assert rows[0]["nickname"] == "기록계정"
    assert rows[0]["src_ip"] == "127.0.0.1"
    assert rows[1]["reason"] == "unknown_user"
    assert "nickname" not in rows[1] and "user_id" not in rows[1]
    assert [r["failed_count"] for r in rows[2:7]] == [1, 2, 3, 4, 5]
    assert rows[7]["event"] == "account_locked" and rows[7]["via"] == "login"
    assert rows[7]["failed_count"] == 5
    assert rows[8]["reason"] == "locked" and rows[8]["locked_until"] == rows[7]["locked_until"]
    assert "failed_count" not in rows[8]
    for value in (password, wrong, unknown):
        assert value not in raw


def test_settings_failure_lock_and_locked_attempt(logged):
    app, path = logged
    api = Api(app)
    api.register("설정계정")
    for _ in range(5):
        response = api.post("/api/auth/password", {"current_password": "settings-wrong", "new_password": "never-used-secret"})
        assert response.status_code == 400
        assert response.get_json() == {"detail": "지금 비밀번호가 맞지 않습니다"}
    response = api.post("/api/auth/password", {"current_password": "correct horse 1"})
    assert response.status_code == 429
    assert response.get_json() == {"detail": "비밀번호가 여러 번 틀려 잠시 잠겼습니다. 잠시 뒤에 다시 하세요"}
    rows, raw = records(path)
    assert [r["event"] for r in rows] == ["password_check_failure"] * 5 + ["account_locked", "password_check_failure"]
    assert [r["failed_count"] for r in rows[:5]] == [1, 2, 3, 4, 5]
    assert rows[5]["via"] == "settings" and rows[5]["failed_count"] == 5
    assert rows[6]["reason"] == "locked" and rows[6]["locked_until"] == rows[5]["locked_until"]
    for value in ("settings-wrong", "never-used-secret", "correct horse 1"):
        assert value not in raw


def test_file_and_udp_same_json_no_nul(logged):
    app, path = logged
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as receiver:
        receiver.bind(("127.0.0.1", 0))
        receiver.settimeout(2)
        app.config["SECURITY_SYSLOG"] = f"127.0.0.1:{receiver.getsockname()[1]}"
        security_log.configure(app)
        api = Api(app)
        api.register("UDP계정")
        api.login("UDP계정")
        api.login("없는닉네임", "udp-wrong")
        datagrams = [receiver.recv(65535) for _ in range(2)]
    rows, raw = records(path)
    assert len(rows) == 2
    for packet, prefix, line in zip(datagrams, (b"<38>", b"<36>"), raw.splitlines()):
        assert packet == prefix + line.encode("utf-8")
        assert b"\x00" not in packet
        assert b"udp-wrong" not in packet
    assert "없는닉네임" not in raw


def test_disabled_has_no_file_or_stderr(logged, capsys):
    app, path = logged
    app.config.update(SECURITY_LOG=None, SECURITY_SYSLOG=None)
    security_log.configure(app)
    path.unlink()
    api = Api(app)
    api.register("꺼진계정")
    api.login("꺼진계정")
    api.login("없는계정", "do-not-log")
    for _ in range(6):
        api.login("꺼진계정", "do-not-log")
    security_log.event("login_failure", logging.WARNING, reason="unknown_user")
    assert not path.exists()
    assert capsys.readouterr().err == ""
    assert security_log.LOGGER.propagate is False
    assert len(security_log.LOGGER.handlers) == 1
    assert isinstance(security_log.LOGGER.handlers[0], logging.NullHandler)


def test_default_off_never_creates_log_directory(tmp_path, monkeypatch, capsys):
    monkeypatch.delenv("NETPROOF_SECURITY_LOG", raising=False)
    monkeypatch.delenv("NETPROOF_SYSLOG", raising=False)
    app = create_app({"SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'off.db'}"})
    Api(app).login("never-record-this-name", "never-record-this-password")
    assert not (tmp_path / "logs").exists()
    assert capsys.readouterr().err == ""


def test_syslog_only_does_not_create_file(logged):
    app, path = logged
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as receiver:
        receiver.bind(("127.0.0.1", 0))
        receiver.settimeout(2)
        app.config.update(SECURITY_LOG=None, SECURITY_SYSLOG=f"127.0.0.1:{receiver.getsockname()[1]}")
        security_log.configure(app)
        path.unlink()
        Api(app).login("no-such-user", "udp-only-secret")
        packet = receiver.recv(65535)
    assert not path.exists()
    assert packet.startswith(b'<36>{"app":"netproof",')
    assert json.loads(packet[4:])["reason"] == "unknown_user"
    assert b"no-such-user" not in packet and b"udp-only-secret" not in packet


def test_reconfigure_closes_old_handlers_without_duplicates(logged, tmp_path):
    app, path = logged
    old = security_log.LOGGER.handlers[0]
    second = create_app({"SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'second.db'}",
                         "SECURITY_LOG": str(path), "SECURITY_SYSLOG": None, "TESTING": True})
    assert old.stream is None
    assert len(security_log.LOGGER.handlers) == 1
    api = Api(second)
    api.register("한번계정")
    api.login("한번계정")
    assert len(records(path)[0]) == 1
    security_log.configure(type("Off", (), {"config": {}})())
    path.rename(path.with_suffix(".renamed"))  # Windows file handles really released


def test_json_escapes_controls_and_omits_none_and_unapproved_fields(logged):
    _, path = logged
    security_log.event("login_success", logging.INFO, nickname="line\nnext\r\t", user_id=2,
                       src_ip=None, password="excluded-secret", current_password="excluded-secret",
                       cookie="excluded-cookie")
    security_log.event("login_failure", logging.WARNING, reason="unknown_user",
                       nickname="omitted-unknown", user_id=99)
    rows, raw = records(path)
    assert len(rows) == 2
    assert rows[0]["nickname"] == "line\nnext\r\t"
    assert "src_ip" not in rows[0]
    assert "nickname" not in rows[1] and "user_id" not in rows[1]
    assert "excluded" not in raw and "omitted-unknown" not in raw


@pytest.mark.parametrize("address", ["localhost", ":1514", "host:0", "host:65536", "host:-1",
                                   "host:abc", "host:1514:1", "host:１２３", "host :1514"])
def test_bad_syslog_fails_startup(tmp_path, monkeypatch, address):
    monkeypatch.setenv("NETPROOF_SYSLOG", address)
    monkeypatch.delenv("NETPROOF_SECURITY_LOG", raising=False)
    with pytest.raises(ValueError, match="NETPROOF_SYSLOG"):
        create_app({"SQLALCHEMY_DATABASE_URI": f"sqlite:///{tmp_path / 'invalid.db'}"})


def test_environment_config_overridable(logged, monkeypatch):
    app, path = logged
    monkeypatch.setenv("NETPROOF_SECURITY_LOG", str(path))
    monkeypatch.setenv("NETPROOF_SYSLOG", "invalid")
    overridden = create_app({"SQLALCHEMY_DATABASE_URI": app.config["SQLALCHEMY_DATABASE_URI"],
                             "SECURITY_LOG": None, "SECURITY_SYSLOG": None})
    assert overridden.config["SECURITY_LOG"] is None
    assert overridden.config["SECURITY_SYSLOG"] is None
    assert isinstance(security_log.LOGGER.handlers[0], logging.NullHandler)
