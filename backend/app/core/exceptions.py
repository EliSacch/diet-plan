class AppError(Exception):
    def __init__(self, status_code: int, code: str, detail: str) -> None:
        self.status_code = status_code
        self.code = code.strip().upper()
        self.detail = detail
        super().__init__(detail)
