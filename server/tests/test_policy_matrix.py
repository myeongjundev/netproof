from conftest import CASE
from netproof_engine import policy_matrix


def payload(**patch):
    return {"network": CASE["network"], "spec": {"services": [{"proto": "tcp", "dst_port": 443}]}, **patch}


def test_anonymous_contract_matches_engine(api):
    body = payload()
    response = api.post("/api/policy-matrix", body)
    assert response.status_code == 200
    assert response.get_json() == policy_matrix(body["network"], body["spec"])
    assert response.headers["Cache-Control"] == "no-store"


def test_spec_limit_422(api):
    response = api.post("/api/policy-matrix", payload(spec={"services": [{"proto": "icmp"}] * 9}))
    assert response.status_code == 422
    assert response.get_json()["limit_exceeded"] is True


def test_network_limit_422(api):
    response = api.post("/api/policy-matrix", payload(network={"devices": [{}] * 41}))
    assert response.status_code == 422
    assert "40" in response.get_json()["detail"]


def test_invalid_contract_200_and_guard_still_applies(api):
    assert api.post("/api/policy-matrix", payload(spec=None)).get_json()["status"] == "INVALID"
    assert api.client.post("/api/policy-matrix", json=payload()).status_code == 403
    api.register("matrix-user")
    assert api.post("/api/policy-matrix", payload(), headers={"X-CSRF-Token": "bad"}).status_code == 403
    assert api.post("/api/policy-matrix", payload()).status_code == 200
