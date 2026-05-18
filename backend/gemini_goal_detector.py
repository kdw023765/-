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
        축구 경기 영상이다.

        골 장면 발생 시간만 초(second) 단위 JSON으로 반환해라.

        예시:
        {
            \"goals\": [
                {
                    \"timeSec\": 120
                }
            ]
        }
        """

        response = self.model.generate_content([
            uploaded_file,
            prompt
        ])

        text = response.text.strip()

        text = text.replace("```json", "")
        text = text.replace("```", "")

        try:

            parsed = json.loads(text)

            return parsed.get("goals", [])

        except Exception:
            return []
