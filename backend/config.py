"""
환경 설정 (환경변수 또는 기본값 사용)
"""
import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    # 이 서버 자신의 주소 (MasterNode가 결과를 콜백할 때 사용)
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")

    # MasterNode 주소
    MASTER_NODE_URL: str = os.getenv("MASTER_NODE_URL", "http://localhost:9000")

    # MasterNode 요청 타임아웃 (초) - 대용량 영상 고려해 길게 설정
    MASTER_TIMEOUT: float = float(os.getenv("MASTER_TIMEOUT", "300"))

    # ComputeNode가 기존 AI API(OriginAPI)를 호출할 주소
    ORIGIN_API_URL: str = os.getenv("ORIGIN_API_URL", "http://localhost:7000/analyze")

    # ComputeNode 외부 요청 타임아웃 (초)
    ORIGIN_API_TIMEOUT: float = float(os.getenv("ORIGIN_API_TIMEOUT", "300"))
    VIDEO_DOWNLOAD_TIMEOUT: float = float(os.getenv("VIDEO_DOWNLOAD_TIMEOUT", "300"))

    # CORS 허용 오리진
    ALLOWED_ORIGINS: list[str] = field(
        default_factory=lambda: os.getenv(
            "ALLOWED_ORIGINS", "http://localhost:3000"
        ).split(",")
    )


settings = Settings()
