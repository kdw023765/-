import unittest
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent))

import compute_node


class ComputeNodeTests(unittest.TestCase):
    def test_format_time_string_uses_origin_video_time(self):
        self.assertEqual(compute_node.format_time_string(260), "04:20")
        self.assertEqual(compute_node.format_time_string(3661), "01:01:01")

    def test_build_goal_detection_offsets_local_time(self):
        goal = compute_node.OriginGoal(timeSec=60, confidence=0.82, description="score")

        result = compute_node.build_goal_detection(goal, start_offset_sec=200)

        self.assertEqual(result.localTimeSec, 60)
        self.assertEqual(result.globalTimeSec, 260)
        self.assertEqual(result.timeString, "04:20")
        self.assertEqual(result.label, "goal")
        self.assertEqual(result.confidence, 0.82)
        self.assertEqual(result.description, "score")

    def test_analyze_endpoint_returns_node_result(self):
        async def fake_download_video(_video_url: str) -> bytes:
            self.assertEqual(_video_url, "http://master-node/videos/two.mp4")
            return b"segment-video"

        async def fake_call_origin_api(video_bytes: bytes, video_name: str):
            self.assertEqual(video_bytes, b"segment-video")
            self.assertEqual(video_name, "TwoVideo")
            return [compute_node.OriginGoal(timeSec=60, confidence=0.91)]

        original_download_video = compute_node.download_video
        original_call_origin_api = compute_node.call_origin_api
        compute_node.download_video = fake_download_video
        compute_node.call_origin_api = fake_call_origin_api
        try:
            client = TestClient(compute_node.app)
            response = client.post(
                "/analyze",
                json={
                    "nodeIndex": 2,
                    "videoName": "TwoVideo",
                    "videoUrl": "http://master-node/videos/two.mp4",
                    "startOffsetSec": 200,
                    "originVideoId": "OriginVideo_001",
                },
            )
        finally:
            compute_node.download_video = original_download_video
            compute_node.call_origin_api = original_call_origin_api

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "nodeIndex": 2,
                "resultName": "TwoResult",
                "originVideoId": "OriginVideo_001",
                "status": "success",
                "goals": [
                    {
                        "localTimeSec": 60.0,
                        "globalTimeSec": 260.0,
                        "timeString": "04:20",
                        "label": "goal",
                        "confidence": 0.91,
                        "description": None,
                    }
                ],
                "error": None,
            },
        )

    def test_analyze_endpoint_returns_failed_body_when_processing_fails(self):
        async def fake_download_video(_video_url: str) -> bytes:
            raise compute_node.ComputeNodeError("AI API 호출 실패")

        original_download_video = compute_node.download_video
        compute_node.download_video = fake_download_video
        try:
            client = TestClient(compute_node.app)
            response = client.post(
                "/analyze",
                json={
                    "nodeIndex": 2,
                    "videoName": "TwoVideo",
                    "videoUrl": "http://master-node/videos/two.mp4",
                    "startOffsetSec": 200,
                    "originVideoId": "OriginVideo_001",
                },
            )
        finally:
            compute_node.download_video = original_download_video

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "nodeIndex": 2,
                "resultName": "TwoResult",
                "originVideoId": "OriginVideo_001",
                "status": "failed",
                "goals": [],
                "error": "AI API 호출 실패",
            },
        )

    def test_parse_origin_goals_accepts_goal_list_response(self):
        goals = compute_node.parse_origin_goals(
            {"goals": [{"timeSec": 60, "confidence": 0.91}]}
        )

        self.assertEqual(len(goals), 1)
        self.assertEqual(goals[0].timeSec, 60)
        self.assertEqual(goals[0].confidence, 0.91)

    def test_parse_origin_goals_rejects_unknown_response_shape(self):
        with self.assertRaisesRegex(compute_node.ComputeNodeError, "OriginAPI 응답 형식 오류"):
            _ = compute_node.parse_origin_goals({"result": []})


if __name__ == "__main__":
    _ = unittest.main()
