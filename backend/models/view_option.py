from pydantic import BaseModel
from typing import List


class ViewOptionRequest(BaseModel):
    timeline: bool = False
    handle: bool = False
    labels: bool = False


class GoalMoment(BaseModel):
    globalTimeSec: int
    minuteText: str


class AnalysisResult(BaseModel):
    options: ViewOptionRequest
    goals: List[GoalMoment]
