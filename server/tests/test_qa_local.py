"""임시 QA 환경의 격리·정리와 loopback 서버 동시 연결을 검사한다."""
import http.client
import importlib.util
import json
from pathlib import Path
import socket
import sys
import threading

import pytest
from netproof_api.models import Case, User, db
from werkzeug.serving import WSGIRequestHandler

spec = importlib.util.spec_from_file_location("qa_local", Path(__file__).resolve().parents[2] / "scripts" / "qa_local.py")
qa = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = qa
spec.loader.exec_module(qa)


@pytest.mark.parametrize("database_url", ["postgres://nobody:unused@127.0.0.1:1/never", "not-a-database-url"])
def test_seed_ignores_environment_and_creates_only_synthetic_data(monkeypatch, database_url):
    monkeypatch.setenv("DATABASE_URL", database_url)
    monkeypatch.setenv("NETPROOF_SECURE_COOKIES", "1")
    with qa.seeded_qa() as environment:
        directory = environment.directory
        assert directory.is_dir()
        assert environment.app.config["SQLALCHEMY_DATABASE_URI"] == f"sqlite:///{directory / 'qa.db'}"
        assert environment.app.config["SQLALCHEMY_ENGINE_OPTIONS"] == {}
        assert environment.app.config["SECURE_COOKIES"] is False
        assert environment.app.debug is False
        assert "passwords=" not in repr(environment)
        with environment.app.app_context():
            assert User.query.count() == 2
            assert User.query.filter_by(role="reviewer").count() == 1
            cases = Case.query.order_by(Case.id).all()
            assert len(cases) == 4
            assert all(case.title.startswith("QA ") for case in cases)
            assert len(cases[3].title) == 80
            assert cases[0].claim["kind"] == "ai"
            assert cases[0].actual_result and cases[0].confirmed_by and cases[0].confirmed_at
            assert cases[1].claim is None
            assert cases[2].claim["kind"] == "self" and cases[2].actual_result
            assert cases[3].claim is None
            assert all("합성" in case.actual_note for case in cases if case.actual_result)
            assert all(case.verdict["result"] == case.result for case in cases)
            db.session.remove()
        # 실패 출력에도 자격 증명을 노출하지 않는 bool 검사만 한다.
        assert all(secret.encode() not in (directory / "qa.db").read_bytes()
                   for secret in environment.passwords.values())
        for nickname, secret in environment.passwords.items():
            client = environment.app.test_client()
            response = client.post("/api/auth/login", json={"nickname": nickname, "password": secret},
                                   headers={"X-NetProof": "1"})
            assert response.status_code == 200
            assert response.json["user"]["nickname"] == nickname
            assert len(client.get("/api/cases").json) == 4
    assert not directory.exists()


def test_existing_database_untouched_and_each_run_is_fresh(monkeypatch, tmp_path):
    sentinel = tmp_path / "existing.db"
    sentinel.write_bytes(b"existing database must not be opened")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{sentinel}")
    with qa.seeded_qa() as first:
        with qa.seeded_qa() as second:
            assert first.directory != second.directory
            assert all(first.passwords[name] != second.passwords[name] for name in first.passwords)
    assert sentinel.read_bytes() == b"existing database must not be opened"
    assert not first.directory.exists() and not second.directory.exists()


def test_cleanup_on_seed_failure(monkeypatch):
    directories = []
    original = qa.create_app
    def remember(overrides):
        directories.append(Path(overrides["SQLALCHEMY_DATABASE_URI"].removeprefix("sqlite:///")).parent)
        return original(overrides)
    monkeypatch.setattr(qa, "create_app", remember)
    monkeypatch.setattr(qa, "_request", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("seed failed")))
    with pytest.raises(RuntimeError, match="seed failed"):
        with qa.seeded_qa():
            pytest.fail("must not yield")
    assert len(directories) == 1 and not directories[0].exists()


def test_missing_build_does_not_seed_or_build(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(qa, "ROOT", tmp_path)
    monkeypatch.setattr(qa, "seeded_qa", lambda: pytest.fail("must not seed"))
    assert qa.main([]) == 1
    assert "npm --prefix web run build" in capsys.readouterr().out


@pytest.mark.parametrize("interrupted", [False, True])
def test_cli_loopback_only_and_cleans_up_without_recording_passwords(monkeypatch, tmp_path, interrupted):
    (tmp_path / "web" / "dist").mkdir(parents=True)
    (tmp_path / "web" / "dist" / "index.html").touch()
    # main의 빌드 확인만 대체한다. 시드 create_app 경로는 기존 ROOT를 쓴다.
    original_root = qa.ROOT
    original_seed = qa.seeded_qa
    def seed():
        monkeypatch.setattr(qa, "ROOT", original_root)
        return original_seed()
    monkeypatch.setattr(qa, "ROOT", tmp_path)
    monkeypatch.setattr(qa, "seeded_qa", seed)
    state = {"closed": False, "password_lines": 0}
    def console(message, **kwargs):
        # 비밀번호 줄은 카운트만; 원문을 pytest 캡처나 파일로 보내지 않는다.
        if " 비밀번호: " in message:
            state["password_lines"] += 1
    monkeypatch.setattr(qa, "print", console, raising=False)
    class Server:
        server_port = 4861
        def serve_forever(self):
            if interrupted:
                raise KeyboardInterrupt
        def server_close(self):
            state["closed"] = True
    def server(host, port, app, *, threaded):
        assert host == "127.0.0.1" and port == 4861
        assert threaded is True
        state["directory"] = Path(app.config["SQLALCHEMY_DATABASE_URI"].removeprefix("sqlite:///" )).parent
        return Server()
    monkeypatch.setattr(qa, "make_server", server)
    assert qa.main(["--port", "4861"]) == 0
    assert state["closed"] and state["password_lines"] == 2
    assert not state["directory"].exists()


@pytest.mark.parametrize("port", ["0", "65536", "nope"])
def test_invalid_port_does_not_start(port):
    with pytest.raises(SystemExit):
        qa.main(["--port", port])


def test_cli_serves_second_request_while_first_connection_stays_open(monkeypatch, tmp_path):
    (tmp_path / "web" / "dist").mkdir(parents=True)
    (tmp_path / "web" / "dist" / "index.html").touch()
    original_root, original_seed, original_server = qa.ROOT, qa.seeded_qa, qa.make_server
    accepted = threading.Event()

    def seed():
        monkeypatch.setattr(qa, "ROOT", original_root)
        return original_seed()

    class AcceptedHandler(WSGIRequestHandler):
        def setup(self):
            super().setup()
            # 첫 TCP 연결이 backlog에만 대기하는 거짓 양성을 막는다.
            accepted.set()

    def server(host, port, app, **kwargs):
        assert host == "127.0.0.1" and port == 4861
        # QA main이 전달하는 threaded 옵션을 그대로 쓰고, 테스트 포트만 OS에 맡긴다.
        actual = original_server(host, 0, app, request_handler=AcceptedHandler, **kwargs)
        serve_forever = actual.serve_forever

        def concurrent_requests():
            worker = threading.Thread(target=serve_forever, daemon=True)
            worker.start()
            first = None
            second = http.client.HTTPConnection(host, actual.server_port, timeout=3)
            try:
                first = socket.create_connection((host, actual.server_port), timeout=3)
                assert accepted.wait(3), "첫 빈 연결이 서버에서 수락되어야 한다"
                # 첫 연결에는 HTTP 바이트를 보내지 않고 끝까지 열어 둔다.
                second.request("GET", "/api/examples")
                response = second.getresponse()
                assert response.status == 200
                assert len(json.loads(response.read())) == 3
                assert first.fileno() != -1
            finally:
                second.close()
                if first is not None:
                    first.close()
                actual.shutdown()
                worker.join(timeout=3)
                assert not worker.is_alive(), "테스트 서버가 종료되어야 한다"

        actual.serve_forever = concurrent_requests
        return actual

    monkeypatch.setattr(qa, "ROOT", tmp_path)
    monkeypatch.setattr(qa, "seeded_qa", seed)
    monkeypatch.setattr(qa, "make_server", server)
    # 실제 무작위 비밀번호가 pytest 캡처나 파일에 남지 않게 콘솔 출력을 버린다.
    monkeypatch.setattr(qa, "print", lambda *args, **kwargs: None, raising=False)
    assert qa.main(["--port", "4861"]) == 0
