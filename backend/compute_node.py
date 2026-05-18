import tempfile

from fastapi import FastAPI, File, Form, UploadFile
from pydantic import BaseModel

from gemini_goal_detector import GeminiGoalDetector


RESULT_NAMES = {
    1: "OneResult",
    2: "TwoResult",
    3: "ThreeResult",
}


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
    stage: str
    goals: list[GoalDetection] = []
    error: str | None = None


app = FastAPI(title="Compute Node")


detector = GeminiGoalDetector()


@app.get("/health")
async def health_check():

    return {
        "status": "ok"
    }


@app.post("/analyze")
async def analyze_video(
    video: UploadFile = File(...),
    nodeIndex: int = Form(...),
    startOffsetSec: float = Form(...),
    originVideoId: str = Form(...)
):

    try:

        temp_path = await save_upload(video)

        detected_goals = await detector.detect_goals(
            temp_path
        )

        goals = []

        for goal in detected_goals:

            local_time = goal.get("timeSec", 0)

            global_time = (
                startOffsetSec +
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
            nodeIndex=nodeIndex,
            resultName=get_result_name(nodeIndex),
            originVideoId=originVideoId,
            status="success",
            stage="COMPLETED",
            goals=goals
        )

    except Exception as error:

        return ComputeAnalysisResponse(
            nodeIndex=nodeIndex,
            resultName=get_result_name(nodeIndex),
            originVideoId=originVideoId,
            status="failed",
            stage="FAILED",
            error=str(error)
        )


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


def get_result_name(node_index: int):
    return RESULT_NAMES[node_index]


def format_time(total_seconds: float):

    seconds = int(total_seconds)

    minutes = seconds // 60

    remain = seconds % 60

    return f"{minutes:02d}:{remain:02d}"
