"""테스트용 토폴로지. 모두 손으로 만든 합성 구성이라 실제 장비 결과가 아니다."""

import copy

import pytest


def one_router() -> dict:
    """PC1 ─ R1 ─ SRV. R1 하나에 두 서브넷."""
    return {
        "devices": [
            {"id": "PC1", "kind": "host", "interfaces": [{"name": "eth0", "ip": "10.10.10.10/24"}], "gateway": "10.10.10.1"},
            {
                "id": "R1",
                "kind": "router",
                "interfaces": [{"name": "g0/0", "ip": "10.10.10.1/24"}, {"name": "g0/1", "ip": "10.20.20.1/24"}],
            },
            {"id": "SRV", "kind": "host", "interfaces": [{"name": "eth0", "ip": "10.20.20.5/24"}], "gateway": "10.20.20.1"},
        ],
        "acls": {},
    }


def two_routers() -> dict:
    """PC1 ─ R1 ═(192.168.12.0/30)═ R2 ─ SRV2. 양쪽에 정적 경로."""
    return {
        "devices": [
            {"id": "PC1", "kind": "host", "interfaces": [{"name": "eth0", "ip": "10.10.10.10/24"}], "gateway": "10.10.10.1"},
            {
                "id": "R1",
                "kind": "router",
                "interfaces": [{"name": "g0/0", "ip": "10.10.10.1/24"}, {"name": "s0/0", "ip": "192.168.12.1/30"}],
                "routes": [{"prefix": "10.30.30.0/24", "next_hop": "192.168.12.2"}],
            },
            {
                "id": "R2",
                "kind": "router",
                "interfaces": [{"name": "s0/0", "ip": "192.168.12.2/30"}, {"name": "g0/0", "ip": "10.30.30.1/24"}],
                "routes": [{"prefix": "10.10.10.0/24", "next_hop": "192.168.12.1"}],
            },
            {"id": "SRV2", "kind": "host", "interfaces": [{"name": "eth0", "ip": "10.30.30.5/24"}], "gateway": "10.30.30.1"},
        ],
        "acls": {},
    }


def device(net: dict, device_id: str) -> dict:
    return next(d for d in net["devices"] if d["id"] == device_id)


def interface(net: dict, device_id: str, name: str) -> dict:
    return next(i for i in device(net, device_id)["interfaces"] if i["name"] == name)


@pytest.fixture
def net1() -> dict:
    return copy.deepcopy(one_router())


@pytest.fixture
def net2() -> dict:
    return copy.deepcopy(two_routers())
