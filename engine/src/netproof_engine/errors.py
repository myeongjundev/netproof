"""판정을 멈추는 두 가지 이유. 둘 다 추측 대신 멈춘다는 뜻이다."""


class Unsupported(Exception):
    """판정에 필요한 요소가 지원 범위 밖이다(docs/semantics.md 1절)."""


class Invalid(Exception):
    """입력 자체가 성립하지 않는다. 문제를 모두 모아 한 번에 돌려준다."""

    def __init__(self, problems: list[str]):
        super().__init__("; ".join(problems))
        self.problems = problems
