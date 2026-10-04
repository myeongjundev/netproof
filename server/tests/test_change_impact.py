import pytest
from conftest import CASE
from netproof_engine.change import change_impact


def payload(**patch):
    return {"before": CASE["network"], "after": CASE["network"], "flow": CASE["flow"],
            "services": [{"proto": "tcp", "dst_port": 443}], **patch}


def test_anonymous_engine_contract(api):
    body = payload()
    response = api.post("/api/change-impact", body)
    assert response.status_code == 200 and response.get_json() == change_impact(**body)
    assert response.headers["Cache-Control"] == "no-store"
    assert api.post("/api/change-impact", payload(flow=None)).get_json()["status"] == "INVALID"


def test_limit_and_csrf(api):
    assert api.post("/api/change-impact", payload(services=[{"proto": "icmp"}] * 9)).status_code == 422
    assert api.client.post("/api/change-impact", json=payload()).status_code == 403
    api.register("impact-user")
    assert api.post("/api/change-impact", payload(), headers={"X-CSRF-Token": "bad"}).status_code == 403
    assert api.post("/api/change-impact", payload()).status_code == 200


@pytest.mark.parametrize("side", ["before", "after"])
@pytest.mark.parametrize("network", [{"devices": [{}] * 41}, {"devices": [{"interfaces": [{}] * 17}]},
                                     {"devices": [{"routes": [{}] * 101}]}, {"acls": {"A": ["deny ip any any"] * 501}}])
def test_network_size_both_sides(api, side, network):
    response = api.post("/api/change-impact", payload(**{side: network}))
    assert response.status_code == 422 and response.get_json()["detail"]


def test_combined_request_size_limit(api):
    network = {"devices": [], "acls": {"A": ["remark " + "x" * 34000]}}
    assert api.post("/api/change-impact", payload(before=network, after=network)).status_code == 413
