"""사용자·세션·사례. 판정 결과는 저장할 때 서버가 다시 계산한 값만 들어간다."""

from __future__ import annotations

from datetime import datetime, timezone

from flask_sqlalchemy import SQLAlchemy
from netproof_engine import cause

db = SQLAlchemy()

ROLE_USER = "user"
ROLE_REVIEWER = "reviewer"
ROLE_NAMES = {ROLE_USER: "일반", ROLE_REVIEWER: "검토자"}


def utcnow() -> datetime:
    """DB에는 시간대 없는 UTC로 저장한다(SQLite·PostgreSQL 공통)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(value: datetime | None) -> str | None:
    return value.isoformat() + "Z" if value else None


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    nickname = db.Column(db.String(20), nullable=False)
    nickname_key = db.Column(db.String(20), unique=True, nullable=False)  # 대소문자 무시 중복 검사
    password_hash = db.Column(db.String(255), nullable=False)
    # 가입은 항상 일반. 검토자 지정은 서버 명령(flask make-reviewer)으로만 한다.
    role = db.Column(db.String(16), nullable=False, default=ROLE_USER)
    failed_logins = db.Column(db.Integer, nullable=False, default=0)
    locked_until = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    @property
    def is_reviewer(self) -> bool:
        return self.role == ROLE_REVIEWER

    def public(self) -> dict:
        return {"id": self.id, "nickname": self.nickname, "role": self.role, "role_name": ROLE_NAMES[self.role]}


class Session(db.Model):
    """서버 세션. 쿠키에는 무작위 토큰만, DB에는 그 해시만 둔다. 로그아웃하면 행을 지워 즉시 무효가 된다."""

    __tablename__ = "sessions"
    id = db.Column(db.Integer, primary_key=True)
    token_hash = db.Column(db.String(64), unique=True, nullable=False)
    csrf_token = db.Column(db.String(64), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    user = db.relationship(User)


ACTUAL_RESULTS = ("PASS", "DENY")
ACTUAL_SOURCES = ("nmap", "ping", "device", "other")


class Case(db.Model):
    __tablename__ = "cases"
    __table_args__ = (
        db.Index("ix_cases_created_id", "created_at", "id"),
        db.Index("ix_cases_owner_created_id", "owner_id", "created_at", "id"),
        db.Index("ix_cases_result_created_id", "result", "created_at", "id"),
    )
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(80), nullable=False)
    network = db.Column(db.JSON, nullable=False)
    flow = db.Column(db.JSON, nullable=False)
    claim = db.Column(db.JSON)
    verdict = db.Column(db.JSON, nullable=False)
    result = db.Column(db.String(16), nullable=False)
    comparison = db.Column(db.String(16), nullable=False)
    engine_version = db.Column(db.String(16), nullable=False)
    # 실제 결과는 작성자가 적는다. 확인 표시는 검토자만 한다. 둘 중 하나라도 바뀌면 확인은 풀린다.
    actual_result = db.Column(db.String(8))
    actual_source = db.Column(db.String(16))
    actual_note = db.Column(db.String(1000))
    confirmed_by = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"))
    confirmed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    owner = db.relationship(User, foreign_keys=[owner_id])
    confirmer = db.relationship(User, foreign_keys=[confirmed_by])

    @property
    def in_scope(self) -> bool:
        return self.result in ("PASS", "DENY")

    def clear_confirmation(self) -> None:
        self.confirmed_by = None
        self.confirmed_at = None

    def summary(self) -> dict:
        claim = self.claim or {}
        return {
            "id": self.id,
            "title": self.title,
            "author": self.owner.nickname,
            "result": self.result,
            "comparison": self.comparison,
            "claim_kind": claim.get("kind"),
            "actual_result": self.actual_result,
            "confirmed": self.confirmed_at is not None,
            "created_at": iso(self.created_at),
        }

    def detail(self) -> dict:
        return {
            **self.summary(),
            "owner_id": self.owner_id,
            "network": self.network,
            "flow": self.flow,
            "claim": self.claim,
            "verdict": self.verdict,
            "cause": cause(self.verdict),
            "engine_version": self.engine_version,
            "actual": {"result": self.actual_result, "source": self.actual_source, "note": self.actual_note or ""},
            "confirmed_by": self.confirmer.nickname if self.confirmer else None,
            "confirmed_at": iso(self.confirmed_at),
            "updated_at": iso(self.updated_at),
        }


def ensure_case_indexes() -> None:
    """create_all이 변경하지 않는 기존 표에도 목록 인덱스를 적용한다."""
    for index in Case.__table__.indexes:
        index.create(bind=db.engine, checkfirst=True)
