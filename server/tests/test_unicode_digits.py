from copy import deepcopy

from conftest import CASE


def test_verify_unicode_digit_acl_returns_unsupported_instead_of_500(api):
    network = deepcopy(CASE["network"])
    network["acls"]["101"] = ["² deny ip any any"]

    response = api.post("/api/verify", {"network": network, "flow": CASE["flow"]})

    assert response.status_code == 200
    assert response.get_json()["result"] == "UNSUPPORTED"
