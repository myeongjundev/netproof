"""사례 파일 하나를 판정해 읽기 쉬운 글로 보여 준다: python -m netproof_engine cases/example.json"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from . import compare, verify

LABEL = {"AGREE": "일치", "DISAGREE": "불일치", "NOT_COMPARABLE": "비교 불가(판정 못 함)", "NO_CLAIM": "받은 답 없음"}


def render(case: dict) -> str:
    verdict = verify(case["network"], case["flow"])
    claim = case.get("claim") or {}
    lines = [f"판정: {verdict['result']} — {verdict['reason']}"]
    for problem in verdict["problems"]:
        lines.append(f"  - {problem}")
    for title, key in (("정방향", "forward"), ("복귀", "return")):
        part = verdict[key]
        if not part:
            continue
        lines.append(f"{title}:")
        for hop in part["hops"]:
            mark = "✓" if hop["result"] == "ok" else "✗"
            rule = f"  [{hop['rule']}]" if hop["rule"] else ""
            lines.append(f"  {mark} {hop['device']} · {hop['detail']}{rule}")
    if claim:
        lines.append(f"받은 답({claim.get('source', '출처 미기재')}): {claim.get('expected')} → {LABEL[compare(verdict, claim.get('expected'))]}")
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("사용법: python -m netproof_engine <사례.json>", file=sys.stderr)
        return 2
    case = json.loads(Path(argv[1]).read_text(encoding="utf-8"))
    sys.stdout.reconfigure(encoding="utf-8")
    print(render(case))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
