"""NetProof 판정 엔진. 최종 PASS/DENY는 이 패키지의 결정적 계산만 정한다(ADR-001)."""

from .verify import compare, verify

__version__ = "0.1.1"
__all__ = ["compare", "verify", "__version__"]
