from conftest import CASE


def test_verify_returns_acl_evidence(api):
    response = api.post("/api/verify", {"network": CASE["network"], "flow": CASE["flow"]})
    assert response.status_code == 200
    hop = response.get_json()["decisive"]
    assert (hop["acl"], hop["rule_line"], hop["rule_seq"]) == ("101", 1, 1)
