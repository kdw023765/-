"""
데이터 모델 정의
"""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    PENDING    = "pending"      # 접수됨
    PROCESSING = "processing"   # MasterNode 처리 중
    DONE       = "done"         # 완료
    FAILED     = "failed"       # 실패


class GoalEvent(BaseModel):
    """하이라이트 단일 이벤트 (예: 골)"""
    timestamp_minutes: float = Field(..., description="영상 전체 기준 골 발생 시각 (분)")
    timestamp_str: str       = Field(..., description="표시용 문자열 (예: '4분 18초')")
    segment_index: int       = Field(..., description="원래 분할된 세그먼트 번호 (0-based)")
    confidence: float        = Field(1.0, ge=0.0, le=1.0, description="AI 신뢰도")
    description: Optional[str] = Field(None, description="추가 설명")


class HighlightResult(BaseModel):
    """MasterNode가 병합 후 전송하는 최종 결과"""
    job_id: str
    total_duration_minutes: float = Field(..., description="원본 영상 전체 길이 (분)")
    highlights: list[GoalEvent]  = Field(default_factory=list)
    segment_count: int           = Field(3, description="분할된 세그먼트 수")


class JobResponse(BaseModel):
    """FrontWeb에 반환하는 Job 상태 응답"""
    job_id: str
    status: JobStatus
    message: Optional[str] = None
    result: Optional[HighlightResult] = None
    error: Optional[str] = None
    video_url: Optional[str] = None
