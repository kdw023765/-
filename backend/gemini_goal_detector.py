import json
import os

import google.generativeai as genai


class GeminiGoalDetector:

    def __init__(self):

        api_key = os.getenv("GEMINI_API_KEY")

        genai.configure(api_key=api_key)

        self.model = genai.GenerativeModel(
            "gemini-1.5-pro"
        )

    async def detect_goals(self, video_path: str):

        uploaded_file = genai.upload_file(video_path)

        prompt = """
        이 영상은 축구 경기 영상이다.

        반드시 골 장면 발생 시간만 찾아라.

        응답은 반드시 아래 JSON 형식만 반환해라.

        {
            \"goals\": [
                {
                    \"timeSec\": 120
                }
            ]
        }

        설명 금지.
        markdown 금지.
        코드블럭 금지.
        """

        response = self.model.generate_content([
            uploaded_file,
            prompt
        ])

        text = response.text.strip()

        if text.startswith("```"):
            text = text.replace("```json", "")
            text = text.replace("```", "")

        parsed = json.loads(text)

        return parsed.get("goals", [])
