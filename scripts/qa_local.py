"""사람이 확인할 로컬 QA 환경. 배포 앱에서 불러오지 않는다."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path
import secrets
import signal
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "engine" / "src"))

from netproof_api import create_app
from netproof_api.models import ROLE_REVIEWER, User, db
from werkzeug.serving import make_server


@dataclass
class QAEnvironment:
    app: object
    directory: Path
    passwords: dict[str, str] = field(repr=False)


def _request(client, method, path, payload=None, csrf=None, status=200):
    headers = {"X-NetProof": "1"}
    if csrf:
        headers["X-CSRF-Token"] = csrf
    response = client.open(path, method=method, json=payload, headers=headers)
    if response.status_code != status:
        # 응답·요청 본문이나 비밀번호를 오류 기록에 넣지 않는다.
        raise RuntimeError(f"QA 준비 실패: {method} {path} ({response.status_code})")
    return response.get_json()


@contextmanager
def seeded_qa():
    """경로를 받지 않고 항상 새 OS 임시 SQLite만 만든다. 서버는 열지 않는다."""
    with tempfile.TemporaryDirectory(prefix="netproof-qa-") as directory:
        app = create_app({
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{Path(directory) / 'qa.db'}",
            # create_app이 환경 URL에서 먼저 계산한 PostgreSQL 옵션도 덮어쓴다.
            "SQLALCHEMY_ENGINE_OPTIONS": {},
            "SECURE_COOKIES": False,
            "DEBUG": False,
            "CASES_DIR": str(ROOT / "cases"),
            "WEB_DIST": str(ROOT / "web" / "dist"),
        })
        try:
            passwords = {name: secrets.token_urlsafe(24) for name in ("qa_author", "qa_reviewer")}
            author, reviewer = app.test_client(), app.test_client()
            sessions = {}
            for name, client in (("qa_author", author), ("qa_reviewer", reviewer)):
                sessions[name] = _request(client, "POST", "/api/auth/register",
                                         {"nickname": name, "password": passwords[name]}, status=201)["csrf"]
            with app.app_context():
                User.query.filter_by(nickname_key="qa_reviewer").one().role = ROLE_REVIEWER
                db.session.commit()
            examples = {item["id"]: item for item in _request(author, "GET", "/api/examples")}
            specifications = [
                ("QA AI 답 · 합성 실제 결과 · 검토 확인", "synthetic-01",
                 {"expected": "PASS", "kind": "ai", "source": "QA 합성 AI 답", "text": "QA 표시용 합성 답"}, True),
                ("QA 받은 답 없음", "synthetic-02", None, False),
                ("QA 내 예상 · 합성 실제 결과", "synthetic-03",
                 {"expected": "DENY", "kind": "self"}, True),
                ("QA " + "아주긴제목" * 15 + "가나", "synthetic-01", None, False),
            ]
            for index, (title, example_id, claim, actual) in enumerate(specifications):
                example = examples[example_id]
                case = _request(author, "POST", "/api/cases", {
                    "title": title, "network": example["network"], "flow": example["flow"], "claim": claim,
                }, sessions["qa_author"], 201)
                if actual:
                    _request(author, "PATCH", f"/api/cases/{case['id']}", {
                        "actual": {"result": "DENY", "source": "other",
                                   "note": "QA 합성 데이터 — 실제 장비 관측 아님"},
                    }, sessions["qa_author"])
                if index == 0:
                    _request(reviewer, "POST", f"/api/cases/{case['id']}/confirm", {}, sessions["qa_reviewer"])
            yield QAEnvironment(app, Path(directory), passwords)
        finally:
            # Windows에서도 열린 SQLite 핸들 때문에 임시 폴더 삭제가 막히지 않게 한다.
            with app.app_context():
                db.session.remove()
                db.engine.dispose()


def _port(raw):
    try:
        value = int(raw)
    except ValueError:
        raise argparse.ArgumentTypeError("포트는 1~65535 정수여야 합니다") from None
    if not 1 <= value <= 65535:
        raise argparse.ArgumentTypeError("포트는 1~65535 정수여야 합니다")
    return value


def _interrupt(signum, frame):
    raise KeyboardInterrupt


def main(argv=None):
    parser = argparse.ArgumentParser(description="임시 SQLite·127.0.0.1 전용 수동 QA 준비")
    parser.add_argument("--port", type=_port, default=4860)
    args = parser.parse_args(argv)
    if not (ROOT / "web" / "dist" / "index.html").is_file():
        print("먼저 npm --prefix web run build를 실행하세요.", flush=True)
        return 1
    # Windows Ctrl+Break도 Ctrl+C와 같은 정리 경로로 보낸다.
    break_signal = getattr(signal, "SIGBREAK", None)
    previous = signal.signal(break_signal, _interrupt) if break_signal is not None else None
    try:
        with seeded_qa() as environment:
            server = make_server("127.0.0.1", args.port, environment.app)
            try:
                print(f"QA 주소: http://127.0.0.1:{server.server_port}/", flush=True)
                print(f"임시 폴더: {environment.directory}", flush=True)
                for nickname, password in environment.passwords.items():
                    print(f"{nickname} 비밀번호: {password}", flush=True)
                print(f"체크리스트: {ROOT / 'docs' / 'qa-manual.md'}", flush=True)
                print("합성 데이터입니다. 수동 QA A·B는 사람이 확인합니다. 종료: Ctrl+C", flush=True)
                server.serve_forever()
            finally:
                server.server_close()
    except KeyboardInterrupt:
        print("QA 서버 종료·임시 폴더 삭제 완료", flush=True)
    finally:
        if break_signal is not None:
            signal.signal(break_signal, previous)
    return 0


if __name__ == "__main__":
    sys.exit(main())
