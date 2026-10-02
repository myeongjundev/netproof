from conftest import CASE

TEXT = f"Nmap scan report for {CASE['flow']['dst']}\nPORT STATE SERVICE\n443/tcp open https"


def test_observe_requires_login(api):
    assert api.post("/api/observe", {"text": TEXT, "flow": CASE["flow"]}).status_code == 401


def test_observe_contract_and_input_errors(api):
    api.register("파서테스트")
    response = api.post("/api/observe", {"text": TEXT, "flow": CASE["flow"]})
    assert response.status_code == 200
    body = response.get_json()
    assert set(body) == {"status", "problems", "tool", "observed", "result", "source", "note", "target", "evidence"}
    assert body["result"] == "PASS" and body["source"] == "nmap"
    for text in (None, 42, "x" * 4001, "\n" * 81):
        bad = api.post("/api/observe", {"text": text, "flow": CASE["flow"]})
        assert bad.status_code == 200 and bad.get_json()["status"] == "REJECTED"
    assert api.post("/api/observe", []).status_code == 400


def test_parse_does_not_change_cases_and_existing_save_clears_confirmation(api, reviewer):
    api.register("관측작성자")
    case_id = api.save_case().get_json()["id"]
    api.patch(f"/api/cases/{case_id}", {"actual": {"result": "DENY", "source": "ping", "note": "원래 메모"}})
    original = reviewer.post(f"/api/cases/{case_id}/confirm").get_json()
    board_before = api.get("/api/cases").get_json()
    candidate = api.post("/api/observe", {"text": TEXT, "flow": original["flow"]}).get_json()
    assert api.get(f"/api/cases/{case_id}").get_json() == original
    assert api.get("/api/cases").get_json() == board_before
    saved = api.patch(f"/api/cases/{case_id}", {"actual": {k: candidate[k] for k in ("result", "source", "note")}}).get_json()
    assert saved["actual"]["result"] == "PASS" and saved["confirmed"] is False
    assert saved["verdict"] == original["verdict"] and saved["result"] == original["result"]


def test_security_headers_body_limit_and_csrf(api):
    api.register("가드테스트")
    response = api.post("/api/observe", {"text": TEXT, "flow": CASE["flow"]})
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert api.client.post("/api/observe", json={"text": TEXT, "flow": CASE["flow"]}).status_code == 403
    assert api.post("/api/observe", {"text": "x" * 70000, "flow": CASE["flow"]}).status_code == 413
