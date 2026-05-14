"""
Compute Node Server
- MasterNode로부터 분할 영상 정보를 받음
- OriginAPI로 골 시점을 분석함
- 분할 영상 기준 시간을 원본 영상 기준 시간으로 보정해 반환함
"""

import httpx
from fastapi import FastAPI
from pydantic import BaseModel, Field, ValidationError

from config import settings


RESULT_NAMES = {
    1: "OneResult",
    2: "TwoResult",
    3: "ThreeResult",
}


class ComputeNodeError(Exception):
    pass


class ComputeAnalysisRequest(BaseModel):
    nodeIndex: int = Field(..., ge=1, le=3, description="컴퓨트 노드 번호")
    videoName: str = Field(..., min_length=1, description="OneVideo/TwoVideo/ThreeVideo")
    videoUrl: str = Field(..., min_length=1, description="MasterNode가 제공한 분할 영상 URL")
    startOffsetSec: float = Field(..., ge=0, description="원본 영상 기준 세그먼트 시작 초")
    originVideoId: str = Field(..., min_length=1, description="원본 영상 ID")


class OriginGoal(BaseModel):
    timeSec: float = Field(..., ge=0, description="분할 영상 내부 기준 골 발생 초")
    label: str = Field("goal", description="이벤트 라벨")
    confidence: float = Field(1.0, ge=0.0, le=1.0, description="AI 신뢰도")
    description: str | None = Field(None, description="추가 설명")


class OriginAPIResponse(BaseModel):
    goals: list[OriginGoal] = Field(default_factory=list)


class GoalDetection(BaseModel):
    localTimeSec: float
    globalTimeSec: float
    timeString: str
    label: str = "goal"
    confidence: float = Field(1.0, ge=0.0, le=1.0)
    description: str | None = None


class ComputeAnalysisResponse(BaseModel):
    nodeIndex: int
    resultName: str
    originVideoId: str
    status: str
    goals: list[GoalDetection] = Field(default_factory=list)
    error: str | None = None


app = FastAPI(
    title="Video Highlight Compute Node",
    description="분할 영상에서 골 시점을 추출하고 원본 영상 기준 시간으로 보정하는 컴퓨트 노드",
    version="1.0.0",
)


@app.post("/analyze", response_model=ComputeAnalysisResponse, summary="분할 영상 분석")
async def analyze_video(request: ComputeAnalysisRequest):
    try:
        video_bytes = await download_video(request.videoUrl)
        origin_goals = await call_origin_api(video_bytes, request.videoName)
        goals = [
            build_goal_detection(goal, request.startOffsetSec)
            for goal in origin_goals
        ]
        return ComputeAnalysisResponse(
            nodeIndex=request.nodeIndex,
            resultName=get_result_name(request.nodeIndex),
            originVideoId=request.originVideoId,
            status="success",
            goals=goals,
        )
    except ComputeNodeError as error:
        failed = ComputeAnalysisResponse(
            nodeIndex=request.nodeIndex,
            resultName=get_result_name(request.nodeIndex),
            originVideoId=request.originVideoId,
            status="failed",
            error=str(error),
        )
        return failed


def get_result_name(node_index: int) -> str:
    return RESULT_NAMES[node_index]


def build_goal_detection(goal: OriginGoal, start_offset_sec: float) -> GoalDetection:
    global_time_sec = start_offset_sec + goal.timeSec
    return GoalDetection(
        localTimeSec=goal.timeSec,
        globalTimeSec=global_time_sec,
        timeString=format_time_string(global_time_sec),
        label=goal.label,
        confidence=goal.confidence,
        description=goal.description,
    )


def format_time_string(total_seconds: float) -> str:
    seconds = round(total_seconds)
    hours, remainder = divmod(seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    return f"{minutes:02d}:{seconds:02d}"


async def download_video(video_url: str) -> bytes:
    try:
        async with httpx.AsyncClient(timeout=settings.VIDEO_DOWNLOAD_TIMEOUT) as client:
            response = await client.get(video_url)
            response.raise_for_status()
            return response.content
    except httpx.HTTPStatusError as error:
        raise ComputeNodeError(f"분할 영상 다운로드 HTTP 오류: {error.response.status_code}") from error
    except httpx.RequestError as error:
        raise ComputeNodeError(f"분할 영상 다운로드 실패: {error}") from error


async def call_origin_api(video_bytes: bytes, video_name: str) -> list[OriginGoal]:
    try:
        async with httpx.AsyncClient(timeout=settings.ORIGIN_API_TIMEOUT) as client:
            response = await client.post(
                settings.ORIGIN_API_URL,
                files={"file": (video_name, video_bytes, "application/octet-stream")},
                data={"videoName": video_name},
            )
            response.raise_for_status()
            payload = response.json()
    except httpx.HTTPStatusError as error:
        raise ComputeNodeError(f"OriginAPI HTTP 오류: {error.response.status_code}") from error
    except httpx.RequestError as error:
        raise ComputeNodeError(f"OriginAPI 연결 실패: {error}") from error
    except ValueError as error:
        raise ComputeNodeError("OriginAPI 응답이 JSON 형식이 아닙니다.") from error

    return parse_origin_goals(payload)


def parse_origin_goals(payload: object) -> list[OriginGoal]:
    if not isinstance(payload, dict) or "goals" not in payload:
        raise ComputeNodeError("OriginAPI 응답 형식 오류: goals 필드가 필요합니다.")

    try:
        return OriginAPIResponse.model_validate({"goals": payload["goals"]}).goals
    except ValidationError as error:
        raise ComputeNodeError(f"OriginAPI 응답 형식 오류: {error}") from error
