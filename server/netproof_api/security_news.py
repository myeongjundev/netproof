"""네트워크·보안 장비 보안 소식(CISA KEV, docs/v1.1-design.md §C).

정해진 주소 하나만 받는다(사용자가 주소를 넘길 수 없다). 시간·크기를 제한하고 6시간 저장한다.
공개 자료라 로그인 없이 부를 수 있다(2026-10-24 사용자 결정). 받는 동안에는 잠가서 동시에 여러 번 받으러 가지 않는다.
실패하면 저장해 둔 것을 '오래된 자료'로 주거나 502를 준다. 오류에 내부 정보를 넣지 않는다.
"""

from __future__ import annotations

import json
import re
import threading
import time
import urllib.request
from datetime import datetime, timezone

from flask import Blueprint, jsonify

from .auth import error

bp = Blueprint("security_news", __name__, url_prefix="/api")

KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
CATALOG_URL = "https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
VENDORS = ("Cisco", "Fortinet", "Palo Alto Networks", "Juniper", "Netgate", "SonicWall", "Ivanti", "Citrix",
           "F5", "Check Point", "Zyxel", "MikroTik", "Ubiquiti", "TP-Link", "D-Link", "Sophos")
LIMIT = 10
TTL = 6 * 3600
TIMEOUT = 5
MAX_BYTES = 5 * 1024 * 1024
_CVE = re.compile(r"CVE-\d{4}-\d{4,7}")
_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
_FIELDS = ("cveID", "vendorProject", "product", "vulnerabilityName", "dateAdded", "shortDescription")

_cache: dict = {"at": 0.0, "payload": None}
# ponytail: 인스턴스마다 메모리 저장 — 서버리스 인스턴스가 늘면 각자 한 번씩 받는다. 필요하면 DB·KV 저장으로.
_lock = threading.Lock()
_fetch_lock = threading.Lock()  # 한 인스턴스에서 CISA에 한 번에 하나만 받으러 간다


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # 고정 주소가 다른 곳을 가리켜도 따라가지 않는다. 기존 502/stale 처리로 보낸다.
        return None


def _download() -> bytes:
    request = urllib.request.Request(KEV_URL, headers={"User-Agent": "NetProof/1.1 (+https://netproof-vert.vercel.app)"})
    opener = urllib.request.build_opener(_NoRedirect())
    with opener.open(request, timeout=TIMEOUT) as response:
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("catalog too large")
    return data


def _valid(item) -> bool:
    return (isinstance(item, dict) and all(isinstance(item.get(key), str) for key in _FIELDS)
            and _CVE.fullmatch(item["cveID"]) is not None and _DATE.fullmatch(item["dateAdded"]) is not None)


def _parse(raw: bytes, fetched_at: str) -> dict:
    data = json.loads(raw)
    items = data["vulnerabilities"]
    if not isinstance(items, list):
        raise TypeError("vulnerabilities must be a list")
    picked = [item for item in items if _valid(item) and item["vendorProject"] in VENDORS]
    picked.sort(key=lambda item: (item["dateAdded"], item["cveID"]), reverse=True)
    return {
        "source": "CISA KEV", "catalog_version": str(data.get("catalogVersion", "")), "catalog_url": CATALOG_URL,
        "fetched_at": fetched_at, "stale": False, "vendors": list(VENDORS), "total": len(picked),
        "items": [{
            "cve": item["cveID"], "vendor": item["vendorProject"], "product": item["product"],
            "name": item["vulnerabilityName"], "date_added": item["dateAdded"], "description": item["shortDescription"],
            "ransomware": item.get("knownRansomwareCampaignUse") == "Known",
            "nvd": f"https://nvd.nist.gov/vuln/detail/{item['cveID']}",
        } for item in picked[:LIMIT]],
    }


def _fresh(now: float):
    with _lock:
        cached, at = _cache["payload"], _cache["at"]
    return cached, bool(cached) and now - at < TTL


@bp.get("/security-news")
def security_news():
    cached, fresh = _fresh(time.time())
    if fresh:
        return jsonify(cached)
    with _fetch_lock:
        # 기다리는 사이 다른 요청이 새로 받았으면 그것을 쓴다.
        now = time.time()
        cached, fresh = _fresh(now)
        if fresh:
            return jsonify(cached)
        try:
            payload = _parse(_download(), datetime.now(timezone.utc).isoformat(timespec="seconds"))
        except (OSError, ValueError, KeyError, TypeError):
            if cached:
                return jsonify({**cached, "stale": True})
            return error(502, "보안 소식을 가져오지 못했습니다. 잠시 뒤 다시 시도하세요", reason="upstream")
        with _lock:
            _cache.update(at=now, payload=payload)
    return jsonify(payload)
