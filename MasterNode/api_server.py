import json
import os
import subprocess
import tempfile

import httpx
from fastapi import FastAPI, File, Form, UploadFile
from pydantic import BaseModel

from main import MasterNode


app = FastAPI(title="MasterNode API")

master_node = MasterNode()


class GoalEvent(BaseModel):
    timestamp_minutes: float
    timestamp_str: str
    segment_index: int
    confidence: float = 1.0
    description: str | None = None


class HighlightResult(BaseModel):
    job_id: str
    total_duration_minutes: float
    highlights: list[GoalEvent]
    segment_count: int
    highlightVideo: str | None = None


@app.get("/health")
async def health_check():

    return {
        "status": "ok"
    }


@app.post("/process")
async def process_video(
    file: UploadFile = File(...),
    job_id: str = Form(...),
    callback_url: str = Form(...)
):

    temp_path = await save_upload(file)

    options = {
        "TimeLine": True,
        "HANDLE": True,
        "TimeString": True
    }

    result = await master_node.process(
        temp_path,
        options
    )

    highlights = []

    for index, goal in enumerate(result.get("ALLResult", [])):

        total_minutes = (
            goal.get("globalTimeSec", 0) / 60
        )

        highlights.append({
            "timestamp_minutes": total_minutes,
            "timestamp_str": goal.get("timeString", "00:00"),
            "segment_index": index,
            "confidence": 1.0,
            "description": "goal"
        })

    payload = HighlightResult(
        job_id=job_id,
        total_duration_minutes=get_video_duration_minutes(temp_path),
        highlights=highlights,
        segment_count=3,
        highlightVideo=result.get("highlightVideo")
    )

    async with httpx.AsyncClient(timeout=300) as client:

        await client.post(
            callback_url,
            json=payload.model_dump()
        )

    return {
        "status": "completed",
        "job_id": job_id
    }


async def save_upload(video: UploadFile):

    temp = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".mp4"
    )

    while True:

        chunk = await video.read(1024 * 1024)

        if not chunk:
            break

        temp.write(chunk)

    temp.close()

    return temp.name


def get_video_duration_minutes(video_path: str) -> float:

    try:
        completed = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "json",
                video_path
            ],
            capture_output=True,
            text=True,
            check=True
        )

        metadata = json.loads(completed.stdout)
        duration_sec = float(metadata["format"]["duration"])

        return duration_sec / 60

    except Exception as error:
        print("영상 길이 조회 실패:", error)
        return 0
