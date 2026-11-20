class AppError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        detail: str,
        *,
        user_id: int | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code.strip().upper()
        self.detail = detail
        self.user_id = user_id
        super().__init__(detail)
