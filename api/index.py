"""Vercel 서버리스 진입점. /api/* 요청은 모두 이 파일의 Flask 앱이 받는다(vercel.json rewrites).

api/ 폴더의 파이썬 파일은 하나하나 함수가 되므로, 이 파일 하나만 둔다.
서버 코드는 server/, 판정 엔진은 engine/src에 있고 vercel.json의 includeFiles로 함께 실린다.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
for path in (ROOT / "server", ROOT / "engine" / "src"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from netproof_api import create_app  # noqa: E402

app = create_app()
