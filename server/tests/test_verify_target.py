from conftest import CASE


def test_verify_response_includes_engine_target(api):
    response = api.post("/api/verify", {"network": CASE["network"], "flow": CASE["flow"]})
    assert response.status_code == 200
    verdict = response.get_json()
    assert verdict["forward"]["target"] == {"device": "SRV", "interface": "eth0", "ip": "10.20.20.5"}
    assert verdict["return"] is None
