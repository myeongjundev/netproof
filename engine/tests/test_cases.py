"""cases/ 폴더의 사례 파일을 모두 판정해 기대값과 맞춘다.

합성 사례(source가 '합성')는 엔진이 명세대로 동작하는지만 확인한다.
실제 장비 결과가 붙은 동기 사례가 들어오면 같은 방식으로 정답 비교가 된다.
"""

import json
from pathlib import Path

import pytest

from netproof_engine import verify

CASES = sorted((Path(__file__).resolve().parents[2] / "cases").glob("*.json"))


def case_params(paths):
    params = []
    for path in paths:
        case = json.loads(path.read_text(encoding="utf-8"))
        marks = []
        if "known_mismatch" in case:
            mismatch = case["known_mismatch"]
            note = mismatch.get("note", "형식 검사를 확인하세요") if isinstance(mismatch, dict) else "형식 검사를 확인하세요"
            marks.append(pytest.mark.xfail(strict=True, reason=f"{note} — 고쳐지면 known_mismatch만 지우고 expect는 유지"))
        params.append(pytest.param(path, id=path.stem, marks=marks))
    return params


def validate_known_mismatch(case):
    if "known_mismatch" not in case:
        return
    mismatch = case["known_mismatch"]
    assert isinstance(mismatch, dict)
    assert mismatch.get("engine_result") in ("PASS", "DENY")
    assert mismatch["engine_result"] != case["expect"]["result"]
    assert "device" not in case["expect"]
    assert isinstance(mismatch.get("engine_version"), str) and mismatch["engine_version"].strip()
    assert isinstance(mismatch.get("note"), str) and mismatch["note"].strip()


@pytest.mark.parametrize("path", CASES, ids=[p.stem for p in CASES])
def test_known_mismatch_format_outside_xfail(path):
    validate_known_mismatch(json.loads(path.read_text(encoding="utf-8")))


@pytest.mark.parametrize("path", case_params(CASES))
def test_case_file(path):
    case = json.loads(path.read_text(encoding="utf-8"))
    verdict = verify(case["network"], case["flow"])
    expect = case["expect"]
    assert verdict["result"] == expect["result"], verdict["reason"]
    if expect.get("device"):
        decisive = verdict["decisive"]
        assert (decisive["device"], decisive["step"], decisive["rule_seq"]) == (
            expect["device"], expect["step"], expect.get("rule_seq"),
        )


def test_there_are_cases():
    assert CASES, "cases/ 폴더에 사례가 없습니다"


def test_params_mark_only_known_mismatch_strict_and_keep_expect(tmp_path):
    ordinary = tmp_path / "ordinary.json"
    mismatch = tmp_path / "mismatch.json"
    case = {"expect": {"result": "DENY"}}
    ordinary.write_text(json.dumps(case), encoding="utf-8")
    case["known_mismatch"] = {"engine_result": "PASS", "engine_version": "0.2.0", "note": "시험"}
    mismatch.write_text(json.dumps(case), encoding="utf-8")
    params = case_params([ordinary, mismatch])
    assert not params[0].marks
    mark, = params[1].marks
    assert mark.name == "xfail" and mark.kwargs["strict"] is True
    assert "expect는 유지" in mark.kwargs["reason"]
    validate_known_mismatch(case)
    assert json.loads(mismatch.read_text(encoding="utf-8"))["expect"] == {"result": "DENY"}


@pytest.mark.parametrize("change", [
    {"engine_result": "INVALID"}, {"engine_result": "DENY"},
    {"engine_version": None}, {"note": 1}, {"note": ""},
    {"device": "router"}, {"not_object": True},
])
def test_bad_mismatch_format_is_not_xfailed(tmp_path, change):
    case = {"expect": {"result": "DENY"}, "known_mismatch": {
        "engine_result": "PASS", "engine_version": "0.2.0", "note": "시험",
    }}
    if "device" in change:
        case["expect"].update(change)
    elif "not_object" in change:
        case["known_mismatch"] = None
    else:
        case["known_mismatch"].update(change)
    path = tmp_path / "bad.json"
    path.write_text(json.dumps(case), encoding="utf-8")
    case_params([path])  # 수집은 가능하지만 별도 형식 검사가 실패해야 한다.
    with pytest.raises(AssertionError):
        validate_known_mismatch(json.loads(path.read_text(encoding="utf-8")))
