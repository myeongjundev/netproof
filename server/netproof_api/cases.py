"""판정·예시·사례 게시판·대시보드 API."""

from __future__ import annotations

import json
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import case as sql_case, func, or_
from sqlalchemy.orm import contains_eager, joinedload

from netproof_engine import __version__ as ENGINE_VERSION
from netproof_engine import compare, observe, policy_matrix, verify

from .auth import current_user, error, login_required, reviewer_required
from .models import ACTUAL_RESULTS, ACTUAL_SOURCES, Case, User, db, utcnow

bp = Blueprint("cases", __name__, url_prefix="/api")

LIMITS = {"devices": 40, "interfaces": 16, "routes": 100, "acl_lines": 500}
CLAIM_KINDS = ("ai", "self")


def _body() -> dict:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def _limit_problem(network) -> str | None:
    """형태가 틀린 입력은 엔진이 INVALID로 돌려주므로 여기서는 크기만 본다."""
    if not isinstance(network, dict):
        return None
    devices = network.get("devices") or []
    if isinstance(devices, list):
        if len(devices) > LIMITS["devices"]:
            return f"장비는 {LIMITS['devices']}개까지입니다"
        for device in devices:
            if not isinstance(device, dict):
                continue
            for key in ("interfaces", "routes"):
                items = device.get(key) or []
                if isinstance(items, list) and len(items) > LIMITS[key]:
                    return f"장비 하나의 {key}는 {LIMITS[key]}개까지입니다"
    acls = network.get("acls") or {}
    if isinstance(acls, dict) and sum(len(v) for v in acls.values() if isinstance(v, list)) > LIMITS["acl_lines"]:
        return f"ACL 줄은 모두 합쳐 {LIMITS['acl_lines']}줄까지입니다"
    return None


def _clean_claim(raw) -> dict | None:
    if not isinstance(raw, dict) or raw.get("expected") not in ("PASS", "DENY"):
        return None
    return {
        "expected": raw["expected"],
        "kind": raw.get("kind") if raw.get("kind") in CLAIM_KINDS else None,
        "source": str(raw.get("source") or "")[:200],
        "text": str(raw.get("text") or "")[:2000],
    }


def _judge(network, flow, claim) -> tuple[dict, str]:
    verdict = verify(network if isinstance(network, dict) else {}, flow if isinstance(flow, dict) else {})
    return verdict, compare(verdict, claim["expected"] if claim else None)


@bp.post("/verify")
def verify_endpoint():
    data = _body()
    if problem := _limit_problem(data.get("network")):
        return error(422, problem)
    verdict, comparison = _judge(data.get("network"), data.get("flow"), _clean_claim(data.get("claim")))
    return jsonify({**verdict, "comparison": comparison})


@bp.post("/policy-matrix")
def matrix_endpoint():
    data = _body()
    if problem := _limit_problem(data.get("network")):
        return error(422, problem)
    result = policy_matrix(data.get("network"), data.get("spec"))
    return jsonify(result), 422 if result["limit_exceeded"] else 200


@bp.post("/observe")
@login_required
def observe_endpoint():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error(400, "본문은 객체여야 합니다")
    return jsonify(observe(data.get("text"), data.get("flow")))


@bp.get("/examples")
def examples():
    items = []
    for path in sorted(Path(current_app.config["CASES_DIR"]).glob("*.json")):
        case = json.loads(path.read_text(encoding="utf-8"))
        items.append({key: case.get(key) for key in ("id", "title", "source", "network", "flow", "claim")})
    return jsonify(items)


def _owned(case_id: int):
    case = db.session.get(Case, case_id)
    if case is None:
        return None, error(404, "없는 사례입니다")
    if case.owner_id != current_user().id:
        return None, error(403, "자기 사례만 고칠 수 있습니다", reason="not_owner")
    return case, None


@bp.get("/cases")
@login_required
def list_cases():
    # page/per_page를 보내는 새 화면은 메타데이터를 받는다. 기존 배열 응답은 유지한다.
    paged = "page" in request.args or "per_page" in request.args
    numbers = {}
    for key, default, maximum in (("page", "1", 1000000), ("per_page", "20", 100)):
        raw = request.args.get(key, default)
        if not raw.isascii() or not raw.isdecimal() or len(raw) > 7:
            return error(400, f"{key}는 7자리 이하 ASCII 숫자여야 합니다")
        if not 1 <= int(raw) <= maximum:
            return error(400, f"{key}는 1~{maximum} 사이 정수여야 합니다")
        numbers[key] = int(raw)
    allowed = {
        "result": ("PASS", "DENY", "UNSUPPORTED", "INVALID"),
        "comparison": ("AGREE", "DISAGREE", "NOT_COMPARABLE", "NO_CLAIM"),
        "confirmed": ("1", "0"), "source": (*ACTUAL_SOURCES, "none"), "mine": ("1", "0"),
        "actual": (*ACTUAL_RESULTS, "none"), "claim_kind": (*CLAIM_KINDS, "none"),
        "claim_expected": ACTUAL_RESULTS,
    }
    for key, values in allowed.items():
        if request.args.get(key, "") not in ("", *values):
            return error(400, f"알 수 없는 {key} 필터입니다")
    search = request.args.get("q", "").strip()
    if len(search) > 100:
        return error(400, "검색어는 100자까지입니다")
    query = Case.query
    if request.args.get("mine") == "1":
        query = query.filter_by(owner_id=current_user().id)
    for key in ("result", "comparison"):
        if value := request.args.get(key):
            query = query.filter(getattr(Case, key) == value)
    if confirmed := request.args.get("confirmed"):
        query = query.filter(Case.confirmed_at.is_not(None) if confirmed == "1" else Case.confirmed_at.is_(None))
    if source := request.args.get("source"):
        query = query.filter(Case.actual_source.is_(None) if source == "none" else Case.actual_source == source)
    for key, column in (("actual", Case.actual_result),
                        ("claim_kind", Case.claim["kind"].as_string()),
                        ("claim_expected", Case.claim["expected"].as_string())):
        if value := request.args.get(key):
            query = query.filter(column.is_(None) if value == "none" else column == value)
    if search:
        # LIKE 특수문자는 문자 그대로 찾는다. IP 검색은 flow의 src/dst만 대상이다.
        pattern = "%" + search.replace("/", "//").replace("%", "/%").replace("_", "/_") + "%"
        query = query.join(Case.owner).filter(or_(
            Case.title.ilike(pattern, escape="/"), User.nickname.ilike(pattern, escape="/"),
            Case.flow["src"].as_string().ilike(pattern, escape="/"),
            Case.flow["dst"].as_string().ilike(pattern, escape="/"),
        ))
    total = query.count() if paged else None
    query = query.options(contains_eager(Case.owner) if search else joinedload(Case.owner))
    query = query.order_by(Case.created_at.desc(), Case.id.desc())
    if not paged:
        return jsonify([case.summary() for case in query.limit(200)])
    page, per_page = numbers["page"], numbers["per_page"]
    pages = max(1, (total + per_page - 1) // per_page)
    page = min(page, pages)  # 삭제 등으로 마지막 페이지가 사라졌으면 유효한 마지막 페이지를 반환한다.
    items = [case.summary() for case in query.offset((page - 1) * per_page).limit(per_page)]
    return jsonify(items=items, total=total, page=page, per_page=per_page, pages=pages)


@bp.post("/cases")
@login_required
def create_case():
    data = _body()
    title = str(data.get("title") or "").strip()
    if not 1 <= len(title) <= 80:
        return error(400, "제목은 1~80자여야 합니다")
    network, flow = data.get("network"), data.get("flow")
    if not isinstance(network, dict) or not isinstance(flow, dict):
        return error(400, "network와 flow가 필요합니다")
    if problem := _limit_problem(network):
        return error(422, problem)
    claim = _clean_claim(data.get("claim"))
    # 화면이 보낸 판정은 받지 않는다. 저장되는 판정은 언제나 서버가 계산한 값이다.
    verdict, comparison = _judge(network, flow, claim)
    case = Case(
        owner_id=current_user().id, title=title, network=network, flow=flow, claim=claim,
        verdict=verdict, result=verdict["result"], comparison=comparison, engine_version=ENGINE_VERSION,
    )
    db.session.add(case)
    db.session.commit()
    return jsonify(case.detail()), 201


@bp.get("/cases/<int:case_id>")
@login_required
def get_case(case_id: int):
    case = db.session.get(Case, case_id)
    if case is None:
        return error(404, "없는 사례입니다")
    return jsonify(case.detail())


@bp.patch("/cases/<int:case_id>")
@login_required
def update_case(case_id: int):
    case, failure = _owned(case_id)
    if failure:
        return failure
    data = _body()
    changed_truth = False
    if "title" in data:
        title = str(data.get("title") or "").strip()
        if not 1 <= len(title) <= 80:
            return error(400, "제목은 1~80자여야 합니다")
        case.title = title
    if "actual" in data:
        actual = data.get("actual") if isinstance(data.get("actual"), dict) else {}
        result = actual.get("result")
        source = actual.get("source")
        if result not in (*ACTUAL_RESULTS, None) or source not in (*ACTUAL_SOURCES, None):
            return error(400, "실제 결과는 PASS·DENY·미정, 출처는 nmap·ping·device·other 중 하나여야 합니다")
        note = str(actual.get("note") or "")[:1000]
        if (result, source, note) != (case.actual_result, case.actual_source, case.actual_note or ""):
            case.actual_result, case.actual_source, case.actual_note = result, source, note
            changed_truth = True
    if any(key in data for key in ("network", "flow", "claim")):
        network = data.get("network", case.network)
        flow = data.get("flow", case.flow)
        if not isinstance(network, dict) or not isinstance(flow, dict):
            return error(400, "network와 flow는 객체여야 합니다")
        if problem := _limit_problem(network):
            return error(422, problem)
        claim = _clean_claim(data.get("claim", case.claim))
        verdict, comparison = _judge(network, flow, claim)
        case.network, case.flow, case.claim = network, flow, claim
        case.verdict, case.result, case.comparison, case.engine_version = verdict, verdict["result"], comparison, ENGINE_VERSION
        changed_truth = True
    if changed_truth:
        case.clear_confirmation()  # 확인한 뒤 내용이 바뀌면 다시 확인받아야 한다
    case.updated_at = utcnow()
    db.session.commit()
    return jsonify(case.detail())


@bp.delete("/cases/<int:case_id>")
@login_required
def delete_case(case_id: int):
    case = db.session.get(Case, case_id)
    if case is None:
        return error(404, "없는 사례입니다")
    user = current_user()
    if case.owner_id != user.id and not user.is_reviewer:
        return error(403, "자기 사례만 지울 수 있습니다", reason="not_owner")
    db.session.delete(case)
    db.session.commit()
    return jsonify({"ok": True})


@bp.post("/cases/<int:case_id>/confirm")
@reviewer_required
def confirm_case(case_id: int):
    case = db.session.get(Case, case_id)
    if case is None:
        return error(404, "없는 사례입니다")
    if case.actual_result not in ACTUAL_RESULTS or not case.actual_source:
        return error(400, "실제 결과와 출처가 적힌 사례만 확인할 수 있습니다")
    case.confirmed_by, case.confirmed_at = current_user().id, utcnow()
    db.session.commit()
    return jsonify(case.detail())


@bp.delete("/cases/<int:case_id>/confirm")
@reviewer_required
def unconfirm_case(case_id: int):
    case = db.session.get(Case, case_id)
    if case is None:
        return error(404, "없는 사례입니다")
    case.clear_confirmation()
    db.session.commit()
    return jsonify(case.detail())


@bp.get("/cases/<int:case_id>/export")
@reviewer_required
def export_case(case_id: int):
    """확인된 사례를 cases/ 폴더 형식으로 내보낸다. 기준 사례 테스트에 그대로 넣을 수 있다."""
    case = db.session.get(Case, case_id)
    if case is None:
        return error(404, "없는 사례입니다")
    if case.confirmed_at is None:
        return error(400, "확인된 사례만 내보낼 수 있습니다")
    decisive = case.verdict.get("decisive") or {}
    expect = {"result": case.actual_result}
    if case.actual_result == case.result == "DENY" and decisive:
        expect.update(device=decisive.get("device"), step=decisive.get("step"), rule_seq=decisive.get("rule_seq"))
    return jsonify({
        "id": f"field-{case.id:03d}",
        "title": case.title,
        "source": f"동기 사례(작성자 익명). 실제 결과 출처: {case.actual_source} — {case.actual_note or ''}".strip(),
        "network": case.network,
        "flow": case.flow,
        "claim": case.claim,
        "expect": expect,
    })


@bp.get("/dashboard")
@reviewer_required
def dashboard():
    # 저장된 값만 집계한다. 네트워크/판정 JSON을 읽거나 판정을 재계산하지 않는다.
    kind = Case.claim["kind"].as_string()
    expected = Case.claim["expected"].as_string()
    # 알 수 없는 값은 미정으로 묶어 집계 행 수도 유한하게 유지한다.
    columns = (
        sql_case((kind.in_(CLAIM_KINDS), kind), else_=None),
        sql_case((expected.in_(ACTUAL_RESULTS), expected), else_=None),
        sql_case((Case.result.in_((*ACTUAL_RESULTS, "UNSUPPORTED", "INVALID")), Case.result), else_=None),
        sql_case((Case.actual_result.in_(ACTUAL_RESULTS), Case.actual_result), else_=None),
        Case.confirmed_at.is_not(None),
    )
    groups = Case.query.with_entities(*columns, func.count(Case.id)).group_by(*columns).all()
    axes = [{"axis": axis, "tp": 0, "fp": 0, "fn": 0, "tn": 0, "total": 0,
             "excluded": {"not_confirmed": 0, "no_actual": 0, "no_prediction": 0}}
            for axis in ("ai", "self", "engine")]
    board = dict.fromkeys(("total", "confirmed", "unsupported", "invalid"), 0)
    cells = {("DENY", "DENY"): "tp", ("DENY", "PASS"): "fp",
             ("PASS", "DENY"): "fn", ("PASS", "PASS"): "tn"}
    for claim_kind, claim_expected, result, actual, confirmed, count in groups:
        board["total"] += count
        board["confirmed"] += count if confirmed else 0
        if result in ("UNSUPPORTED", "INVALID"):
            board[result.lower()] += count
        for axis in axes:
            predicted = result if axis["axis"] == "engine" else claim_expected if claim_kind == axis["axis"] else None
            excluded = "not_confirmed" if not confirmed else "no_actual" if actual not in ACTUAL_RESULTS else "no_prediction" if predicted not in ACTUAL_RESULTS else None
            if excluded:
                axis["excluded"][excluded] += count
            else:
                axis[cells[(predicted, actual)]] += count
                axis["total"] += count
    ai, _, engine = axes
    mismatches = Case.query.filter(
        Case.confirmed_at.is_not(None), Case.result.in_(ACTUAL_RESULTS),
        Case.actual_result.in_(ACTUAL_RESULTS), Case.result != Case.actual_result,
    ).options(joinedload(Case.owner)).order_by(Case.created_at.desc(), Case.id.desc()).limit(20).all()
    return jsonify({**board, "confirmed_in_scope": engine["total"], "agree": engine["tp"] + engine["tn"],
                    "ai_confirmed": ai["total"], "ai_wrong": ai["fp"] + ai["fn"],
                    "mismatches_total": engine["fp"] + engine["fn"],
                    "mismatches": [c.summary() for c in mismatches],
                    "confusion": {"positive": "DENY", "axes": axes}})
