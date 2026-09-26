"""cases/ 폴더의 사례 파일을 모두 판정해 기대값과 맞춘다.

합성 사례(source가 '합성')는 엔진이 명세대로 동작하는지만 확인한다.
실제 장비 결과가 붙은 동기 사례가 들어오면 같은 방식으로 정답 비교가 된다.
"""

import json
from pathlib import Path

import pytest

from netproof_engine import verify

CASES = sorted((Path(__file__).resolve().parents[2] / "cases").glob("*.json"))


@pytest.mark.parametrize("path", CASES, ids=[p.stem for p in CASES])
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
