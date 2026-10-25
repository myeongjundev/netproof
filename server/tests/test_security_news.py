"""네트워크 장비 보안 소식(CISA KEV) — 외부 요청은 가짜로 바꾼다. 실제 CISA에 접속하지 않는다."""
import json
from email.message import Message
from io import BytesIO
from urllib.response import addinfourl

import pytest

from netproof_api import security_news


def entry(cve, vendor, date, ransomware="Unknown", product="Product"):
    return {"cveID": cve, "vendorProject": vendor, "product": product, "vulnerabilityName": f"{vendor} {product} Vulnerability",
            "dateAdded": date, "shortDescription": "English description.", "requiredAction": "Apply mitigations.",
            "dueDate": date, "knownRansomwareCampaignUse": ransomware, "notes": "", "cwes": []}


CATALOG = {
    "title": "CISA Catalog of Known Exploited Vulnerabilities", "catalogVersion": "2026.10.23", "count": 14,
    "vulnerabilities": [entry(f"CVE-2026-{1000 + i}", "Cisco", f"2026-09-{10 + i:02d}") for i in range(11)] + [
        entry("CVE-2026-9001", "Microsoft", "2026-10-20"),
        entry("CVE-2026-9002", "Fortinet", "2026-10-16", ransomware="Known", product="FortiOS"),
        entry("CVE-2026-9003", "Netgate", "2026-10-01", product="pfSense"),
    ],
}


@pytest.fixture(autouse=True)
def fresh_cache(monkeypatch):
    monkeypatch.setattr(security_news, "_cache", {"at": 0.0, "payload": None})


@pytest.fixture
def downloads(monkeypatch):
    calls = []

    def fake():
        calls.append(1)
        return json.dumps(CATALOG).encode("utf-8")

    monkeypatch.setattr(security_news, "_download", fake)
    return calls


@pytest.fixture
def member(api):
    assert api.register("소식학생").status_code == 201
    return api


def test_public_without_login(api, downloads):
    # 공개 자료라 로그인 없이 본다(2026-10-24 사용자 결정). 쓰기 요청이 아니라 CSRF 검사도 없다.
    response = api.get("/api/security-news")
    assert response.status_code == 200
    assert len(response.get_json()["items"]) == 10 and len(downloads) == 1


def test_download_runs_under_the_fetch_lock(api, monkeypatch):
    seen = []

    def fake():
        seen.append(security_news._fetch_lock.locked())
        return json.dumps(CATALOG).encode("utf-8")

    monkeypatch.setattr(security_news, "_download", fake)
    api.get("/api/security-news")
    assert seen == [True]
    assert not security_news._fetch_lock.locked()


def test_network_vendors_latest_ten_with_source_and_time(member, downloads):
    body = member.get("/api/security-news").get_json()
    assert body["source"] == "CISA KEV" and body["catalog_version"] == "2026.10.23" and body["stale"] is False
    assert body["fetched_at"].endswith("+00:00")
    assert body["total"] == 13  # Microsoft는 네트워크 장비 업체 목록에 없다
    assert [item["cve"] for item in body["items"]][:3] == ["CVE-2026-9002", "CVE-2026-9003", "CVE-2026-1010"]
    assert len(body["items"]) == 10
    first = body["items"][0]
    assert first == {"cve": "CVE-2026-9002", "vendor": "Fortinet", "product": "FortiOS", "name": "Fortinet FortiOS Vulnerability",
                     "date_added": "2026-10-16", "description": "English description.", "ransomware": True,
                     "nvd": "https://nvd.nist.gov/vuln/detail/CVE-2026-9002"}
    assert body["catalog_url"] == "https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
    assert "Netgate" in body["vendors"] and len(body["vendors"]) == 16


def test_cached_for_six_hours(member, downloads, monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(security_news.time, "time", lambda: clock[0])
    member.get("/api/security-news"); member.get("/api/security-news")
    assert len(downloads) == 1
    clock[0] += 6 * 3600 + 1
    member.get("/api/security-news")
    assert len(downloads) == 2


@pytest.mark.parametrize("failure", [OSError("timed out"), ValueError("too large")])
def test_failure_without_cache_is_502_without_internal_details(member, monkeypatch, failure):
    def broken():
        raise failure

    monkeypatch.setattr(security_news, "_download", broken)
    response = member.get("/api/security-news")
    assert response.status_code == 502
    text = response.get_data(as_text=True)
    assert "timed out" not in text and "too large" not in text and "Traceback" not in text
    assert response.get_json()["reason"] == "upstream"


def test_failure_after_expiry_serves_stale_copy(member, downloads, monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(security_news.time, "time", lambda: clock[0])
    member.get("/api/security-news")
    clock[0] += 6 * 3600 + 1

    def broken():
        raise OSError("down")

    monkeypatch.setattr(security_news, "_download", broken)
    body = member.get("/api/security-news").get_json()
    assert body["stale"] is True and len(body["items"]) == 10


@pytest.mark.parametrize("raw", [b"not json", json.dumps({"vulnerabilities": "x"}).encode(),
                                 json.dumps({"vulnerabilities": [entry("not-a-cve", "Cisco", "2026-10-01")]}).encode()])
def test_malformed_catalog_is_rejected_or_skipped(member, monkeypatch, raw):
    monkeypatch.setattr(security_news, "_download", lambda: raw)
    response = member.get("/api/security-news")
    if response.status_code == 200:
        assert response.get_json()["items"] == []  # 형식이 틀린 항목은 버린다
    else:
        assert response.status_code == 502


def test_download_uses_only_the_fixed_url_with_limits(monkeypatch):
    seen = {}

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def read(self, size):
            seen["size"] = size
            return b"x" * (security_news.MAX_BYTES + 1)

    def fake_open(self, request, timeout):
        seen["url"], seen["timeout"] = request.full_url, timeout
        return Response()

    monkeypatch.setattr(security_news.urllib.request.OpenerDirector, "open", fake_open)
    with pytest.raises(ValueError):
        security_news._download()
    assert seen == {"url": security_news.KEV_URL, "timeout": 5, "size": security_news.MAX_BYTES + 1}


@pytest.mark.parametrize("code", [301, 302, 303, 307, 308])
@pytest.mark.parametrize("cached", [False, True])
def test_redirect_never_contacts_another_address(api, monkeypatch, code, cached):
    # 실제 urllib 처리 경로를 쓰되 HTTPS 전송만 메모리 응답으로 바꾼다. 외부 접속은 없다.
    calls = []

    def transport(self, request):
        calls.append(request.full_url)
        headers = Message()
        if request.full_url == security_news.KEV_URL:
            headers["Location"] = "https://redirect-target.invalid/catalog"
            response = addinfourl(BytesIO(b""), headers, request.full_url, code)
            response.msg = "Redirect"
        else:
            response = addinfourl(BytesIO(json.dumps(CATALOG).encode()), headers, request.full_url, 200)
            response.msg = "OK"
        return response

    monkeypatch.setattr(security_news.urllib.request.HTTPSHandler, "https_open", transport)
    if cached:
        security_news._cache.update(at=1.0, payload=security_news._parse(json.dumps(CATALOG).encode(), "old"))
    response = api.get("/api/security-news")
    assert calls == [security_news.KEV_URL]
    if cached:
        assert response.status_code == 200
        assert response.get_json()["stale"] is True
        assert response.get_json()["fetched_at"] == "old"
    else:
        assert response.status_code == 502
        assert response.get_json()["reason"] == "upstream"
    assert "redirect-target" not in response.get_data(as_text=True)


def test_download_accepts_a_direct_response_without_changing_bytes(monkeypatch):
    raw = json.dumps(CATALOG).encode()

    def transport(self, request):
        assert request.full_url == security_news.KEV_URL
        response = addinfourl(BytesIO(raw), Message(), request.full_url, 200)
        response.msg = "OK"
        return response

    monkeypatch.setattr(security_news.urllib.request.HTTPSHandler, "https_open", transport)
    assert security_news._download() == raw
