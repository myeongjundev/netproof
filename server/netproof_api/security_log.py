"""Opt-in, message-only security records. Never accept credentials as fields."""
import json
import logging
from logging.handlers import SysLogHandler
from datetime import datetime, timezone
from pathlib import Path
import re

LOGGER = logging.getLogger("netproof.security")
FIELDS = {"reason", "via", "nickname", "user_id", "src_ip", "failed_count", "locked_until"}


def configure(app):
    address = app.config.get("SECURITY_SYSLOG")
    if address:
        match = re.fullmatch(r"([^\s:]+):([0-9]{1,5})", address)
        if not match or not 1 <= int(match[2]) <= 65535:
            raise ValueError("NETPROOF_SYSLOG는 호스트:포트(1~65535) 형식이어야 합니다")
        address = (match[1], int(match[2]))
    for handler in LOGGER.handlers[:]:
        LOGGER.removeHandler(handler)
        handler.close()
    LOGGER.propagate = False
    LOGGER.setLevel(logging.INFO)
    if path := app.config.get("SECURITY_LOG"):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        LOGGER.addHandler(logging.FileHandler(path, encoding="utf-8"))
    if address:
        handler = SysLogHandler(address=address, facility=SysLogHandler.LOG_AUTH)
        handler.append_nul = False
        LOGGER.addHandler(handler)
    if not LOGGER.handlers:
        LOGGER.addHandler(logging.NullHandler())
    for handler in LOGGER.handlers:
        handler.setFormatter(logging.Formatter("%(message)s"))


def event(name, level, **fields):
    if not LOGGER.handlers or all(isinstance(h, logging.NullHandler) for h in LOGGER.handlers):
        return
    record = {"app": "netproof", "event": name}
    for key, value in fields.items():
        if key not in FIELDS or value is None:
            continue
        if fields.get("reason") == "unknown_user" and key in {"nickname", "user_id"}:
            continue
        if isinstance(value, datetime):
            value = value.strftime("%Y-%m-%dT%H:%M:%SZ")
        record[key] = value
    record["time"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    LOGGER.log(level, json.dumps(record, ensure_ascii=False, separators=(",", ":")))
