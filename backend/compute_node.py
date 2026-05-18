"""
Compute Node Server
- MasterNode로부터 분할 영상 정보를 받음
- Gemini Vision으로 골 시점을 분석함
- 분할 영상 기준 시간을 원본 영상 기준 시간으로 보정해 반환함
"""

import os
import tempfile

import httpx
from fastapi import FastAPI
from pydantic import BaseModel, Field

from gemini_goal_detector import GeminiGoalDetector


RESULT_NAMES = {
    1: "OneResult",
    2: "TwoResult",
    3: "ThreeResult",
}


class ComputeNodeError(Exception):
    pass


class ComputeAnalysisRequest(BaseModel):
    nodeIndex: int
    videoName: str
    videoUrl: str
    startOffsetSec: float
    originVideoId: str


class GoalDetection(BaseModel):
    localTimeSec: float
    globalTimeSec: float
    timeString: str
    label: str = "goal"


class ComputeAnalysisResponse(BaseModel):
    nodeIndex: int
    resultName: str
    originVideoId: str
    status: str
    goals: list[GoalDetection] = []
    error: str | None = None


app = FastAPI(title="Compute Node")


detector = GeminiGoalDetector()


@app.post("/analyze")
async def analyze_video(request: ComputeAnalysisRequest):

    try:

        video_bytes = await download_video(
            request.videoUrl
        )

        temp_path = save_temp_video(video_bytes)

        detected_goals = await detector.detect_goals(
            temp_path
        )

        goals = []

        for goal in detected_goals:

            local_time = goal.get("timeSec", 0)

            global_time = (
                request.startOffsetSec +
                local_time
            )

            goals.append(
                GoalDetection(
                    localTimeSec=local_time,
                    globalTimeSec=global_time,
                    timeString=format_time(global_time)
                )
            )

        return ComputeAnalysisResponse(
            nodeIndex=request.nodeIndex,
            resultName=get_result_name(request.nodeIndex),
            originVideoId=request.originVideoId,
            status="success",
            goals=goals
        )

    except Exception as error:

        return ComputeAnalysisResponse(
            nodeIndex=request.nodeIndex,
            resultName=get_result_name(request.nodeIndex),
            originVideoId=request.originVideoId,
            status="failed",
            error=str(error)
        )


async def download_video(video_url: str):

    async with httpx.AsyncClient(timeout=300) as client:

        response = await client.get(video_url)

        response.raise_for_status()

        return response.content


def save_temp_video(video_bytes: bytes):

    temp = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".mp4"
    )

    temp.write(video_bytes)

    temp.close()

    return temp.name


def get_result_name(node_index: int):
    return RESULT_NAMES[node_index]


def format_time(total_seconds: float):

    seconds = int(total_seconds)

    minutes = seconds // 60

    remain = seconds % 60

    return f"{minutes:02d}:{remain:02d}"
