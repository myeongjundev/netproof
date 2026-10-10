"""합성 입력과 임시 DB로만 재판정·내보내기를 검증한다."""
import copy
from datetime import datetime

import pytest

from conftest import CASE
from netproof_api import cases
from netproof_api.models import Case, User, db
from netproof_engine import verify


def stateful_unknown():
    network = copy.deepcopy(CASE["network"])
    router = network["devices"][1]
    router["stateful"] = True
    router["interfaces"][0].pop("acl_in")
    router["interfaces"][0]["rules_in"] = []
    return network


def add_case(owner, **overrides):
    fields = dict(owner_id=owner.id, title="비공개 제목", network=copy.deepcopy(CASE["network"]),
                  flow=copy.deepcopy(CASE["flow"]), claim=copy.deepcopy(CASE["claim"]),
                  verdict={"result": "PASS"}, result="PASS", comparison="AGREE", engine_version="0.1.4",
                  actual_result="DENY", actual_source="device", actual_note="합성 시험 메모",
                  confirmed_by=owner.id, confirmed_at=datetime(2020, 1, 1),
                  created_at=datetime(2019, 1, 1), updated_at=datetime(2021, 1, 1))
    fields.update(overrides)
    row = Case(**fields)
    db.session.add(row)
    db.session.flush()
    return row


def snapshot(row):
    return {column.name: copy.deepcopy(getattr(row, column.name)) for column in Case.__table__.columns}


def invoke(app, *args):
    response = app.test_cli_runner().invoke(args=["rejudge", *args])
    assert response.exit_code == 0, response.exception
    return response.output


def test_rejudge_dry_run_preserves_then_updates_only_four_fields_and_is_idempotent(app, reviewer):
    with app.app_context():
        owner = User.query.one()
        disappearing = add_case(owner)
        appearing = add_case(owner, result="PASS", actual_result="PASS")
        unsupported = add_case(owner, network=stateful_unknown(), actual_result=None)
        same = add_case(owner, engine_version=cases.ENGINE_VERSION)
        db.session.commit()
        ids = [row.id for row in (disappearing, appearing, unsupported, same)]
        before = {row.id: snapshot(row) for row in Case.query.all()}
    dry = invoke(app, "--dry-run")
    assert "대상 3건 · 결과 바뀜 3건 · 비교 바뀜 3건 · 건너뜀 0건" in dry
    assert "DB 변경 없음(dry-run)" in dry
    assert f"불일치 사라짐 #{ids[0]} (확인됨)" in dry
    assert f"불일치 생김 #{ids[1]} (확인됨)" in dry
    assert f"#{ids[2]} PASS→UNSUPPORTED · AGREE→NOT_COMPARABLE · 0.1.4→0.2.0" in dry
    assert "비공개 제목" not in dry and "검토자" not in dry and "10.10.10" not in dry
    with app.app_context():
        assert {row.id: snapshot(row) for row in Case.query.all()} == before
    applied = invoke(app)
    assert applied.strip() == dry.replace(" · DB 변경 없음(dry-run)", "").strip()
    with app.app_context():
        for row in Case.query.all():
            after = snapshot(row)
            if row.id == ids[3]:
                assert after == before[row.id]
                continue
            for field in after.keys() - {"verdict", "result", "comparison", "engine_version"}:
                assert after[field] == before[row.id][field]
            verdict, comparison = cases._judge(row.network, row.flow, row.claim)
            assert (row.verdict, row.result, row.comparison, row.engine_version) == (verdict, verdict["result"], comparison, cases.ENGINE_VERSION)
    assert "대상 0건" in invoke(app)
    assert "대상 0건" in invoke(app, "--dry-run")


def test_limits_and_engine_exception_skip_without_disclosing_input(app, reviewer, monkeypatch):
    with app.app_context():
        owner = User.query.one()
        limited = add_case(owner, network={"devices": [{}] * 41})
        broken = add_case(owner, flow={"private": "비공개 구성"})
        good = add_case(owner)
        db.session.commit()
        ids = [row.id for row in (limited, broken, good)]
        before = {row.id: snapshot(row) for row in (limited, broken)}
    original = cases._judge
    def judge(network, flow, claim):
        if "private" in flow:
            raise ValueError("비공개 구성·닉네임·제목")
        return original(network, flow, claim)
    monkeypatch.setattr(cases, "_judge", judge)
    output = invoke(app)
    assert "건너뜀 2건" in output
    assert f"건너뜀 #{ids[0]} (입력 한도 초과)" in output
    assert f"건너뜀 #{ids[1]} (엔진 예외)" in output
    assert "비공개" not in output and "검토자" not in output
    with app.app_context():
        for row_id in ids[:2]:
            assert snapshot(db.session.get(Case, row_id)) == before[row_id]
        assert db.session.get(Case, ids[2]).engine_version == cases.ENGINE_VERSION


def test_commits_every_100_and_resumes_after_interruption(app, reviewer, monkeypatch):
    with app.app_context():
        owner = User.query.one()
        for _ in range(205):
            add_case(owner)
        db.session.commit()
        original = db.session.commit
        calls = []
        def commit():
            calls.append(Case.query.filter_by(engine_version=cases.ENGINE_VERSION).count())
            if len(calls) == 2:
                raise RuntimeError("합성 중단")
            original()
        with monkeypatch.context() as patch:
            patch.setattr(db.session, "commit", commit)
            with pytest.raises(RuntimeError, match="합성 중단"):
                cases.rejudge_cases()
        db.session.rollback()
        assert calls == [100, 200]
        assert Case.query.filter_by(engine_version=cases.ENGINE_VERSION).count() == 100
        calls.clear()
        def resume_commit():
            calls.append(Case.query.filter_by(engine_version=cases.ENGINE_VERSION).count())
            original()
        with monkeypatch.context() as patch:
            patch.setattr(db.session, "commit", resume_commit)
            assert "대상 105건" in cases.rejudge_cases()
        assert calls == [200, 205]
        assert "대상 0건" in cases.rejudge_cases()


@pytest.mark.parametrize("actual, network_kind, expected", [
    ("PASS", "deny", True), ("DENY", "deny", False),
    ("PASS", "unsupported", False), ("DENY", "invalid", False),
])
def test_export_mismatch_uses_saved_engine_result_and_human_expect(app, reviewer, actual, network_kind, expected):
    with app.app_context():
        owner = User.query.one()
        network = stateful_unknown() if network_kind == "unsupported" else ({} if network_kind == "invalid" else copy.deepcopy(CASE["network"]))
        verdict, comparison = cases._judge(network, CASE["flow"], CASE["claim"])
        row = add_case(owner, actual_result=actual, network=network, verdict=verdict,
                       result=verdict["result"], comparison=comparison, engine_version=cases.ENGINE_VERSION)
        db.session.commit()
        row_id = row.id
    exported = reviewer.get(f"/api/cases/{row_id}/export").get_json()
    assert exported["expect"]["result"] == actual
    assert ("known_mismatch" in exported) == expected
    if expected:
        mismatch = exported["known_mismatch"]
        assert mismatch["engine_result"] == verdict["result"] == verify(network, CASE["flow"])["result"]
        assert mismatch["engine_result"] != exported["expect"]["result"]
        assert mismatch["engine_version"] == cases.ENGINE_VERSION
        assert f"사례 #{row_id}" in mismatch["note"]
        assert "device" not in exported["expect"]
