from fastapi import HTTPException

class HakikaHTTPException(HTTPException):
    def __init__(self, status_code: int, detail: str, code: str = "HTTP_ERROR"):
        super().__init__(status_code=status_code, detail=detail)
        self.code = code
