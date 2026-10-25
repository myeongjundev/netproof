"""채점자가 읽는 최신 버전·공개 재현 절차와 검증 근거가 어긋나지 않는지."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


def test_latest_release_notes_match_the_web_version():
    version = json.loads(read("web/package.json"))["version"]
    notes = read("docs/release-v1.0.md")
    assert f"v{version}" in notes.splitlines()[0]
    assert f"`v{version}`(최신)" in notes
    assert f"웹 앱 {version}" in notes


def test_readme_contains_the_public_demo_and_states_the_user_test_limit():
    readme = read("README.md")
    for text in ("침해 가정 실습 열기", "고친 구성 확인하기", "3곳 · 서비스 15개", "1곳 · 서비스 1개", "막힘 14"):
        assert text in readme
    assert "다른 사용자 확인 없음" in readme


def test_reproduction_uses_revision_identity_and_explains_the_sqlite_skip():
    readme, notes = read("README.md"), read("docs/release-v1.0.md")
    assert "SQLite" in readme and "RLS" in readme
    assert "pybatfish가 없으면" not in readme
    assert "git rev-parse HEAD" in readme and "git rev-parse HEAD" in notes
    assert "같은 수가 나오면 같은 소스" not in readme
    assert "시험 수가 나오면 같은 소스" not in notes
