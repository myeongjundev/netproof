from conftest import CASE

ACTUAL = {"result": "DENY", "source": "ping", "note": "실습망에서 443 접속 실패"}


def test_verify_is_open_without_login(api):
    response = api.post("/api/verify", {"network": CASE["network"], "flow": CASE["flow"], "claim": CASE["claim"]})
    body = response.get_json()
    assert (body["result"], body["comparison"]) == ("DENY", "DISAGREE")


def test_examples_are_public(api):
    assert "synthetic-01" in [item["id"] for item in api.get("/api/examples").get_json()]


def test_practice_examples_do_not_publish_truth(api):
    examples = api.get("/api/examples").get_json()
    assert examples
    for example in examples:
        assert set(example) == {"id", "title", "source", "network", "flow", "claim"}


def test_clone_is_new_ownership_and_recomputed_without_confirmation(api, other, reviewer):
    assert api.register("원본작성자").status_code == 201
    original_id = api.save_case().get_json()["id"]
    api.patch(f"/api/cases/{original_id}", {"actual": ACTUAL})
    original = reviewer.post(f"/api/cases/{original_id}/confirm").get_json()
    assert other.register("복제작성자").status_code == 201
    response = other.post("/api/cases", {
        "title": "복제 · 다시 풀기", "network": original["network"], "flow": original["flow"],
        "claim": None, "verdict": {"result": "PASS"}, "result": "PASS",
        "owner_id": original["owner_id"], "actual": ACTUAL,
        "confirmed": True, "confirmed_by": original["confirmed_by"],
    })
    cloned = response.get_json()
    assert response.status_code == 201
    assert cloned["id"] != original_id
    assert cloned["owner_id"] != original["owner_id"]
    assert cloned["author"] == "복제작성자"
    assert cloned["actual"] == {"result": None, "source": None, "note": ""}
    assert cloned["confirmed"] is False and cloned["confirmed_by"] is None
    assert cloned["claim"] is None
    assert cloned["result"] == cloned["verdict"]["result"] == "DENY"
    assert cloned["network"] == original["network"] and cloned["flow"] == original["flow"]
    assert api.get(f"/api/cases/{original_id}").get_json() == original


def test_body_and_count_limits(api):
    huge = {"network": {"devices": [], "acls": {"A": ["permit ip any any"] * 5000}}, "flow": CASE["flow"]}
    assert api.post("/api/verify", huge).status_code == 413
    many = {"network": {"devices": [], "acls": {"A": ["deny ip any any"] * 600}}, "flow": CASE["flow"]}
    assert api.post("/api/verify", many).status_code == 422


def test_board_requires_login(api):
    assert api.get("/api/cases").status_code == 401
    assert api.save_case().status_code == 401


def test_saved_verdict_is_computed_by_server_not_client(api):
    api.register("동기A")
    response = api.save_case(verdict={"result": "PASS"}, result="PASS")
    body = response.get_json()
    assert response.status_code == 201
    assert body["result"] == "DENY" and body["verdict"]["decisive"]["rule_seq"] == 1


def test_only_owner_can_edit(api, other):
    api.register("동기A")
    case_id = api.save_case().get_json()["id"]
    other.register("동기B")
    assert other.patch(f"/api/cases/{case_id}", {"title": "남의 글"}).status_code == 403
    assert other.delete(f"/api/cases/{case_id}").status_code == 403
    assert api.patch(f"/api/cases/{case_id}", {"title": "내 글"}).get_json()["title"] == "내 글"


def test_plain_user_cannot_confirm_and_reviewer_can(api, reviewer):
    api.register("동기A")
    case_id = api.save_case().get_json()["id"]
    api.patch(f"/api/cases/{case_id}", {"actual": ACTUAL})
    assert api.post(f"/api/cases/{case_id}/confirm").status_code == 403
    confirmed = reviewer.post(f"/api/cases/{case_id}/confirm").get_json()
    assert confirmed["confirmed"] and confirmed["confirmed_by"] == "검토자"


def test_confirm_needs_actual_result(api, reviewer):
    api.register("동기A")
    case_id = api.save_case().get_json()["id"]
    assert reviewer.post(f"/api/cases/{case_id}/confirm").status_code == 400


def test_changing_truth_after_confirmation_clears_it(api, reviewer):
    api.register("동기A")
    case_id = api.save_case().get_json()["id"]
    api.patch(f"/api/cases/{case_id}", {"actual": ACTUAL})
    reviewer.post(f"/api/cases/{case_id}/confirm")
    assert api.patch(f"/api/cases/{case_id}", {"title": "제목만 바꿈"}).get_json()["confirmed"]
    after = api.patch(f"/api/cases/{case_id}", {"actual": {**ACTUAL, "result": "PASS"}}).get_json()
    assert not after["confirmed"]


def test_editing_network_reverifies_and_clears_confirmation(api, reviewer):
    api.register("동기A")
    case_id = api.save_case().get_json()["id"]
    api.patch(f"/api/cases/{case_id}", {"actual": ACTUAL})
    reviewer.post(f"/api/cases/{case_id}/confirm")
    network = {**CASE["network"], "acls": {"101": ["permit ip any any"]}}
    after = api.patch(f"/api/cases/{case_id}", {"network": network}).get_json()
    assert (after["result"], after["confirmed"]) == ("PASS", False)


def test_mine_filter(api, other):
    api.register("동기A")
    api.save_case("A의 사례")
    other.register("동기B")
    other.save_case("B의 사례")
    assert [c["title"] for c in other.get("/api/cases?mine=1").get_json()] == ["B의 사례"]
    assert len(other.get("/api/cases").get_json()) == 2


def test_dashboard_numbers_and_access(api, reviewer):
    api.register("동기A")
    assert api.get("/api/dashboard").status_code == 403
    agree = api.save_case("일치", claim={"expected": "PASS", "kind": "ai", "source": "ChatGPT"}).get_json()["id"]
    wrong = api.save_case("불일치").get_json()["id"]
    api.save_case("범위 밖", flow={**CASE["flow"], "dst": "8.8.8.8"})
    api.patch(f"/api/cases/{agree}", {"actual": ACTUAL})
    api.patch(f"/api/cases/{wrong}", {"actual": {**ACTUAL, "result": "PASS"}})
    reviewer.post(f"/api/cases/{agree}/confirm")
    reviewer.post(f"/api/cases/{wrong}/confirm")
    board = reviewer.get("/api/dashboard").get_json()
    assert (board["total"], board["confirmed_in_scope"], board["agree"], board["unsupported"]) == (3, 2, 1, 1)
    assert (board["ai_confirmed"], board["ai_wrong"]) == (1, 1)
    assert [m["title"] for m in board["mismatches"]] == ["불일치"]


def test_export_only_confirmed(api, reviewer):
    api.register("동기A")
    case_id = api.save_case().get_json()["id"]
    assert reviewer.get(f"/api/cases/{case_id}/export").status_code == 400
    api.patch(f"/api/cases/{case_id}", {"actual": ACTUAL})
    reviewer.post(f"/api/cases/{case_id}/confirm")
    exported = reviewer.get(f"/api/cases/{case_id}/export").get_json()
    assert exported["expect"] == {"result": "DENY", "device": "R1", "step": "acl_in", "rule_seq": 1}
    assert "동기A" not in exported["source"]


def test_reviewer_can_delete_any_case(api, reviewer):
    api.register("동기A")
    case_id = api.save_case().get_json()["id"]
    assert reviewer.delete(f"/api/cases/{case_id}").status_code == 200
